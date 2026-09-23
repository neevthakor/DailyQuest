import { supabase, supabaseConfigError } from '../lib/supabase';
import { getToday } from '../utils/date';

/**
 * Local stand-in for a future global leaderboard backed by cloud duel scores.
 */
export function getLocalLeaderboard(data) {
  if (!data?.profile) return [];
  return [
    {
      rank: 1,
      userId: 'local',
      username: data.profile.username,
      bestDuelScore: data.profile.bestDuelScore || 0,
      xp: data.profile.xp || 0,
      level: data.profile.level || 1,
    },
  ];
}

export const LEADERBOARD_PERIODS = [
  { id: 'duel_points', label: 'Duel Points' },
  { id: 'xp', label: 'Total XP' },
  { id: 'gold', label: 'Total Gold' },
];

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToLeaderboardEntry(row) {
  return {
    rank: Math.max(0, Number(row.rank) || 0),
    userId: row.user_id,
    username: row.username || 'Player',
    avatar: row.avatar || '',
    score: Math.max(0, Number(row.score) || 0),
    duelDate: row.duel_date || null,
    challengeId: row.challenge_type || null,
  };
}

/**
 * Fetches the global leaderboard via the get_leaderboard SECURITY DEFINER
 * RPC. Only aggregated, non-sensitive fields are returned.
 */
export async function fetchLeaderboard(category = 'duel_points', limit = 50) {
  const client = requireClient();
  const { data, error } = await client.rpc('get_leaderboard', {
    p_category: category,
    p_reference_date: getToday(), // kept for backward compatibility if needed
    p_limit: limit,
  });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(rowToLeaderboardEntry);
}

/**
 * Fetches the current signed-in user's own rank for a category via the
 * get_my_rank RPC, which derives the user from auth.uid() server-side.
 * Returns null if the caller is not authenticated.
 */
export async function fetchMyRank(category = 'duel_points') {
  const client = requireClient();
  const { data, error } = await client.rpc('get_my_rank', {
    p_category: category,
    p_reference_date: getToday(),
  });

  if (error) throw error;
  if (!data?.success) return null;

  if (!data.has_score) {
    return { hasScore: false, totalPlayers: Math.max(0, Number(data.total_players) || 0) };
  }

  return {
    hasScore: true,
    rank: Math.max(0, Number(data.rank) || 0),
    score: Math.max(0, Number(data.score) || 0),
    duelDate: data.duel_date || null,
    challengeId: data.challenge_type || null,
    totalPlayers: Math.max(0, Number(data.total_players) || 0),
  };
}

export const leaderboardService = {
  getLocalLeaderboard,
  fetchLeaderboard,
  fetchMyRank,
  LEADERBOARD_PERIODS,
};
