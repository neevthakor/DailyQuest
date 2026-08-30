import { APP_CONFIG } from '../lib/config';

/**
 * No-op analytics until a production provider is connected.
 */
export function track() {
  if (!APP_CONFIG.analyticsEnabled) return;
}

export const analyticsService = { track };
