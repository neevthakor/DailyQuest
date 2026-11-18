import { getToday } from '../utils/date.js';

const PSYCH_KEY = 'dailyquest_psychology_v3';

export const MOOD_STATES = [
  { id: 'sharp', label: 'Sharp', icon: '⚡', desc: 'Unlock Genius Boss Mode (1.5x Gold)', goldMult: 1.5, timerNote: 'Peak speed & high-stakes ready' },
  { id: 'tired', label: 'Tired', icon: '😴', desc: 'Shorter 10m sprints & gentle warmup', goldMult: 1.0, timerNote: 'Low-strain cognitive maintenance' },
  { id: 'anxious', label: 'Anxious', icon: '🌊', desc: 'Alpha 10Hz + Box Breathing pacer', goldMult: 1.1, timerNote: 'Calming rhythm, zero pressure' },
  { id: 'overwhelmed', label: 'Overwhelmed', icon: '🫂', desc: '2-Min Micro-Start mode activated', goldMult: 1.2, timerNote: 'One tiny step at a time' },
];

export const CBT_TRIGGERS = [
  'Distraction / Phone / Tabs',
  'Mental Fatigue / Low Sleep',
  'Task Felt Too Big / Unclear',
  'Fear of Failing / Perfectionism',
];

function loadPsych() {
  try {
    const raw = localStorage.getItem(PSYCH_KEY);
    return raw ? JSON.parse(raw) : { moodByDate: {}, journal: [], phoenixUsedDates: [] };
  } catch {
    return { moodByDate: {}, journal: [], phoenixUsedDates: [] };
  }
}

function savePsych(state) {
  try {
    localStorage.setItem(PSYCH_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  return state;
}

export function getTodayMood() {
  const s = loadPsych();
  return s.moodByDate[getToday()] || null;
}

export function setTodayMood(moodId) {
  const s = loadPsych();
  s.moodByDate[getToday()] = { moodId, setAt: new Date().toISOString() };
  savePsych(s);
  return MOOD_STATES.find((m) => m.id === moodId) || MOOD_STATES[0];
}

export function getMoodConfig(moodId) {
  return MOOD_STATES.find((m) => m.id === moodId) || null;
}

export function addCBTEntry({ trigger, reframe, context = 'Session Reflection' }) {
  const s = loadPsych();
  const entry = {
    id: `cbt_${Date.now()}`,
    date: getToday(),
    trigger,
    reframe: reframe.trim(),
    context,
    createdAt: new Date().toISOString(),
  };
  s.journal = [entry, ...(s.journal || [])].slice(0, 50);
  savePsych(s);
  return entry;
}

export function getCBTJournal() {
  return loadPsych().journal || [];
}

export function canUsePhoenixRecovery(streak) {
  const s = loadPsych();
  const today = getToday();
  return streak === 0 && !(s.phoenixUsedDates || []).includes(today);
}

export function markPhoenixUsed() {
  const s = loadPsych();
  const today = getToday();
  s.phoenixUsedDates = Array.from(new Set([...(s.phoenixUsedDates || []), today]));
  savePsych(s);
}
