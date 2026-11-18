import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToGoal(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    target: row.target || '',
    frequency: row.frequency,
    startDate: row.start_date,
    endDate: row.end_date,
    progress: row.progress,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchGoals(userId, { status } = {}) {
  const client = requireClient();
  let query = client.from('goals').select('*').eq('user_id', userId);
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToGoal);
}

export async function createGoal(userId, goal) {
  const client = requireClient();
  const { data, error } = await client
    .from('goals')
    .insert({
      user_id: userId,
      title: goal.title,
      category: goal.category || 'General',
      target: goal.target || null,
      frequency: goal.frequency || 'daily',
      start_date: goal.startDate || new Date().toISOString().slice(0, 10),
      end_date: goal.endDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function updateGoalProgress(userId, goalId, progress) {
  const client = requireClient();
  const safe = Math.max(0, Math.min(100, Math.round(Number(progress) || 0)));
  const patch = { progress: safe };
  if (safe >= 100) patch.status = 'completed';

  const { data, error } = await client
    .from('goals')
    .update(patch)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function updateGoal(userId, goalId, patch) {
  const client = requireClient();
  const updatePayload = {};
  ['title', 'category', 'target', 'frequency', 'status'].forEach((key) => {
    if (patch[key] !== undefined) updatePayload[key] = patch[key];
  });
  if (patch.startDate !== undefined) updatePayload.start_date = patch.startDate;
  if (patch.endDate !== undefined) updatePayload.end_date = patch.endDate;

  const { data, error } = await client
    .from('goals')
    .update(updatePayload)
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return rowToGoal(data);
}

export async function deleteGoal(userId, goalId) {
  const client = requireClient();
  const { error } = await client.from('goals').delete().eq('id', goalId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export const goalsService = { fetchGoals, createGoal, updateGoalProgress, updateGoal, deleteGoal };
