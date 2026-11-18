import { getToday, toDateString } from '../utils/date.js';
import { enqueueOfflineAction } from './offlineSyncService.js';

const HABITS_KEY = 'dailyquest_habits_v4';

export const HABIT_CATEGORIES = [
  'Focus',
  'Study',
  'Fitness',
  'Mindfulness',
  'Reading',
  'Coding',
  'Sleep',
  'Health',
];

export const ROUTINE_SLOTS = [
  { id: 'morning', label: '🌅 Morning Routine' },
  { id: 'anytime', label: '☀️ Anytime' },
  { id: 'evening', label: '🌙 Evening Routine' },
];

export const HABIT_DIFFICULTIES = [
  { id: 'easy', label: 'Easy', xp: 15, gold: 10 },
  { id: 'medium', label: 'Medium', xp: 25, gold: 20 },
  { id: 'hard', label: 'Hard', xp: 40, gold: 35 },
];

const DEFAULT_HABITS = [
  {
    id: 'hab_default_1',
    title: 'Deep Focus Block (Zero Phone)',
    category: 'Focus',
    frequency: 'daily',
    targetDaysPerWeek: 7,
    difficulty: 'medium',
    routineSlot: 'morning',
    logs: {}, // { 'YYYY-MM-DD': 'completed' | 'recovery' }
    createdAt: '2026-11-01',
  },
  {
    id: 'hab_default_2',
    title: 'Spaced Repetition Review (15 Cards)',
    category: 'Study',
    frequency: 'daily',
    targetDaysPerWeek: 6,
    difficulty: 'medium',
    routineSlot: 'anytime',
    logs: {},
    createdAt: '2026-11-01',
  },
  {
    id: 'hab_default_3',
    title: 'Evening Digital Sunset & Plan Tomorrow',
    category: 'Mindfulness',
    frequency: 'daily',
    targetDaysPerWeek: 7,
    difficulty: 'easy',
    routineSlot: 'evening',
    logs: {},
    createdAt: '2026-11-01',
  },
];

export function loadHabits() {
  try {
    const raw = localStorage.getItem(HABITS_KEY);
    if (!raw) return DEFAULT_HABITS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_HABITS;
  } catch {
    return DEFAULT_HABITS;
  }
}

export function saveHabits(habits) {
  try {
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch {
    // ignore quota errors
  }
  return habits;
}

export function createHabit({
  title,
  category = 'Focus',
  frequency = 'daily',
  targetDaysPerWeek = 7,
  difficulty = 'medium',
  routineSlot = 'anytime',
}) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Habit title is required.');
  const habits = loadHabits();
  const item = {
    id: `hab_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title: cleanTitle,
    category,
    frequency,
    targetDaysPerWeek: Math.min(7, Math.max(1, Number(targetDaysPerWeek) || 7)),
    difficulty,
    routineSlot,
    logs: {},
    createdAt: getToday(),
  };
  const next = [item, ...habits];
  saveHabits(next);
  enqueueOfflineAction('habit_create', item, `hab_create_${item.id}`);
  return item;
}

export function updateHabit(habitId, patch) {
  const habits = loadHabits().map((h) => (h.id === habitId ? { ...h, ...patch } : h));
  return saveHabits(habits);
}

export function deleteHabit(habitId) {
  const habits = loadHabits().filter((h) => h.id !== habitId);
  enqueueOfflineAction('habit_delete', { habitId }, `hab_del_${habitId}`);
  return saveHabits(habits);
}

export function toggleHabitDate(habitId, dateStr = getToday(), mode = 'completed') {
  const habits = loadHabits();
  let toggledOn = false;
  let targetHabit = null;

  const next = habits.map((h) => {
    if (h.id !== habitId) return h;
    const logs = { ...(h.logs || {}) };
    if (logs[dateStr]) {
      delete logs[dateStr];
      toggledOn = false;
    } else {
      logs[dateStr] = mode;
      toggledOn = true;
    }
    targetHabit = { ...h, logs };
    return targetHabit;
  });

  saveHabits(next);
  const diffDef = HABIT_DIFFICULTIES.find((d) => d.id === targetHabit?.difficulty) || HABIT_DIFFICULTIES[1];
  enqueueOfflineAction(
    'habit_checkin',
    { habitId, dateStr, status: toggledOn ? mode : 'removed' },
    `hab_log_${habitId}_${dateStr}`
  );

  return {
    habits: next,
    toggledOn,
    xpDelta: toggledOn ? diffDef.xp : 0,
    goldDelta: toggledOn ? diffDef.gold : 0,
  };
}

/**
 * Computes current streak, longest streak, and 30-day consistency for a habit.
 * Recovery days ('recovery') preserve streaks without inflating completion count.
 */
export function calculateHabitMetrics(habit, referenceDateStr = getToday()) {
  const logs = habit?.logs || {};
  let currentStreak = 0;
  const cursor = new Date(`${referenceDateStr}T00:00:00`);

  for (let i = 0; i < 365; i++) {
    const dStr = toDateString(cursor);
    const status = logs[dStr];
    if (status === 'completed' || status === 'recovery') {
      currentStreak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else if (i === 0) {
      // Allow today to be unchecked without zeroing yesterday's active streak
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak across sorted dates
  const allDates = Object.keys(logs)
    .filter((k) => logs[k] === 'completed' || logs[k] === 'recovery')
    .sort();
  let longestStreak = currentStreak;
  let run = 0;
  let prevDate = null;

  for (const dStr of allDates) {
    const cur = new Date(`${dStr}T00:00:00`);
    if (prevDate) {
      const diffDays = Math.round((cur - prevDate) / (1000 * 60 * 60 * 24));
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
    prevDate = cur;
  }

  // Last 28 days heatmap & consistency
  const heatmap28 = [];
  let completedLast28 = 0;
  const end = new Date(`${referenceDateStr}T00:00:00`);
  for (let i = 27; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const iso = toDateString(d);
    const status = logs[iso] || null;
    if (status === 'completed') completedLast28 += 1;
    heatmap28.push({ date: iso, status });
  }

  const target28 = Math.max(1, Math.round(((habit?.targetDaysPerWeek || 7) / 7) * 28));
  const consistencyScore = Math.min(100, Math.round((completedLast28 / target28) * 100));

  return {
    currentStreak,
    longestStreak,
    consistencyScore,
    completedLast28,
    heatmap28,
    completedToday: logs[referenceDateStr] === 'completed',
    recoveredToday: logs[referenceDateStr] === 'recovery',
  };
}

export function getWeeklyHabitSummary(referenceDateStr = getToday()) {
  const habits = loadHabits();
  const metrics = habits.map((h) => ({ habit: h, ...calculateHabitMetrics(h, referenceDateStr) }));
  const completedToday = metrics.filter((m) => m.completedToday).length;
  const avgConsistency =
    metrics.length > 0
      ? Math.round(metrics.reduce((s, m) => s + m.consistencyScore, 0) / metrics.length)
      : 0;
  const bestStreak = metrics.reduce((max, m) => Math.max(max, m.currentStreak), 0);

  return {
    totalHabits: habits.length,
    completedToday,
    avgConsistency,
    bestStreak,
    items: metrics,
  };
}
