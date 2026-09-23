import { QUESTS_PER_DAY } from '../lib/constants';
import { createRng, hashString, seededInt, seededShuffle } from '../utils/rng';

export const QUEST_POOL = [
  { title: 'Complete a brain challenge', description: 'Solve a quick mental puzzle to wake up your mind.', category: 'Mind', difficulty: 'Easy' },
  { title: 'Complete the Daily Duel', description: "Take on today's random mini-game challenge.", category: 'Game', difficulty: 'Medium' },
  { title: 'Study for 20 minutes', description: 'Focus on learning something new for 20 minutes.', category: 'Learning', difficulty: 'Medium' },
  { title: 'Read for 15 minutes', description: 'Pick up a book or article and read for 15 minutes.', category: 'Learning', difficulty: 'Easy' },
  { title: 'Exercise for 15 minutes', description: 'Get moving with any physical activity for 15 minutes.', category: 'Health', difficulty: 'Medium' },
  { title: 'Drink enough water', description: 'Stay hydrated — drink at least 6 glasses of water today.', category: 'Health', difficulty: 'Easy' },
  { title: 'Take a short walk', description: 'Step outside for a refreshing walk.', category: 'Health', difficulty: 'Easy' },
  { title: 'Learn something new', description: 'Discover a new fact, skill, or idea today.', category: 'Learning', difficulty: 'Medium' },
  { title: 'Complete a focus session', description: 'Do 25 minutes of deep, distraction-free work.', category: 'Productivity', difficulty: 'Hard' },
  { title: 'Spend 20 minutes without social media', description: 'Resist the urge to scroll for 20 full minutes.', category: 'Mind', difficulty: 'Medium' },
  { title: 'Write down one goal', description: 'Put one personal goal in writing today.', category: 'Productivity', difficulty: 'Easy' },
  { title: 'Complete a random challenge', description: 'Do something out of your comfort zone today.', category: 'Adventure', difficulty: 'Hard' },
  { title: 'Meditate for 10 minutes', description: 'Find a quiet spot and clear your mind.', category: 'Mind', difficulty: 'Easy' },
  { title: 'Tidy your workspace', description: 'Clean and organize your desk or room.', category: 'Productivity', difficulty: 'Easy' },
  { title: 'Do 20 push-ups', description: 'Challenge your body with 20 push-ups.', category: 'Health', difficulty: 'Hard' },
];

export const DIFFICULTY_CONFIG = {
  Easy: { xpMin: 10, xpMax: 20, coins: 10, icon: '🟢', color: '#10b981' },
  Medium: { xpMin: 20, xpMax: 30, coins: 20, icon: '🟡', color: '#f59e0b' },
  Hard: { xpMin: 30, xpMax: 50, coins: 30, icon: '🔴', color: '#ef4444' },
};

export const CATEGORY_ICONS = {
  Mind: '🧠',
  Game: '⚔️',
  Learning: '📚',
  Health: '💪',
  Productivity: '⚡',
  Adventure: '🗺️',
};

/**
 * Daily quests are deterministic for a given calendar date so every
 * load on the same day produces the same set, rewards, and ids.
 */
export function generateDailyQuests(dateStr, userLevel = 1) {
  const rng = createRng(hashString(`dailyquest:quests:${dateStr}`));
  const pool = seededShuffle(rng, QUEST_POOL);
  const selected = [];

  let numQuests = QUESTS_PER_DAY;
  if (userLevel > 10) numQuests += 1;
  if (userLevel > 20) numQuests += 1;

  for (let i = 0; i < numQuests && i < pool.length; i++) {
    const quest = pool[i];
    const cfg = DIFFICULTY_CONFIG[quest.difficulty] || DIFFICULTY_CONFIG.Easy;
    const xpReward = seededInt(rng, cfg.xpMin, cfg.xpMax);
    selected.push({
      id: `q_${dateStr}_${i}`,
      title: quest.title,
      description: quest.description,
      category: quest.category,
      difficulty: quest.difficulty,
      xpReward,
      coinReward: cfg.coins,
      completed: false,
    });
  }

  return selected;
}
