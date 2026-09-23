import { supabase, supabaseConfigError } from '../lib/supabase';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

import { toDateString, getToday } from '../utils/date';

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
}

/**
 * Advanced Analytics (Premium). Reads from tables the app already owns —
 * daily_quests, quest_completions, duel_scores — and reduces them
 * client-side. No new tables were needed for this feature; entitlement is
 * enforced by the caller checking usePremium()/PremiumGate before showing
 * the Analytics page (the underlying SELECTs are owner-scoped by existing
 * RLS regardless, so a non-Premium user reading their own quest history
 * isn't a security issue — it's just not surfaced in the UI for them).
 */
export async function fetchProgressAnalytics(userId, { windowDays = 30, sinceDate, untilDate } = {}) {
  const client = requireClient();
  const since = sinceDate || daysAgo(windowDays);
  const until = untilDate || getToday();

  const [{ data: quests, error: qErr }, { data: duels, error: dErr }] = await Promise.all([
    client
      .from('daily_quests')
      .select('quest_date, category, completed, xp_reward')
      .eq('user_id', userId)
      .gte('quest_date', since)
      .lte('quest_date', until),
    client
      .from('duel_scores')
      .select('duel_date, score, challenge_type')
      .eq('user_id', userId)
      .gte('duel_date', since)
      .lte('duel_date', until)
      .order('duel_date', { ascending: true }),
  ]);

  if (qErr) throw qErr;
  if (dErr) throw dErr;

  const questRows = quests || [];
  const duelRows = duels || [];

  const totalQuests = questRows.length;
  const completedQuests = questRows.filter((q) => q.completed).length;
  const completionRate = totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0;

  const byCategory = {};
  for (const q of questRows) {
    const cat = q.category || 'Other';
    if (!byCategory[cat]) byCategory[cat] = { total: 0, completed: 0 };
    byCategory[cat].total += 1;
    if (q.completed) byCategory[cat].completed += 1;
  }
  const categoryPerformance = Object.entries(byCategory).map(([category, stats]) => ({
    category,
    total: stats.total,
    completed: stats.completed,
    rate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
  }));
  categoryPerformance.sort((a, b) => b.rate - a.rate);

  const strongestCategory = categoryPerformance[0] || null;
  const weakestCategory = categoryPerformance[categoryPerformance.length - 1] || null;

  const xpTrend = {};
  for (const q of questRows) {
    if (!q.completed) continue;
    xpTrend[q.quest_date] = (xpTrend[q.quest_date] || 0) + Math.max(0, Number(q.xp_reward) || 0);
  }

  const duelImprovement = duelRows.length >= 2
    ? duelRows[duelRows.length - 1].score - duelRows[0].score
    : 0;

  return {
    windowDays,
    completionRate,
    totalQuests,
    completedQuests,
    categoryPerformance,
    strongestCategory,
    weakestCategory,
    xpTrend: Object.entries(xpTrend)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, xp]) => ({ date, xp })),
    streakHistory: duelRows.map((d) => ({ date: d.duel_date, score: d.score })),
    duelImprovement,
    duelCount: duelRows.length,
  };
}

export const progressAnalyticsService = { fetchProgressAnalytics };
