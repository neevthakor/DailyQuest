-- DailyQuest v2 Upgrade: Live Task Sessions, AI Preferences, Multiplayer Matches & Inventory

CREATE TABLE IF NOT EXISTS public.task_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title text NOT NULL,
  category text DEFAULT 'Focus',
  duration_sec integer NOT NULL DEFAULT 0,
  target_sec integer NOT NULL DEFAULT 1500,
  distractions integer NOT NULL DEFAULT 0,
  gold_earned integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own task_sessions" ON public.task_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ai_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  primary_goal text NOT NULL DEFAULT 'genius-all',
  custom_goal_text text DEFAULT '',
  daily_minutes integer NOT NULL DEFAULT 30,
  preferred_difficulty text NOT NULL DEFAULT 'Medium',
  focus_style text NOT NULL DEFAULT 'Pomodoro (25m)',
  telemetry_consent boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai_preferences" ON public.ai_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.multiplayer_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code text NOT NULL,
  host_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  wager_gold integer NOT NULL DEFAULT 0,
  host_score integer DEFAULT 0,
  guest_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.multiplayer_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view and play matches" ON public.multiplayer_matches
  FOR ALL USING (auth.uid() IS NOT NULL);
