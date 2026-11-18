import { cloneData, loadGameData, resetGameData, saveGameData } from './storageService.js';
import { completeQuest as completeQuestState, ensureDailyQuests } from './questService.js';
import { completeDuel as completeDuelState } from './duelService.js';
import { getNewlyUnlockedAchievements, updateAchievements } from './achievementService.js';
import { setOnboarded, setUsername } from './profileService.js';
import { syncLevelFromXp } from '../utils/xp.js';
import { track } from './analyticsService.js';

function prepare(data) {
  syncLevelFromXp(data.profile);
  ensureDailyQuests(data);
  updateAchievements(data);
  return data;
}

export function hydrateGame() {
  const data = prepare(loadGameData());
  saveGameData(data);
  return data;
}

export function persistGame(data) {
  const next = prepare(cloneData(data));
  saveGameData(next);
  return next;
}

export function completeQuest(currentData, questId) {
  const oldData = cloneData(currentData);
  const newData = prepare(cloneData(currentData));
  const result = completeQuestState(newData, questId);
  if (!result.success) {
    return { success: false, reason: result.reason, data: persistGame(newData), result };
  }
  updateAchievements(newData);
  const unlocked = getNewlyUnlockedAchievements(oldData, newData);
  saveGameData(newData);
  track('quest_completed', { questId, xp: result.xpEarned });
  return { success: true, data: newData, result, unlocked };
}

export function completeDuel(currentData, score, challengeId) {
  const oldData = cloneData(currentData);
  const newData = prepare(cloneData(currentData));
  const result = completeDuelState(newData, score, challengeId);
  if (!result.success) {
    return { success: false, reason: result.reason, data: newData, result, unlocked: [] };
  }
  updateAchievements(newData);
  const unlocked = getNewlyUnlockedAchievements(oldData, newData);
  saveGameData(newData);
  track('duel_completed', { score, challengeId });
  return { success: true, data: newData, result, unlocked };
}

export function startOnboarding(currentData, name) {
  const newData = prepare(cloneData(currentData));
  const ok = setUsername(newData, name);
  if (!ok) return { success: false, data: currentData };
  setOnboarded(newData);
  ensureDailyQuests(newData);
  saveGameData(newData);
  track('onboarding_completed');
  return { success: true, data: newData };
}

export function changeUsername(currentData, name) {
  const newData = cloneData(currentData);
  const ok = setUsername(newData, name);
  if (!ok) return { success: false, data: currentData };
  saveGameData(newData);
  return { success: true, data: newData };
}

export function resetProgress() {
  const fresh = prepare(resetGameData());
  saveGameData(fresh);
  track('progress_reset');
  return fresh;
}

export const gameService = {
  hydrateGame,
  persistGame,
  completeQuest,
  completeDuel,
  startOnboarding,
  changeUsername,
  resetProgress,
};
