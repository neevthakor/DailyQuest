import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage in Node test environment
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};

import { applyXpAndCoins, calculateLevel, requiredXP } from '../src/utils/xp.js';
import { calculateHabitMetrics } from '../src/services/habitService.js';
import { computeSM2Review } from '../src/services/knowledgeVaultService.js';
import { computeElapsedSeconds } from '../src/services/deepWorkService.js';
import { computeBackoffMs, enqueueOfflineAction, loadSyncQueue, clearSyncQueue } from '../src/services/offlineSyncService.js';
import { getDailyDuelSet } from '../src/services/duelService.js';
import { decomposeGoalIntoMilestones } from '../src/services/aiCoachService.js';

test('XP & Level calculations are deterministic and monotonic', () => {
  assert.equal(requiredXP(1), 100);
  assert.equal(requiredXP(2), 150);
  const lvl1 = calculateLevel(50);
  assert.equal(lvl1.level, 1);
  assert.equal(lvl1.xpIntoLevel, 50);

  const lvl2 = calculateLevel(120);
  assert.equal(lvl2.level, 2);
  assert.equal(lvl2.xpIntoLevel, 20);
});

test('Gold & XP transactions sanitize negative inputs and update level', () => {
  const profile = { xp: 90, totalXPEarned: 90, coins: 100, level: 1 };
  const res = applyXpAndCoins(profile, 30, 50);
  assert.equal(res.leveledUp, true);
  assert.equal(profile.level, 2);
  assert.equal(profile.coins, 150);
  assert.equal(profile.xp, 120);
});

test('Habit Forge streak & recovery day calculation preserves streak across rest days', () => {
  const habit = {
    id: 'h1',
    targetDaysPerWeek: 7,
    logs: {
      '2026-11-15': 'completed',
      '2026-11-16': 'recovery',
      '2026-11-17': 'completed',
    },
  };
  const m = calculateHabitMetrics(habit, '2026-11-17');
  assert.equal(m.currentStreak, 3);
  assert.equal(m.longestStreak, 3);
  assert.equal(m.completedToday, true);
  assert.equal(m.heatmap28.length, 28);
});

test('SM-2 Spaced Repetition increases interval on recall and resets on blackout', () => {
  const card = { id: 'c1', intervalDays: 1, repetition: 0, easiness: 2.5 };
  const rev1 = computeSM2Review(card, 5, '2026-11-17');
  assert.equal(rev1.repetition, 1);
  assert.equal(rev1.intervalDays, 1);
  assert.equal(rev1.nextReviewDate, '2026-11-18');

  const rev2 = computeSM2Review(rev1, 5, '2026-11-18');
  assert.equal(rev2.repetition, 2);
  assert.equal(rev2.intervalDays, 6);

  const failed = computeSM2Review(rev2, 1, '2026-11-24');
  assert.equal(failed.repetition, 0);
  assert.equal(failed.intervalDays, 1);
  assert.ok(failed.easiness >= 1.3);
});

test('Timestamp-accurate Deep Work timer ignores setInterval drift', () => {
  const timer = { startedAtMs: 1000000, accumulatedSec: 120, isPaused: false };
  const elapsed = computeElapsedSeconds(timer, 1000000 + 45000);
  assert.equal(elapsed, 165);

  const paused = { ...timer, isPaused: true };
  assert.equal(computeElapsedSeconds(paused, 1000000 + 999000), 120);
});

test('Offline queue prevents duplicate idempotency keys and computes exponential backoff', () => {
  clearSyncQueue();
  enqueueOfflineAction('habit_checkin', { a: 1 }, 'idem_key_1');
  enqueueOfflineAction('habit_checkin', { a: 2 }, 'idem_key_1');
  const q = loadSyncQueue();
  assert.equal(q.length, 1);
  assert.equal(q[0].payload.a, 2);
  assert.equal(computeBackoffMs(0), 1000);
  assert.equal(computeBackoffMs(3), 8000);
});

test('Daily Duel generates 3 distinct puzzles and AI Coach decomposes goals into 4 milestones', () => {
  const set = getDailyDuelSet('2026-11-17');
  assert.equal(set.length, 3);
  const uniqueIds = new Set(set.map((s) => s.id));
  assert.equal(uniqueIds.size, 3);

  const milestones = decomposeGoalIntoMilestones('Master System Design');
  assert.equal(milestones.length, 4);
});
