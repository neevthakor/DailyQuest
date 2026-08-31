import { fetchProgressAnalytics } from './progressAnalyticsService';

/**
 * Weekly Personal Report (Premium). Built entirely on top of
 * progressAnalyticsService's 7-day window — no new tables. Kept as a
 * distinct service (rather than folded into progressAnalyticsService)
 * because it has a different shape (a narrative summary object for a
 * single card/page) and is a natural place to later add a
 * scheduled/emailed version.
 */
export async function fetchWeeklyReport(userId) {
  const analytics = await fetchProgressAnalytics(userId, { windowDays: 7 });

  const activeDays = new Set(analytics.xpTrend.map((d) => d.date)).size;

  const recommendedFocus = analytics.weakestCategory
    ? `Spend a little extra time on ${analytics.weakestCategory.category} this week — it's currently your lowest completion rate at ${analytics.weakestCategory.rate}%.`
    : 'Complete a few more quests this week to start seeing category trends.';

  return {
    windowDays: 7,
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
