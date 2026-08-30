import { calculateLevel } from '../utils/xp';

const CHECKS = {
  first_quest: (profile) => profile.totalQuestsCompleted >= 1,
  getting_started: (profile) => profile.totalQuestsCompleted >= 5,
  streak_3: (profile) => profile.streak >= 3,
  streak_7: (profile) => profile.streak >= 7,
  level_5: (profile) => calculateLevel(profile.xp).level >= 5,
  level_10: (profile) => calculateLevel(profile.xp).level >= 10,
  xp_hunter: (profile) => profile.totalXPEarned >= 1000,
  duel_master: (profile) => profile.duelsCompleted >= 10,
};

export function updateAchievements(data) {
  const { profile } = data;
  for (const ach of data.achievements) {
    if (!ach.unlocked && CHECKS[ach.id] && CHECKS[ach.id](profile)) {
      ach.unlocked = true;
    }
  }
  return data;
}

export function getNewlyUnlockedAchievements(oldData, newData) {
  const previously = new Set(
    (oldData.achievements || []).filter((a) => a.unlocked).map((a) => a.id)
  );
  return (newData.achievements || []).filter((a) => a.unlocked && !previously.has(a.id));
}
