import { supabase, supabaseConfigError } from '../lib/supabase.js';
import { purchaseItem } from './economyService.js';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToGroup(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    creatorId: row.creator_id,
    privacy: row.privacy,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Public + private groups the current query can see (RLS handles scoping). */
export async function discoverGroups({ search = '', limit = 30 } = {}) {
  const client = requireClient();
  let query = client.from('groups').select('*').eq('status', 'active').order('created_at', { ascending: false }).limit(limit);
  if (search) query = query.ilike('name', `%${search}%`);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToGroup);
}

export async function fetchMyGroups(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('group_members')
    .select('group_id, role, groups(*)')
    .eq('user_id', userId);
  if (error) throw error;
  return (data || [])
    .filter((row) => row.groups)
    .map((row) => ({ ...rowToGroup(row.groups), myRole: row.role }));
}

export async function fetchGroupMembers(groupId) {
  const client = requireClient();
  const { data, error } = await client.rpc('get_group_members', { p_group_id: groupId });
  if (error) throw error;
  return (data || []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    avatar: row.avatar,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

/**
 * Premium-gated group creation. The entitlement check happens inside the
 * create_group() RPC (security definer), NOT here — this function cannot
 * be bypassed into an insert because no direct insert policy exists on
 * public.groups.
 */
export async function createGroup({ name, description = '', privacy = 'public' }) {
  const client = requireClient();
  const { data, error } = await client.rpc('create_group', {
    p_name: name,
    p_description: description,
    p_privacy: privacy,
  });
  if (error) throw error;
  return data; // { success, group } or { success: false, reason }
}

export async function joinGroup(userId, groupId) {
  const result = await purchaseItem('join_group', { group_id: groupId });
  if (!result.success) {
    throw new Error(result.reason || 'Failed to join group.');
  }
  return true;
}

export async function leaveGroup(userId, groupId) {
  const client = requireClient();
  const { error } = await client.from('group_members').delete().eq('user_id', userId).eq('group_id', groupId);
  if (error) throw error;
  return true;
}

export const groupsService = {
  discoverGroups,
  fetchMyGroups,
  fetchGroupMembers,
  createGroup,
  joinGroup,
  leaveGroup,
};
