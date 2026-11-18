import { APP_CONFIG } from '../lib/config';

/**
 * Local identity until Supabase auth is wired.
 */
export function getLocalSession(data) {
  return {
    backend: APP_CONFIG.authBackend,
    userId: 'local',
    username: data?.profile?.username || 'Player',
    onboarded: !!data?.settings?.onboarded,
  };
}
