import { PREMIUM_BENEFITS, PREMIUM_PLAN_DEFS } from '../lib/premiumConfig.js';

// Re-exported under the old names so existing imports
// (PREMIUM_PLANS, PREMIUM_BENEFITS) keep working.
export const PREMIUM_PLANS = PREMIUM_PLAN_DEFS;
export { PREMIUM_BENEFITS };

/**
 * Legacy/local fallback only.
 *
 * This is NOT the authoritative Premium check.
 * Premium-only features and rewards must use
 * usePremium() / entitlementService.fetchMyEntitlement(),
 * which check the server-side entitlement.
 */
export function isPremium(data) {
  return !!data?.settings?.premium;
}

export function getUpgradeMessage() {
  return 'Premium payments will be connected in a future version.';
}

export const premiumService = {
  isPremium,
  plans: PREMIUM_PLANS,
  benefits: PREMIUM_BENEFITS,
  getUpgradeMessage,
};