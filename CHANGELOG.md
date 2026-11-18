# DailyQuest Changelog

## v4.0.0 — Personal Growth Operating System (2026-11-18)

### Added
- **Habit Forge (`src/pages/HabitForge.jsx`, `src/services/habitService.js`)**: Dedicated habit formation system with Morning/Anytime/Evening routines, 28-day GitHub-style contribution heatmaps, consistency scores, streak tracking, and guilt-free **Recovery Days**.
- **Deep Work Mode 2.0 (`src/pages/DeepWork.jsx`, `src/services/deepWorkService.js`)**: Timestamp-accurate focus timer (immune to background tab throttling) supporting Pomodoro (25/5), 52/17 Flow Protocol, 90m Deep Work, Fullscreen Zen Mode, session intentions, post-session reflections, and integrated Web Audio soundscapes.
- **Knowledge Vault (`src/pages/KnowledgeVault.jsx`, `src/services/knowledgeVaultService.js`)**: SM-2 spaced repetition flashcard engine, 5 preloaded learning paths (*Computer Science, Programming, Data Science, Mathematics, General Knowledge*), custom learning path builder, and offline Note-to-Flashcard generator.
- **Smart Calendar & Planner (`src/pages/SmartPlanner.jsx`, `src/services/notificationService.js`)**: 7-day interactive schedule strip, AI Goal-to-Milestone decomposer, and permission-gated reminder preferences.
- **Squad Missions (`src/pages/Groups.jsx`)**: Co-op weekly team XP goals, shared focus room launchers, and squad contributions alongside cloud groups.
- **Unified Life Dashboard (`src/pages/Home.jsx`)**: Consolidated OS overview displaying Habits Today, Deep Work minutes, Knowledge Vault due cards, AI Daily Focus Prescription, 3/3 Daily Duels, and RPG Rank.
- **Offline Sync Queue v4 (`src/services/offlineSyncService.js`)**: Idempotency-key deduplication, exponential backoff retry (`computeBackoffMs`), and live header sync indicator + Light/Dark theme toggle in `Navigation.jsx`.
- **Unit Test Suite (`tests/v4.test.js`)**: Automated Node test suite verifying XP math, Gold transactions, Habit streaks & recovery days, SM-2 spaced repetition, timestamp timer accuracy, and offline queue idempotency.

### Security Fixes (`supabase/migrations/013_v4_security_habits_vault_squads.sql`)
- Locked down `public.award_gold_atomic(integer, text)` (`REVOKE ALL FROM PUBLIC/anon/authenticated`) so browser clients cannot mint arbitrary Gold.
- Added idempotent server-authoritative `public.claim_verified_reward(p_event_type, p_reference_id, p_metadata)` RPC with daily rate caps and `idx_gold_tx_user_ref_unique` replay protection.
- Replaced permissive `FOR ALL` RLS on `public.rpg_inventory` with read-only client `SELECT` and server-verified `public.unlock_rpg_relic(p_relic_id)` RPC.
- Restricted `public.multiplayer_matches` RLS to host/guest participants.
