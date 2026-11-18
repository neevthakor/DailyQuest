import { IMPROVEMENT_CATEGORIES } from '../lib/premiumConfig';
import { getTaskPoolForCategory } from '../data/improvementTasks';
import { getToday } from '../utils/date';
import { createRng, hashString, seededShuffle } from '../utils/rng';

/**
 * Generates today's personalized improvement tasks for a Premium user.
 *
 * This is deliberately deterministic (seeded by user id + date), matching
 * the existing DailyQuest pattern in data/quests.js and duelService.js, so
 * the same tasks show up on every load for a given day without a database
 * round trip.
 *
 * `goals` (from goalsService.fetchGoals) can be passed in to bias category
 * selection toward what the user says they're working on — this is the
 * "personalization" today: history-aware category weighting, not
 * generative AI. See data/improvementTasks.js for the future-AI seam.
 */
export function generatePersonalizedTasks(userId, { goals = [], dateStr = getToday(), count = 3 } = {}) {
  const preferredCategories = goals
    .filter((g) => g.status === 'active')
    .map((g) => g.category)
    .filter((c) => IMPROVEMENT_CATEGORIES.includes(c));

  const categoryPool = preferredCategories.length > 0
    ? [...preferredCategories, ...IMPROVEMENT_CATEGORIES]
    : [...IMPROVEMENT_CATEGORIES];

  const rng = createRng(hashString(`dailyquest:personalized:${userId}:${dateStr}`));
  const shuffledCategories = seededShuffle(rng, categoryPool);

  const seen = new Set();
  const tasks = [];

  for (const category of shuffledCategories) {
    if (tasks.length >= count) break;
    if (seen.has(category)) continue;
    seen.add(category);

    const pool = getTaskPoolForCategory(category);
    if (pool.length === 0) continue;
    const task = pool[Math.floor(rng() * pool.length)];

    tasks.push({
      id: `pt_${dateStr}_${category.replace(/\s+/g, '_')}`,
      category,
      description: task,
      date: dateStr,
    });
  }

  return tasks;
}

export const personalizedTasksService = { generatePersonalizedTasks };
