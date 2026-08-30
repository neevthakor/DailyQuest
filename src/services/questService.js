import { STREAK_QUEST_THRESHOLD } from '../lib/constants';
import { generateDailyQuests } from '../data/quests';
import { getToday, isYesterday } from '../utils/date';
import { applyXpAndCoins } from '../utils/xp';

export function ensureDailyQuests(data) {
  const today = getToday();
  if (data.quests.date !== today || !Array.isArray(data.quests.items) || data.quests.items.length === 0) {
    data.quests.date = today;
    data.quests.items = generateDailyQuests(today);
  }
  return data;
}

export function getTodayQuests(data) {
  ensureDailyQuests(data);
  return data.quests.items;
}

export function generateTodayQuests(data) {
  const today = getToday();
  data.quests.date = today;
  data.quests.items = generateDailyQuests(today);
  return data.quests.items;
}

export function findQuest(data, questId) {
  if (!Array.isArray(data.quests.items)) return null;
  return data.quests.items.find((q) => q.id === questId) || null;
}

export function isQuestCompleted(data, questId) {
  const quest = findQuest(data, questId);
  return !!quest?.completed;
}

export function getQuestProgress(data) {
  const items = Array.isArray(data?.quests?.items) ? data.quests.items : [];
  const completed = items.filter((quest) => quest.completed).length;
  return {
    completed,
    total: items.length,
    percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
  };
}

export function completeQuest(data, questId) {
  const today = getToday();
  if (data.quests.date !== today) {
    ensureDailyQuests(data);
    return { success: false, reason: 'stale_day' };
  }

  const quest = findQuest(data, questId);
  if (!quest) return { success: false, reason: 'missing' };
  if (quest.completed) return { success: false, reason: 'already_completed' };

  quest.completed = true;
  data.profile.totalQuestsCompleted = Math.max(0, data.profile.totalQuestsCompleted) + 1;
  const reward = applyXpAndCoins(data.profile, quest.xpReward, quest.coinReward);
  updateStreak(data);

  return {
    success: true,
    leveledUp: reward.leveledUp,
    level: reward.level,
    xpEarned: quest.xpReward,
    coinsEarned: quest.coinReward,
    quest,
  };
}

export function updateStreak(data) {
  const today = getToday();
  const completedToday = data.quests.items.filter((q) => q.completed).length;

  if (completedToday < STREAK_QUEST_THRESHOLD) return data;
  if (data.profile.lastStreakDate === today) return data;

  if (isYesterday(data.profile.lastStreakDate)) {
    data.profile.streak += 1;
  } else {
    data.profile.streak = 1;
  }
  data.profile.lastStreakDate = today;
  return data;
}
