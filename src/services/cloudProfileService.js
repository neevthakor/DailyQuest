import { STARTING_COINS } from '../lib/constants.js';
import { supabase, supabaseConfigError } from '../lib/supabase.js';
import { syncLevelFromXp } from '../utils/xp.js';
import { getDefaultData, sanitizeGameData } from './storageService.js';

export function toProfileRow(profile, userId) {
  const safe = sanitizeGameData({ ...getDefaultData(), profile: profile || {} }).profile;
  return {
    id: userId,
    username: safe.username || 'Player',
    avatar: safe.avatar || null,
    xp: safe.xp,
    coins: safe.coins,
    streak: safe.streak,
    last_streak_date: safe.lastStreakDate || null,
    total_quests_completed: safe.totalQuestsCompleted,
    total_xp: safe.totalXPEarned,
    best_duel_score: safe.bestDuelScore,
    total_duel_points: safe.totalDuelPoints,
    last_daily_reward_claim_date: safe.last_daily_reward_claim_date || null,
  };
}

export function rowToProfile(row) {
  if (!row) return null;
  const profile = {
    username: row.username || 'Player',
    avatar: row.avatar || '',
    xp: Math.max(0, Number(row.xp) || 0),
    coins: Math.max(0, Number(row.coins) || STARTING_COINS),
    streak: Math.max(0, Number(row.streak) || 0),
    lastStreakDate: row.last_streak_date || null,
    totalQuestsCompleted: Math.max(0, Number(row.total_quests_completed) || 0),
    totalXPEarned: Math.max(0, Number(row.total_xp) || 0),
    bestDuelScore: Math.max(0, Number(row.best_duel_score) || 0),
    totalDuelPoints: Math.max(0, Number(row.total_duel_points) || 0),
    last_daily_reward_claim_date: row.last_daily_reward_claim_date || null,
  };
  syncLevelFromXp(profile);
  return profile;
}

function profileUpdateToRow(profileUpdate) {
  const update = {};
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'username')) {
    update.username = String(profileUpdate.username || 'Player').trim().slice(0, 20) || 'Player';
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'avatar')) {
    update.avatar = profileUpdate.avatar || null;
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'xp')) {
    update.xp = Math.max(0, Math.floor(Number(profileUpdate.xp) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'coins')) {
    update.coins = Math.max(0, Math.floor(Number(profileUpdate.coins) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'streak')) {
    update.streak = Math.max(0, Math.floor(Number(profileUpdate.streak) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'lastStreakDate')) {
    update.last_streak_date = profileUpdate.lastStreakDate || null;
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'totalQuestsCompleted')) {
    update.total_quests_completed = Math.max(0, Math.floor(Number(profileUpdate.totalQuestsCompleted) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'totalXPEarned')) {
    update.total_xp = Math.max(0, Math.floor(Number(profileUpdate.totalXPEarned) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'bestDuelScore')) {
    update.best_duel_score = Math.max(0, Math.floor(Number(profileUpdate.bestDuelScore) || 0));
  }
  if (Object.prototype.hasOwnProperty.call(profileUpdate, 'totalDuelPoints')) {
    update.total_duel_points = Math.max(0, Math.floor(Number(profileUpdate.totalDuelPoints) || 0));
  }
  return update;
}

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

export async function fetchProfile(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return rowToProfile(data);
}

export async function createProfile(userId, profile) {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .insert(toProfileRow(profile, userId))
    .select('*')
    .single();

  if (error) throw error;
  return rowToProfile(data);
}

export async function upsertProfile(userId, profile) {
  const client = requireClient();
  const { data, error } = await client
    .from('profiles')
    .upsert(toProfileRow(profile, userId), { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return rowToProfile(data);
}

export async function updateProfile(userId, profileUpdate) {
  const client = requireClient();
  const row = profileUpdateToRow(profileUpdate || {});
  if (Object.keys(row).length === 0) return fetchProfile(userId);

  const { data, error } = await client
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return rowToProfile(data);
}
