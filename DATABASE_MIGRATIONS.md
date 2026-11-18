# DailyQuest Database Migrations Guide

## Migration Order
All migrations in `supabase/migrations/` are additive and non-destructive:
1. `001_profiles.sql` — Core profiles table & RLS
2. `002_game_data.sql` — Daily quests, completions, duel scores, achievements
3. `003_leaderboard.sql` — Leaderboard view & indexing
4. `004_pro_and_avatars.sql` — Premium entitlements & payment requests
5. `005_gold_economy.sql` — Economy config, gold_transactions, `purchase_item` RPC
6. `006_cumulative_duels.sql` — Cumulative duel score tracking
7. `007_shop_and_gamification.sql` — Active boosts, `claim_daily_reward` RPC
8. `008_premium_rewards.sql` — Premium reward multipliers
9. `009_fix_gold_transactions_column.sql` — Transaction column normalization
10. `010_update_premium_gold_rewards.sql` — Updated Gold reward tiers
11. `011_v2_brain_arena_and_telemetry.sql` — `task_sessions`, `ai_preferences`, `multiplayer_matches`
12. `012_v3_rpg_and_psychology.sql` — `cbt_journal`, `rpg_inventory`
13. **`013_v4_security_habits_vault_squads.sql` (NEW in v4)**:
    - Locks down `award_gold_atomic` against arbitrary client calls.
    - Adds idempotent `claim_verified_reward(p_event_type, p_reference_id, p_metadata)` with unique index `idx_gold_tx_user_ref_unique`.
    - Restricts `rpg_inventory` to read-only RLS and adds `unlock_rpg_relic(p_relic_id)` `SECURITY DEFINER` RPC.
    - Hardens `multiplayer_matches` RLS to host/guest participants.
    - Creates `habits`, `habit_logs`, `learning_paths`, `flashcards`, `focus_sessions`, and `notification_preferences` with owner-scoped RLS.

## How to Apply in Supabase
1. Open **Supabase Dashboard → SQL Editor**.
2. Paste the contents of `supabase/migrations/011_v2_brain_arena_and_telemetry.sql`, `012_v3_rpg_and_psychology.sql`, and `013_v4_security_habits_vault_squads.sql` (in order, if `011`/`012` are not yet applied) and click **Run**.
