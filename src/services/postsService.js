import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToPost(row) {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.username,
    avatar: row.avatar,
    groupId: row.group_id,
    content: row.content,
    visibility: row.visibility,
    statsSnapshot: row.stats_snapshot || null,
    likeCount: Number(row.like_count) || 0,
    commentCount: Number(row.comment_count) || 0,
    likedByMe: !!row.liked_by_me,
    createdAt: row.created_at,
  };
}

/** scope: 'public' | 'group' | 'mine' */
export async function fetchFeed({ scope = 'public', groupId = null, limit = 20, before = null } = {}) {
  const client = requireClient();
  const { data, error } = await client.rpc('get_feed_posts', {
    p_scope: scope,
    p_group_id: groupId,
    p_limit: limit,
    p_before: before,
  });
  if (error) throw error;
  return (data || []).map(rowToPost);
}

export async function createPost(userId, { content, visibility = 'public', groupId = null, statsSnapshot = null }) {
  const client = requireClient();
  const { data, error } = await client
    .from('progress_posts')
    .insert({
      user_id: userId,
      content,
      visibility,
      group_id: visibility === 'group' ? groupId : null,
      stats_snapshot: statsSnapshot,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updatePost(userId, postId, content) {
  const client = requireClient();
  const { data, error } = await client
    .from('progress_posts')
    .update({ content })
    .eq('id', postId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(userId, postId) {
  const client = requireClient();
  const { error } = await client.from('progress_posts').delete().eq('id', postId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function likePost(userId, postId) {
  const client = requireClient();
  const { error } = await client
    .from('post_likes')
    .upsert({ user_id: userId, post_id: postId }, { onConflict: 'post_id,user_id', ignoreDuplicates: true });
  if (error) throw error;
  return true;
}

export async function unlikePost(userId, postId) {
  const client = requireClient();
  const { error } = await client.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function fetchComments(postId) {
  const client = requireClient();
  // profiles stays owner-only via RLS (see 001_profiles.sql), so comment
  // authors' username/avatar are read through the get_post_comments RPC
  // (SECURITY DEFINER) rather than a plain join — same pattern as
  // get_feed_posts and get_leaderboard.
  const { data, error } = await client.rpc('get_post_comments', { p_post_id: postId });
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    username: row.username || 'Player',
    avatar: row.avatar || '',
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function addComment(userId, postId, content) {
  const client = requireClient();
  const { data, error } = await client
    .from('post_comments')
    .insert({ user_id: userId, post_id: postId, content })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteComment(userId, commentId) {
  const client = requireClient();
  const { error } = await client.from('post_comments').delete().eq('id', commentId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export const postsService = {
  fetchFeed,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  fetchComments,
  addComment,
  deleteComment,
};
