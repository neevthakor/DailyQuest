import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) throw new Error(supabaseConfigError || 'Supabase is not available.');
  return supabase;
}

export async function fetchGoldTransactions(userId, limit = 50) {
  const client = requireClient();
  const { data, error } = await client
    .from('gold_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

export async function purchaseItem(itemId, payload = {}) {
  const client = requireClient();
  const { data, error } = await client.rpc('purchase_item', {
    p_item_id: itemId,
    p_payload: payload,
  });
  
  if (error) throw error;
  return data;
}

export async function claimDailyReward() {
  const client = requireClient();
  const { data, error } = await client.rpc('claim_daily_reward');
  if (error) throw error;
  return data;
}
