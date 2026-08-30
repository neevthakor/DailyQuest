import { ACHIEVEMENTS } from '../data/achievements';
import { CLOUD_IMPORT_KEY_PREFIX, STORAGE_KEY, STARTING_COINS } from '../lib/constants';
import { isValidDateString } from '../utils/date';
import { sanitizeXp, syncLevelFromXp } from '../utils/xp';

function toInt(value, fallback = 0, min = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.floor(n));
}

function toDateOrNull(value) {
  return isValidDateString(value) ? value : null;
}

export function getDefaultData() {
  return {
    profile: {
      username: 'Player',
      avatar: '',
      xp: 0,
      level: 1,
      coins: STARTING_COINS,
      streak: 0,
      lastStreakDate: null,
      totalQuestsCompleted: 0,
      totalXPEarned: 0,
      bestDuelScore: 0,
      duelsCompleted: 0,
    },
    quests: {
      date: null,
      items: [],
    },
    achievements: ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false })),
    duel: {
      lastPlayedDate: null,
      bestScore: 0,
      history: [],
    },
    settings: {
      theme: 'dark',
      onboarded: false,
      premium: false,
    },
  };
}

function sanitizeQuest(item, defaultsIndex) {
  if (!item || typeof item !== 'object') return null;
  const difficulty = typeof item.difficulty === 'string' ? item.difficulty : 'Easy';
  return {
    id: typeof item.id === 'string' && item.id ? item.id : `q_repaired_${defaultsIndex}`,
    title: typeof item.title === 'string' ? item.title : 'Quest',
    description: typeof item.description === 'string' ? item.description : '',
    category: typeof item.category === 'string' ? item.category : 'Mind',
    difficulty,
    xpReward: toInt(item.xpReward, 10),
    coinReward: toInt(item.coinReward, 10),
    completed: !!item.completed,
  };
}

function mergeAchievements(defaults, saved) {
  if (!Array.isArray(saved)) return defaults;
  const savedById = new Map(saved.filter((a) => a && a.id).map((a) => [a.id, a]));
  return defaults.map((d) => {
    const s = savedById.get(d.id);
    return s ? { ...d, unlocked: !!s.unlocked } : d;
  });
}

export function sanitizeGameData(raw) {
  const defaults = getDefaultData();
  if (!raw || typeof raw !== 'object') return defaults;

  const profileIn = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
  const questsIn = raw.quests && typeof raw.quests === 'object' ? raw.quests : {};
  const duelIn = raw.duel && typeof raw.duel === 'object' ? raw.duel : {};
  const settingsIn = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};

  const username =
    typeof profileIn.username === 'string' && profileIn.username.trim()
      ? profileIn.username.trim().slice(0, 20)
      : defaults.profile.username;

  const items = Array.isArray(questsIn.items)
    ? questsIn.items.map(sanitizeQuest).filter(Boolean)
    : [];

  const history = Array.isArray(duelIn.history)
    ? duelIn.history
        .filter((h) => h && typeof h === 'object' && isValidDateString(h.date))
        .map((h) => ({
          date: h.date,
          score: toInt(h.score, 0),
          challengeId: typeof h.challengeId === 'string' ? h.challengeId : undefined,
        }))
    : [];

  const data = {
    profile: {
      ...defaults.profile,
      username,
      avatar: typeof profileIn.avatar === 'string' ? profileIn.avatar.trim().slice(0, 4) : defaults.profile.avatar,
      xp: sanitizeXp(profileIn.xp),
      coins: toInt(profileIn.coins, STARTING_COINS),
      streak: toInt(profileIn.streak, 0),
      lastStreakDate: toDateOrNull(profileIn.lastStreakDate),
      totalQuestsCompleted: toInt(profileIn.totalQuestsCompleted, 0),
      totalXPEarned: toInt(profileIn.totalXPEarned, 0),
      bestDuelScore: toInt(profileIn.bestDuelScore, 0),
      duelsCompleted: toInt(profileIn.duelsCompleted, 0),
    },
    quests: {
      date: toDateOrNull(questsIn.date),
      items,
    },
    achievements: mergeAchievements(defaults.achievements, raw.achievements),
    duel: {
      lastPlayedDate: toDateOrNull(duelIn.lastPlayedDate),
      bestScore: toInt(duelIn.bestScore, 0),
      history,
    },
    settings: {
      theme: typeof settingsIn.theme === 'string' ? settingsIn.theme : defaults.settings.theme,
      onboarded: !!settingsIn.onboarded,
      premium: !!settingsIn.premium,
    },
  };

  syncLevelFromXp(data.profile);
  const best = Math.max(data.profile.bestDuelScore, data.duel.bestScore);
  data.profile.bestDuelScore = best;
  data.duel.bestScore = best;
  return data;
}

export function cloneData(data) {
  try {
    return structuredClone(data);
  } catch {
    return JSON.parse(JSON.stringify(data));
  }
}

function readRaw() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

export function loadGameData() {
  try {
    const parsed = readRaw();
    if (parsed == null) return getDefaultData();
    return sanitizeGameData(parsed);
  } catch (e) {
    console.error('Failed to load game data, resetting:', e);
    return getDefaultData();
  }
}

export function saveGameData(data) {
  try {
    const safe = sanitizeGameData(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safe));
    return true;
  } catch (e) {
    console.error('Failed to save game data:', e);
    return false;
  }
}

export function resetGameData() {
  const fresh = getDefaultData();
  saveGameData(fresh);
  return fresh;
}

export function getUserProfile() {
  return loadGameData().profile;
}

export function saveUserProfile(profileUpdate) {
  const data = loadGameData();
  data.profile = { ...data.profile, ...(profileUpdate || {}) };
  syncLevelFromXp(data.profile);
  saveGameData(data);
  return data.profile;
}

export function hasImportableLocalProgress(data = loadGameData()) {
  const safe = sanitizeGameData(data);
  return (
    safe.profile.xp > 0 ||
    safe.profile.coins !== STARTING_COINS ||
    safe.profile.streak > 0 ||
    safe.profile.totalQuestsCompleted > 0 ||
    safe.profile.totalXPEarned > 0 ||
    safe.profile.bestDuelScore > 0 ||
    safe.profile.duelsCompleted > 0 ||
    safe.quests.items.some((quest) => quest.completed) ||
    safe.achievements.some((achievement) => achievement.unlocked) ||
    safe.duel.history.length > 0
  );
}

export function getCloudImportKey(userId) {
  return `${CLOUD_IMPORT_KEY_PREFIX}${userId}`;
}

export function hasImportedLocalProgress(userId) {
  if (!userId) return true;
  return localStorage.getItem(getCloudImportKey(userId)) === 'true';
}

export function markLocalProgressImported(userId) {
  if (!userId) return;
  localStorage.setItem(getCloudImportKey(userId), 'true');
}

export const storageService = {
  loadGameData,
  saveGameData,
  resetGameData,
  getUserProfile,
  saveUserProfile,
  getDefaultData,
  cloneData,
  hasImportableLocalProgress,
  hasImportedLocalProgress,
  markLocalProgressImported,
};
