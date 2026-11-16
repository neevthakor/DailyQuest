import { COGNITIVE_DOMAINS, DUEL_CHALLENGES, getChallengeById } from '../data/duels';
import { getToday } from '../utils/date';

const TELEMETRY_KEY = 'dailyquest_device_telemetry_v2';

const DEFAULT_TELEMETRY = {
  consentGranted: false,
  tabSwitches: 0,
  totalActiveSeconds: 0,
  sessions: [], // { date, hour, durationSec, tabSwitches }
  hourlyScores: {}, // { [hour]: { total: 0, count: 0 } }
  domainStats: {}, // { [domain]: { plays: 0, totalScore: 0, best: 0 } }
  taskSessions: [], // { id, title, category, durationSec, targetSec, distractions, date, hour, completed }
  lastDeviceSnapshot: null,
};

export function loadTelemetry() {
  try {
    const raw = localStorage.getItem(TELEMETRY_KEY);
    if (!raw) return { ...DEFAULT_TELEMETRY };
    return { ...DEFAULT_TELEMETRY, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TELEMETRY };
  }
}

export function saveTelemetry(next) {
  try {
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export function setTelemetryConsent(granted) {
  const t = loadTelemetry();
  t.consentGranted = !!granted;
  return saveTelemetry(t);
}

export async function collectDeviceSnapshot() {
  const t = loadTelemetry();
  if (!t.consentGranted) return null;

  let battery = null;
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.getBattery === 'function') {
      const b = await navigator.getBattery();
      battery = {
        levelPct: Math.round((b.level || 0) * 100),
        charging: !!b.charging,
      };
    }
  } catch {
    battery = null;
  }

  const conn = typeof navigator !== 'undefined' ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection) : null;
  const snapshot = {
    capturedAt: new Date().toISOString(),
    localHour: new Date().getHours(),
    platform: typeof navigator !== 'undefined' ? (navigator.userAgentData?.platform || navigator.platform || 'Web') : 'Web',
    cpuCores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || null) : null,
    deviceMemoryGb: typeof navigator !== 'undefined' ? (navigator.deviceMemory || null) : null,
    screen: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : 'Unknown',
    isMobile: typeof window !== 'undefined' ? window.innerWidth <= 768 : false,
    networkType: conn?.effectiveType || 'online',
    battery,
  };

  t.lastDeviceSnapshot = snapshot;
  saveTelemetry(t);
  return snapshot;
}

export function recordGamePerformance(challengeId, score) {
  const t = loadTelemetry();
  const ch = getChallengeById(challengeId);
  const domain = ch.category || 'Memory';
  const hour = new Date().getHours();

  if (!t.domainStats[domain]) {
    t.domainStats[domain] = { plays: 0, totalScore: 0, best: 0 };
  }
  t.domainStats[domain].plays += 1;
  t.domainStats[domain].totalScore += Number(score) || 0;
  t.domainStats[domain].best = Math.max(t.domainStats[domain].best, Number(score) || 0);

  if (!t.hourlyScores[hour]) {
    t.hourlyScores[hour] = { total: 0, count: 0 };
  }
  t.hourlyScores[hour].total += Number(score) || 0;
  t.hourlyScores[hour].count += 1;

  return saveTelemetry(t);
}

export function recordTaskSession(session) {
  const t = loadTelemetry();
  const entry = {
    id: session.id || `ts_${Date.now()}`,
    title: session.title || 'Focus Task',
    category: session.category || 'Focus',
    durationSec: Math.max(0, Math.round(session.durationSec || 0)),
    targetSec: Math.max(60, Math.round(session.targetSec || 1500)),
    distractions: Math.max(0, Math.round(session.distractions || 0)),
    completed: !!session.completed,
    date: session.date || getToday(),
    hour: typeof session.hour === 'number' ? session.hour : new Date().getHours(),
  };
  t.taskSessions.unshift(entry);
  t.taskSessions = t.taskSessions.slice(0, 200);
  t.totalActiveSeconds += entry.durationSec;
  t.tabSwitches += entry.distractions;
  return saveTelemetry(t);
}

export function recordActiveHeartbeat(seconds = 15, switchedTab = false) {
  const t = loadTelemetry();
  if (!t.consentGranted) return t;
  t.totalActiveSeconds += seconds;
  if (switchedTab) t.tabSwitches += 1;
  return saveTelemetry(t);
}

export function analyzeBehaviorProfile() {
  const t = loadTelemetry();
  const snap = t.lastDeviceSnapshot;
  const hour = new Date().getHours();

  // Domain breakdown across all 6 cognitive domains
  const domainBreakdown = COGNITIVE_DOMAINS.map((domain) => {
    const s = t.domainStats[domain] || { plays: 0, totalScore: 0, best: 0 };
    const avg = s.plays > 0 ? Math.round(s.totalScore / s.plays) : 0;
    return { domain, plays: s.plays, avgScore: avg, bestScore: s.best };
  });

  const playedDomains = domainBreakdown.filter((d) => d.plays > 0).sort((a, b) => a.avgScore - b.avgScore);
  const weakestDomain = playedDomains[0]?.domain || 'Memory';
  const strongestDomain = playedDomains[playedDomains.length - 1]?.domain || 'Speed';

  // Peak hour from hourly scores
  let peakHour = null;
  let bestAvg = -1;
  for (const [hr, val] of Object.entries(t.hourlyScores)) {
    if (val.count > 0 && val.total / val.count > bestAvg) {
      bestAvg = val.total / val.count;
      peakHour = Number(hr);
    }
  }

  // Focus stability from task sessions & tab switches
  const totalFocusMins = Math.round(
    t.taskSessions.reduce((sum, s) => sum + s.durationSec, 0) / 60
  );
  const totalDistractions = t.taskSessions.reduce((sum, s) => sum + s.distractions, 0);
  const focusStability = t.taskSessions.length > 0
    ? Math.max(35, Math.min(100, Math.round(100 - (totalDistractions / Math.max(1, t.taskSessions.length)) * 12)))
    : Math.max(50, 100 - Math.min(40, t.tabSwitches * 3));

  // Fatigue risk
  let fatigueRisk = 'Low';
  if (hour >= 23 || hour < 5) fatigueRisk = 'High (Late Night)';
  else if (snap?.battery && !snap.battery.charging && snap.battery.levelPct < 20) fatigueRisk = 'Moderate (Low Battery)';
  else if (totalDistractions > 8) fatigueRisk = 'Moderate (High Tab Switching)';

  const recommendedGames = DUEL_CHALLENGES.filter((c) => c.category === weakestDomain).slice(0, 3);

  return {
    consentGranted: t.consentGranted,
    deviceSnapshot: snap,
    focusStability,
    totalFocusMins,
    totalDistractions,
    weakestDomain,
    strongestDomain,
    peakHour,
    fatigueRisk,
    domainBreakdown,
    taskSessions: t.taskSessions,
    recommendedGames,
  };
}
