-- ============================================================================
-- 013_v4_security_habits_vault_squads.sql
-- Additive v4 Migration:
-- 1. Security hardening for award_gold_atomic, rpg_inventory, multiplayer_matches
-- 2. Idempotent server-authoritative reward RPC (claim_verified_reward)
-- 3. Server-authoritative Relic unlock RPC (unlock_rpg_relic)
-- 4. Habit Forge tables (habits, habit_logs)
-- 5. Knowledge Vault SM-2 tables (learning_paths, flashcards)
-- 6. Deep Work 2.0 table (focus_sessions)
-- 7. Squad Missions & Notification Preferences
-- ============================================================================

-- 1A. Add idempotency index on gold_transactions to prevent replay attacks
CREATE UNIQUE INDEX IF NOT EXISTS idx_gold_tx_user_ref_unique
  ON public.gold_transactions (user_id, reference_id)
  WHERE reference_id IS NOT NULL;

-- 1B. Lock down legacy award_gold_atomic so clients cannot mint arbitrary gold
REVOKE ALL ON FUNCTION public.award_gold_atomic(integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.award_gold_atomic(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.award_gold_atomic(integer, text) FROM authenticated;

CREATE OR REPLACE FUNCTION public.award_gold_atomic(p_delta integer, p_reason text DEFAULT 'Deprecate_Direct_Call')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'success', false,
    'reason', 'direct_gold_mutation_disabled_use_claim_verified_reward'
  );
END;
$$;

-- 1C. Server-Authoritative Idempotent Reward RPC
CREATE OR REPLACE FUNCTION public.claim_verified_reward(
  p_event_type text,
  p_reference_id text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_gold integer := 0;
  v_xp integer := 0;
  v_minutes integer := 0;
  v_daily_count integer := 0;
  v_profile record;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  IF p_reference_id IS NULL OR length(trim(p_reference_id)) < 4 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_reference_id');
  END IF;

  -- Check replay / duplicate submission
  IF EXISTS (
    SELECT 1 FROM public.gold_transactions
    WHERE user_id = v_uid AND reference_id = p_reference_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'duplicate_reference');
  END IF;

  -- Daily rate-limit check per event type
  SELECT count(*) INTO v_daily_count
  FROM public.gold_transactions
  WHERE user_id = v_uid
    AND reason LIKE (p_event_type || ':%')
    AND created_at >= date_trunc('day', now());

  CASE p_event_type
    WHEN 'daily_trifecta' THEN
      IF v_daily_count >= 1 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 150;
      v_xp := 75;

    WHEN 'focus_session' THEN
      IF v_daily_count >= 12 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_minutes := LEAST(120, GREATEST(1, COALESCE((p_metadata->>'minutes')::integer, 15)));
      v_gold := LEAST(250, v_minutes * 2 + 15);
      v_xp := LEAST(200, v_minutes * 2);

    WHEN 'micro_start' THEN
      IF v_daily_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 15;
      v_xp := 10;

    WHEN 'cbt_reframe' THEN
      IF v_daily_count >= 3 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 20;
      v_xp := 15;

    WHEN 'habit_checkin' THEN
      IF v_daily_count >= 15 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 20;
      v_xp := 25;

    WHEN 'flashcard_review' THEN
      IF v_daily_count >= 20 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 15;
      v_xp := 20;

    WHEN 'boss_raid_clear' THEN
      IF v_daily_count >= 1 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'daily_limit_reached');
      END IF;
      v_gold := 400;
      v_xp := 150;

    ELSE
      RETURN jsonb_build_object('success', false, 'reason', 'unknown_event_type');
  END CASE;

  UPDATE public.profiles
  SET
    coins = COALESCE(coins, 0) + v_gold,
    xp = COALESCE(xp, 0) + v_xp,
    total_xp = COALESCE(total_xp, 0) + v_xp
  WHERE id = v_uid
  RETURNING * INTO v_profile;

  INSERT INTO public.gold_transactions (user_id, amount, transaction_type, reason, reference_id)
  VALUES (v_uid, v_gold, 'earn', p_event_type || ':' || COALESCE(p_metadata->>'label', 'verified'), p_reference_id);

  RETURN jsonb_build_object(
    'success', true,
    'gold_awarded', v_gold,
    'xp_awarded', v_xp,
    'coins', v_profile.coins,
    'xp', v_profile.xp
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_verified_reward(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_verified_reward(text, text, jsonb) TO authenticated;

-- 1D. Harden rpg_inventory RLS (Select-only for clients; mutations via SECURITY DEFINER RPC)
DROP POLICY IF EXISTS "Users manage own rpg_inventory" ON public.rpg_inventory;
DROP POLICY IF EXISTS "Users read own rpg_inventory" ON public.rpg_inventory;
CREATE POLICY "Users read own rpg_inventory" ON public.rpg_inventory
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.unlock_rpg_relic(p_relic_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cost integer;
  v_coins integer;
  v_relics jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  v_cost := CASE p_relic_id
    WHEN 'chrono_lens' THEN 600
    WHEN 'neon_crown' THEN 900
    WHEN 'synapse_core' THEN 1200
    WHEN 'phoenix_crest' THEN 1500
    ELSE NULL
  END;

  IF v_cost IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_relic');
  END IF;

  SELECT coins INTO v_coins FROM public.profiles WHERE id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'profile_not_found');
  END IF;

  INSERT INTO public.rpg_inventory (user_id, unlocked_relics)
  VALUES (v_uid, '[]'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT unlocked_relics INTO v_relics FROM public.rpg_inventory WHERE user_id = v_uid FOR UPDATE;
  IF v_relics @> to_jsonb(p_relic_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_unlocked');
  END IF;

  IF v_coins < v_cost THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_funds');
  END IF;

  UPDATE public.profiles SET coins = coins - v_cost WHERE id = v_uid;
  UPDATE public.rpg_inventory
  SET unlocked_relics = v_relics || to_jsonb(p_relic_id), updated_at = now()
  WHERE user_id = v_uid;

  INSERT INTO public.gold_transactions (user_id, amount, transaction_type, reason, reference_id)
  VALUES (v_uid, -v_cost, 'spend', 'unlock_relic:' || p_relic_id, 'relic_' || p_relic_id);

  RETURN jsonb_build_object('success', true, 'remaining_coins', v_coins - v_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.unlock_rpg_relic(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unlock_rpg_relic(text) TO authenticated;

-- 1E. Harden multiplayer_matches RLS
DROP POLICY IF EXISTS "Authenticated users can view and play matches" ON public.multiplayer_matches;
DROP POLICY IF EXISTS "Multiplayer viewable by authenticated" ON public.multiplayer_matches;
DROP POLICY IF EXISTS "Multiplayer insert by host" ON public.multiplayer_matches;
DROP POLICY IF EXISTS "Multiplayer update by participants" ON public.multiplayer_matches;

CREATE POLICY "Multiplayer viewable by authenticated" ON public.multiplayer_matches
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Multiplayer insert by host" ON public.multiplayer_matches
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Multiplayer update by participants" ON public.multiplayer_matches
  FOR UPDATE TO authenticated USING (auth.uid() = host_id OR auth.uid() = guest_id OR guest_id IS NULL);

-- ============================================================================
-- 2. HABIT FORGE TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Focus',
  frequency text NOT NULL DEFAULT 'daily', -- daily | weekly | custom
  target_days_per_week integer NOT NULL DEFAULT 7 CHECK (target_days_per_week BETWEEN 1 AND 7),
  difficulty text NOT NULL DEFAULT 'medium', -- easy | medium | hard
  routine_slot text NOT NULL DEFAULT 'anytime', -- morning | evening | anytime
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.habit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'recovery')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_habits_user ON public.habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs(user_id, log_date);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own habits" ON public.habits;
CREATE POLICY "Users manage own habits" ON public.habits
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own habit_logs" ON public.habit_logs;
CREATE POLICY "Users manage own habit_logs" ON public.habit_logs
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 3. KNOWLEDGE VAULT (SM-2 SPACED REPETITION) TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  subject text NOT NULL DEFAULT 'Computer Science',
  description text DEFAULT '',
  milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_id uuid REFERENCES public.learning_paths(id) ON DELETE SET NULL,
  deck text NOT NULL DEFAULT 'General',
  front text NOT NULL,
  back text NOT NULL,
  interval_days integer NOT NULL DEFAULT 1,
  repetition integer NOT NULL DEFAULT 0,
  easiness numeric(4,2) NOT NULL DEFAULT 2.50,
  next_review_date date NOT NULL DEFAULT current_date,
  last_reviewed_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_due ON public.flashcards(user_id, next_review_date);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own learning_paths" ON public.learning_paths;
CREATE POLICY "Users manage own learning_paths" ON public.learning_paths
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own flashcards" ON public.flashcards;
CREATE POLICY "Users manage own flashcards" ON public.flashcards
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 4. DEEP WORK 2.0 & NOTIFICATION PREFERENCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'pomodoro_25_5',
  intention text NOT NULL DEFAULT '',
  reflection text DEFAULT '',
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  duration_sec integer NOT NULL CHECK (duration_sec >= 0),
  distractions integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_reminders boolean NOT NULL DEFAULT true,
  habit_reminders boolean NOT NULL DEFAULT true,
  goal_deadlines boolean NOT NULL DEFAULT true,
  weekly_summary boolean NOT NULL DEFAULT true,
  preferred_hour integer NOT NULL DEFAULT 9 CHECK (preferred_hour BETWEEN 0 AND 23),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own focus_sessions" ON public.focus_sessions;
CREATE POLICY "Users manage own focus_sessions" ON public.focus_sessions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own notification_preferences" ON public.notification_preferences;
CREATE POLICY "Users manage own notification_preferences" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
