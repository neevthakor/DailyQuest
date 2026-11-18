import { USERNAME_MAX_LENGTH } from '../lib/constants.js';
import { syncLevelFromXp } from '../utils/xp.js';

export function setUsername(data, name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return false;
  data.profile.username = trimmed.slice(0, USERNAME_MAX_LENGTH);
  return true;
}

export function setOnboarded(data) {
  data.settings.onboarded = true;
  return data;
}

export function getProfile(data) {
  syncLevelFromXp(data.profile);
  return data.profile;
}
