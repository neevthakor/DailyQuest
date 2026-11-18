/**
 * App configuration and future-integration flags.
 * No backend, payment, or ad SDKs are wired here yet.
 */
export const APP_CONFIG = {
  appName: 'DailyQuest',
  storageBackend: 'supabase-with-local-fallback',
  authBackend: 'supabase',
  analyticsEnabled: false,
  adsEnabled: false,
  paymentsEnabled: false,
};
