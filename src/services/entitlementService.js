import { supabase, supabaseConfigError } from '../lib/supabase.js';

/**
 * Server-authoritative Premium entitlement.
 *
 * IMPORTANT: this is the ONLY place Premium status should be read from once
 * this package is integrated. It replaces `isPremium(data)` from
 * premiumService.js, which trusted `data.settings.premium` — a plain
 * client-side boolean anyone could flip in localStorage or React devtools.
 *
 * When Supabase isn't configured (local-only / logged-out mode), Premium is
 * always false — there is no server to authorize it against.
 */
function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

const DEFAULT_ENTITLEMENT = {
  isPremium: false,
  plan: 'free',
  status: 'expired',
  expiresAt: null,
};

export async function fetchMyEntitlement() {
  if (!supabase) return DEFAULT_ENTITLEMENT;

  const client = requireClient();
  const { data, error } = await client.rpc('get_my_entitlement');
  if (error) throw error;
  if (!data?.success) return DEFAULT_ENTITLEMENT;

  return {
    isPremium: !!data.is_premium,
    plan: data.plan || 'free',
    status: data.status || 'expired',
    expiresAt: data.expires_at || null,
  };
}

/**
 * Convenience guard for UI code: `if (!(await requirePremium())) return;`
 * Never use a locally-cached boolean for anything that grants a reward —
 * always re-check through the relevant RPC (use_streak_save,
 * submit_daily_duel_retry, create_group, ...), which independently
 * verifies Premium status server-side regardless of what the client thinks.
 */
export async function isPremiumNow() {
  const entitlement = await fetchMyEntitlement();
  return entitlement.isPremium;
}

export const entitlementService = {
  fetchMyEntitlement,
  isPremiumNow,
  DEFAULT_ENTITLEMENT,
};
