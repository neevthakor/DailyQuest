import { APP_CONFIG } from '../lib/config';

/**
 * MODIFIED: now takes the server-verified `isPremium` boolean (from
 * usePremium()/entitlementService), not the old `data` object with its
 * client-trusted `settings.premium` flag. Callers change from
 * `shouldShowAds(data)` to `shouldShowAds(isPremium)`.
 */
export function shouldShowAds(isPremiumUser) {
  if (!APP_CONFIG.adsEnabled) return true;
  return !isPremiumUser;
}

export function getBannerSlot() {
  return { type: 'banner', placeholder: true };
}

export function getRewardedSlot() {
  return { type: 'rewarded', placeholder: true };
}

export const adsService = {
  shouldShowAds,
  getBannerSlot,
  getRewardedSlot,
};
