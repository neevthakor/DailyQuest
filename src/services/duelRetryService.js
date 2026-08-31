import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

/**
 * The app's own win/lose classification for a Daily Duel challenge decides
 * whether to OFFER a retry (see data/duels.js for each mini-game's scoring).
 * This function is what actually spends it — the server independently
 * refuses a second retry, a retry with no attempt on record, or a retry
 * from a non-Premium account, regardless of what the client believes.
 */
export async function fetchDuelRetryStatus(dateStr) {
  const client = requireClient();
  const { data, error } = await client.rpc('get_my_duel_retry_status', {
    p_date: dateStr || undefined,
  });
  if (error) throw error;
  if (!data?.success) {
    return { isPremium: false, hasPlayedToday: false, retryUsed: false, retryAvailable: false };
  }
  return {
    isPremium: !!data.is_premium,
    hasPlayedToday: !!data.has_played_today,
    retryUsed: !!data.retry_used,
    retryAvailable: !!data.retry_available,
  };
}

export async function submitDuelRetry(challengeId, score, durationMs = null) {
  const client = requireClient();
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const { data, error } = await client.rpc('submit_daily_duel_retry', {
    p_challenge_type: challengeId,
    p_score: safeScore,
    p_duration_ms: durationMs,
  });
  if (error) throw error;
  return data;
}

export const duelRetryService = {
  fetchDuelRetryStatus,
  submitDuelRetry,
};
