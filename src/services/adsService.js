import { APP_CONFIG } from '../lib/config';
import { isPremium } from './premiumService';

export function shouldShowAds(data) {
  if (!APP_CONFIG.adsEnabled) return true;
  return !isPremium(data);
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
