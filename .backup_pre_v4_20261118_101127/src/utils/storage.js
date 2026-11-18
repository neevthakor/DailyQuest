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
} from '../services/storageService';
export { calculateLevel, requiredXP } from './xp';
export { ensureDailyQuests, completeQuest } from '../services/questService';
export { completeDuel } from '../services/duelService';
export { updateAchievements, getNewlyUnlockedAchievements } from '../services/achievementService';
export { setUsername, setOnboarded } from '../services/profileService';
