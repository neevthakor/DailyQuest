import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowToTodo(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority,
    category: row.category || '',
    dueDate: row.due_date,
    completed: !!row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchTodos(userId, { sort = 'due_date', order = 'asc', onlyOpen = false } = {}) {
  const client = requireClient();
  let query = client.from('todos').select('*').eq('user_id', userId);
  if (onlyOpen) query = query.eq('completed', false);
  query = query.order(sort, { ascending: order === 'asc', nullsFirst: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(rowToTodo);
}

export async function createTodo(userId, todo) {
  const client = requireClient();
  const { data, error } = await client
    .from('todos')
    .insert({
      user_id: userId,
      title: todo.title,
      description: todo.description || null,
      priority: todo.priority || 'medium',
      category: todo.category || null,
      due_date: todo.dueDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToTodo(data);
}

export async function updateTodo(userId, todoId, patch) {
  const client = requireClient();
  const updatePayload = {};
  if (patch.title !== undefined) updatePayload.title = patch.title;
  if (patch.description !== undefined) updatePayload.description = patch.description;
  if (patch.priority !== undefined) updatePayload.priority = patch.priority;
  if (patch.category !== undefined) updatePayload.category = patch.category;
  if (patch.dueDate !== undefined) updatePayload.due_date = patch.dueDate;
  if (patch.completed !== undefined) updatePayload.completed = patch.completed;

  const { data, error } = await client
    .from('todos')
    .update(updatePayload)
    .eq('id', todoId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return rowToTodo(data);
}

export async function deleteTodo(userId, todoId) {
  const client = requireClient();
  const { error } = await client.from('todos').delete().eq('id', todoId).eq('user_id', userId);
  if (error) throw error;
  return true;
}

export const todosService = { fetchTodos, createTodo, updateTodo, deleteTodo };
