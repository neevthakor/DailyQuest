/**
 * Compatibility re-exports. New code should import from services/ and utils/xp.
 */
export {
  loadGameData,
  saveGameData,
  resetGameData,
  getUserProfile,
  saveUserProfile,
  getDefaultData,
  cloneData,
} from '../services/storageService.js';
export { calculateLevel, requiredXP } from './xp.js';
export { ensureDailyQuests, completeQuest } from '../services/questService.js';
export { completeDuel } from '../services/duelService.js';
export { updateAchievements, getNewlyUnlockedAchievements } from '../services/achievementService.js';
export { setUsername, setOnboarded } from '../services/profileService.js';
