-- DailyQuest v3: Server-Authoritative Gold RPC, CBT Journal & RPG Relics

CREATE TABLE IF NOT EXISTS public.cbt_journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_reason text NOT NULL,
  reframe_note text NOT NULL,
  context text DEFAULT 'Session Reflection',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cbt_journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cbt_journal" ON public.cbt_journal
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.rpg_inventory (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unlocked_relics jsonb NOT NULL DEFAULT '[]'::jsonb,
  boss_clears jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rpg_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rpg_inventory" ON public.rpg_inventory
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.award_gold_atomic(p_delta integer, p_reason text DEFAULT 'Reward')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_new_coins integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  UPDATE public.profiles
  SET coins = GREATEST(0, COALESCE(coins, 0) + p_delta)
  WHERE id = v_uid
  RETURNING coins INTO v_new_coins;

  RETURN jsonb_build_object('success', true, 'coins', v_new_coins, 'reason', p_reason);
END;
$$;
