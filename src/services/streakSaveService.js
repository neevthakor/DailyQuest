import { supabase, supabaseConfigError } from '../lib/supabase.js';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function currentPeriod(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Reads this month's Streak Save allowance/usage. Free users always show
 * allowance 0 — the RPC itself derives that from is_premium(), not from
 * anything the client sends.
 */
export async function fetchStreakSaveStatus(period = currentPeriod()) {
  const client = requireClient();
  const { data, error } = await client.rpc('get_my_streak_saves', { p_period: period });
  if (error) throw error;
  if (!data?.success) return { isPremium: false, allowance: 0, used: 0, remaining: 0, period };

  return {
    isPremium: !!data.is_premium,
    allowance: data.allowance,
    used: data.used,
    remaining: data.remaining,
    period: data.period,
  };
}

/**
 * Spends one Streak Save to protect a missed day. Server enforces:
 *   - caller is Premium
 *   - the day hasn't already been saved
 *   - the monthly allowance (2) hasn't been exhausted
 * Returns { success, reason? } — the frontend should surface `reason`
 * ('not_premium' | 'already_saved' | 'no_saves_remaining') as a friendly
 * message rather than assuming success.
 */
export async function useStreakSave(missedDateStr) {
  const client = requireClient();
  const { data, error } = await client.rpc('use_streak_save', {
    p_missed_date: missedDateStr || undefined,
  });
  if (error) throw error;
  return data;
}

export const streakSaveService = {
  fetchStreakSaveStatus,
  useStreakSave,
  currentPeriod,
};
