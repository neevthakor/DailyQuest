import { fetchProgressAnalytics } from './progressAnalyticsService.js';
import { toDateString } from '../utils/date.js';
import { analyzeBehaviorProfile } from './deviceBehaviorService.js';
import { loadAIPreferences, GOAL_TRACKS } from './aiCoachService.js';

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = toDateString(d);
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    days.push({ date: iso, label });
  }
  return days;
}

/**
 * Real, personalized Weekly Report combining cloud quest/duel data (if authenticated)
 * with local duel history, live task focus sessions, cognitive domain breakdown,
 * and device behavior telemetry.
 */
export async function fetchWeeklyReport(userId, localData = null) {
  const weekDays = getLast7Days();
  const startDate = weekDays[0].date;
  const endDate = weekDays[weekDays.length - 1].date;

  let cloud = null;
  if (userId) {
    try {
      cloud = await fetchProgressAnalytics(userId, { sinceDate: startDate, untilDate: endDate });
    } catch {
      cloud = null;
    }
  }

  const behavior = analyzeBehaviorProfile();
  const prefs = loadAIPreferences();
  const track = GOAL_TRACKS.find((g) => g.id === prefs.primaryGoal) || GOAL_TRACKS[3];

  const duelHistory = Array.isArray(localData?.duel?.history) ? localData.duel.history : [];
  const weekDuels = duelHistory.filter((h) => h.date >= startDate && h.date <= endDate);

  const dailyFocusSeries = weekDays.map((wd) => {
    const mins = Math.round(
      behavior.taskSessions
        .filter((s) => s.date === wd.date)
        .reduce((sum, s) => sum + (s.durationSec || 0), 0) / 60
    );
    return { date: wd.date, label: wd.label, value: mins };
  });

  const dailyDuelSeries = weekDays.map((wd) => {
    const entries = weekDuels.filter((d) => d.date === wd.date);
    const avg = entries.length > 0
      ? Math.round(entries.reduce((s, e) => s + (e.score || 0), 0) / entries.length)
      : 0;
    return { date: wd.date, label: wd.label, score: avg };
  });

  const activeDateSet = new Set([
    ...weekDuels.map((d) => d.date),
    ...behavior.taskSessions.filter((s) => s.date >= startDate).map((s) => s.date),
    ...(cloud?.xpTrend?.map((x) => x.date) || []),
  ]);

  const duelScoresOnly = weekDuels.map((d) => d.score || 0);
  const avgDuelScore = duelScoresOnly.length > 0
    ? Math.round(duelScoresOnly.reduce((a, b) => a + b, 0) / duelScoresOnly.length)
    : 0;

  const duelTrendDelta = duelScoresOnly.length >= 2
    ? duelScoresOnly[duelScoresOnly.length - 1] - duelScoresOnly[0]
    : (cloud?.duelImprovement || 0);

  const insights = [
    `Focus Stability is ${behavior.focusStability}% across ${behavior.totalFocusMins}m of live-tracked work (${behavior.totalDistractions} tab switches).`,
    `Cognitive Edge: Strongest in ${behavior.strongestDomain}; highest growth opportunity in ${behavior.weakestDomain}.`,
    behavior.peakHour !== null
      ? `Peak Performance Window detected at ${behavior.peakHour}:00 — your brain duel scores peak here.`
      : 'Play brain duels across different times of day to detect your Peak Performance Hour.',
    `Goal Alignment (${track.label}): ${duelTrendDelta >= 0 ? `+${duelTrendDelta}` : duelTrendDelta} pt duel score shift this week.`,
  ];

  return {
    windowDays: 7,
    startDate,
    endDate,
    activeDays: activeDateSet.size,
    questsCompleted: cloud?.completedQuests ?? (localData?.quests?.items?.filter((q) => q.completed).length || 0),
    completionRate: cloud?.completionRate ?? 0,
    duelCount: Math.max(weekDuels.length, cloud?.duelCount || 0),
    avgDuelScore,
    duelImprovement: duelTrendDelta,
    focusStability: behavior.focusStability,
    totalFocusMins: behavior.totalFocusMins,
    totalDistractions: behavior.totalDistractions,
    strongestDomain: behavior.strongestDomain,
    weakestDomain: behavior.weakestDomain,
    domainBreakdown: behavior.domainBreakdown,
    dailyFocusSeries,
    dailyDuelSeries: dailyDuelSeries.filter((d) => d.score > 0),
    insights,
    recommendedFocus: `Next week, target ${behavior.weakestDomain} puzzles during your ${behavior.peakHour !== null ? `${behavior.peakHour}:00` : 'morning'} peak window and run 25m single-tab sprints.`,
  };
}

export const weeklyReportService = { fetchWeeklyReport };
