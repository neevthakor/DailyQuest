import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToChallenge(row) {
  return {
    id: row.id,
    groupId: row.group_id,
    creatorId: row.creator_id,
    title: row.title,
    description: row.description || '',
    goal: row.goal || '',
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function fetchGroupChallenges(groupId) {
  const client = requireClient();
  const { data, error } = await client
    .from('group_challenges')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToChallenge);
}

export async function createChallenge(userId, groupId, { title, description = '', goal = '', startDate, endDate }) {
  const client = requireClient();
  const { data, error } = await client
    .from('group_challenges')
    .insert({
      group_id: groupId,
      creator_id: userId,
      title,
      description,
      goal,
      start_date: startDate,
      end_date: endDate,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToChallenge(data);
}

export async function fetchChallengeParticipants(challengeId) {
  const client = requireClient();
  const { data, error } = await client
    .from('challenge_participants')
    .select('user_id, progress, completed, joined_at')
    .eq('challenge_id', challengeId)
    .order('progress', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function joinChallenge(userId, challengeId) {
  const client = requireClient();
  const { error } = await client
    .from('challenge_participants')
    .insert({ user_id: userId, challenge_id: challengeId });
  if (error) throw error;
  return true;
}

export async function updateMyChallengeProgress(userId, challengeId, progress) {
  const client = requireClient();
  const safe = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const { data, error } = await client
    .from('challenge_participants')
    .update({ progress: safe, completed: safe >= 100 })
    .eq('user_id', userId)
    .eq('challenge_id', challengeId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const challengesService = {
  fetchGroupChallenges,
  createChallenge,
  fetchChallengeParticipants,
  joinChallenge,
  updateMyChallengeProgress,
};
