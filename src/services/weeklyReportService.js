import { fetchProgressAnalytics } from './progressAnalyticsService';
import { toDateString } from '../utils/date';

function getCurrentWeekBounds() {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    monday: toDateString(monday),
    sunday: toDateString(sunday),
  };
}

/**
 * Weekly Personal Report (Premium). Built entirely on top of
 * progressAnalyticsService's window. Now uses a strict calendar week.
 */
export async function fetchWeeklyReport(userId) {
  const { monday, sunday } = getCurrentWeekBounds();
  const analytics = await fetchProgressAnalytics(userId, { sinceDate: monday, untilDate: sunday });

  const activeDays = new Set(analytics.xpTrend.map((d) => d.date)).size;

  const recommendedFocus = analytics.weakestCategory
    ? `Spend a little extra time on ${analytics.weakestCategory.category} this week — it's currently your lowest completion rate at ${analytics.weakestCategory.rate}%.`
    : 'Complete a few more quests this week to start seeing category trends.';

  return {
    windowDays: 7,
    startDate: monday,
    endDate: sunday,
    activeDays,
    questsCompleted: analytics.completedQuests,
    completionRate: analytics.completionRate,
    duelCount: analytics.duelCount,
    duelImprovement: analytics.duelImprovement,
    strongestCategory: analytics.strongestCategory,
    weakestCategory: analytics.weakestCategory,
    recommendedFocus,
  };
}

export const weeklyReportService = { fetchWeeklyReport };
