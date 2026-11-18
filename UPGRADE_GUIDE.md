# DailyQuest v4 Upgrade Guide

## Overview
DailyQuest v4 upgrades your existing v3 repository in-place without deleting `.git`, `.env`, `.env.local`, or `node_modules`. All existing user profiles, XP, Gold, achievements, quests, 32 brain games, and UPI Premium flows remain 100% compatible.

## Quick Upgrade via PowerShell
1. Ensure the ZIP is saved at `C:\Users\NEEV\Downloads\DailyQuest-v3-Upgraded.zip`.
2. Open PowerShell in `C:\Users\NEEV\OneDrive\drive\OneDrive\Desktop\DailyQuest-main` and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\POWERSHELL_INSTALL.ps1
   ```
   *(Or run the inline commands provided in chat if running before extracting `POWERSHELL_INSTALL.ps1`.)*
3. Verify tests and production build:
   ```powershell
   npm test
   npm run build
   ```
4. Apply the additive database migration in Supabase SQL Editor:
   - `supabase/migrations/013_v4_security_habits_vault_squads.sql`
