import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PremiumGate from '../components/PremiumGate';
import { progressAnalyticsService } from '../services/progressAnalyticsService';

function AnalyticsBody() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setStats(await progressAnalyticsService.fetchProgressAnalytics(user.id, { windowDays: 30 }));
      } catch (e) {
        setError(e.message || 'Could not load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="page-subtitle">Crunching your last 30 days...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!stats) return null;

  return (
    <div>
      <div className="card mb-16">
        <div className="section-title mb-16">Last 30 days</div>
        <div className="duel-sub">Completion rate: {stats.completionRate}% ({stats.completedQuests}/{stats.totalQuests} quests)</div>
        <div className="duel-sub">Daily Duel attempts: {stats.duelCount}</div>
        <div className="duel-sub">Duel improvement: {stats.duelImprovement >= 0 ? '+' : ''}{stats.duelImprovement} points</div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Category performance</div>
        {stats.categoryPerformance.length === 0 && <div className="empty-state">Not enough data yet.</div>}
        {stats.categoryPerformance.map((c) => (
          <div key={c.category} className="mb-16">
            <div className="inline-edit-row">
              <div>{c.category}</div>
              <div>{c.rate}%</div>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${c.rate}%` }} />
            </div>
          </div>
        ))}
      </div>

      {stats.strongestCategory && (
        <div className="card mb-16">
          <div className="section-title mb-16">Strongest / weakest</div>
          <div className="duel-sub">Strongest: {stats.strongestCategory.category} ({stats.strongestCategory.rate}%)</div>
          {stats.weakestCategory && (
            <div className="duel-sub">Weakest: {stats.weakestCategory.category} ({stats.weakestCategory.rate}%)</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Analytics({ onNavigate }) {
  return (
    <div>
      <div className="page-title">Advanced Analytics</div>
      <div className="page-subtitle">Trends across quests, categories, and duels</div>
      <PremiumGate onNavigate={onNavigate}>
        <AnalyticsBody />
      </PremiumGate>
    </div>
  );
}
