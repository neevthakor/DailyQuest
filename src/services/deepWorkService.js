import { getToday } from '../utils/date.js';
import { recordTaskSession } from './deviceBehaviorService.js';
import { enqueueOfflineAction } from './offlineSyncService.js';

const DEEP_WORK_KEY = 'dailyquest_deep_work_v4';
const ACTIVE_TIMER_KEY = 'dailyquest_active_timer_v4';

export const FOCUS_PRESETS = [
  { id: 'pomodoro_25_5', label: 'Pomodoro (25m / 5m)', workMinutes: 25, breakMinutes: 5, icon: '🍅' },
  { id: 'ultradian_52_17', label: '52/17 Flow Protocol', workMinutes: 52, breakMinutes: 17, icon: '🌊' },
  { id: 'deep_90_20', label: '90m Deep Work Block', workMinutes: 90, breakMinutes: 20, icon: '🧠' },
  { id: 'micro_10_2', label: '10m Rapid Sprint', workMinutes: 10, breakMinutes: 2, icon: '⚡' },
];

/**
 * Timestamp-based elapsed calculation so background tabs or browser throttling
 * never corrupt timer accuracy.
 */
export function computeElapsedSeconds(timerState, nowMs = Date.now()) {
  if (!timerState || !timerState.startedAtMs) return 0;
  const accumulated = Number(timerState.accumulatedSec) || 0;
  if (timerState.isPaused) return Math.max(0, Math.floor(accumulated));
  const deltaSec = Math.max(0, (nowMs - timerState.startedAtMs) / 1000);
  return Math.max(0, Math.floor(accumulated + deltaSec));
}

export function loadActiveTimer() {
  try {
    const raw = localStorage.getItem(ACTIVE_TIMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveActiveTimer(state) {
  try {
    if (!state) localStorage.removeItem(ACTIVE_TIMER_KEY);
    else localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  return state;
}

export function loadFocusHistory() {
  try {
    const raw = localStorage.getItem(DEEP_WORK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function completeFocusSession({
  mode = 'pomodoro_25_5',
  intention = 'Deep Work Session',
  reflection = '',
  durationSec = 1500,
  targetSec = 1500,
  distractions = 0,
}) {
  const history = loadFocusHistory();
  const entry = {
    id: `dw_${Date.now()}`,
    mode,
    intention: String(intention || 'Deep Work').trim(),
    reflection: String(reflection || '').trim(),
    durationSec: Math.max(1, Math.round(durationSec)),
    targetSec: Math.max(60, Math.round(targetSec)),
    distractions: Math.max(0, Math.round(distractions)),
    date: getToday(),
    completedAt: new Date().toISOString(),
  };

  const next = [entry, ...history].slice(0, 200);
  try {
    localStorage.setItem(DEEP_WORK_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }

  recordTaskSession({
    id: entry.id,
    title: entry.intention,
    category: 'Focus',
    durationSec: entry.durationSec,
    targetSec: entry.targetSec,
    distractions: entry.distractions,
    completed: true,
    date: entry.date,
  });

  enqueueOfflineAction('focus_session', entry, `dw_${entry.id}`);
  saveActiveTimer(null);

  const minutes = Math.max(1, Math.floor(entry.durationSec / 60));
  const zeroDistractionBonus = entry.distractions === 0 && minutes >= 10 ? 20 : 0;
  return {
    entry,
    minutes,
    goldEarned: minutes * 2 + 15 + zeroDistractionBonus,
    xpEarned: minutes * 2 + 10,
  };
}
