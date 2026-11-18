import { BASE_XP_PER_LEVEL, XP_INCREMENT_PER_LEVEL } from '../lib/constants';

export function requiredXP(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  return BASE_XP_PER_LEVEL + (safeLevel - 1) * XP_INCREMENT_PER_LEVEL;
}

/**
 * XP is the source of truth. Level and progress are always derived from total XP.
 */
export function calculateLevel(totalXP) {
  const xp = sanitizeXp(totalXP);
  let level = 1;
  let xpNeeded = 0;
  let xpForNext = requiredXP(level);
  while (xp >= xpNeeded + xpForNext) {
    xpNeeded += xpForNext;
    level += 1;
    xpForNext = requiredXP(level);
  }
  const xpIntoLevel = xp - xpNeeded;
  const progressPct = xpForNext > 0 ? Math.round((xpIntoLevel / xpForNext) * 100) : 0;
  return { level, xpIntoLevel, xpForNextLevel: xpForNext, progressPct };
}

export function sanitizeXp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function syncLevelFromXp(profile) {
  profile.xp = sanitizeXp(profile.xp);
  profile.level = calculateLevel(profile.xp).level;
  return profile;
}

export function applyXpAndCoins(profile, xpDelta, coinDelta) {
  const oldLevel = calculateLevel(profile.xp).level;
  profile.xp = sanitizeXp(profile.xp) + Math.max(0, Math.floor(Number(xpDelta) || 0));
  profile.totalXPEarned =
    Math.max(0, Math.floor(Number(profile.totalXPEarned) || 0)) +
    Math.max(0, Math.floor(Number(xpDelta) || 0));
  profile.coins =
    Math.max(0, Math.floor(Number(profile.coins) || 0)) +
    Math.max(0, Math.floor(Number(coinDelta) || 0));
  const next = calculateLevel(profile.xp);
  profile.level = next.level;
  return {
    leveledUp: next.level > oldLevel,
    level: next.level,
  };
}
