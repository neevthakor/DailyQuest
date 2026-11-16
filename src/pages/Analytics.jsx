import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { progressAnalyticsService } from '../services/progressAnalyticsService';
import { analyzeBehaviorProfile } from '../services/deviceBehaviorService';
import { DomainMasteryBars, LineScoreChart } from '../components/Charts';

export default function Analytics({ data, onNavigate }) {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [behavior] = useState(() => analyzeBehaviorProfile());

  useEffect(() => {
    if (!user) return;
    progressAnalyticsService.fetchProgressAnalytics(user.id, { windowDays: 30 })
      .then(setStats)
      .catch(() => {});
  }, [user]);

  const localDuels = Array.isArray(data?.duel?.history) ? data.duel.history.slice(-10) : [];
  const duelSeries = localDuels.map((d, i) => ({ label: `#${i + 1}`, score: d.score || 0 }));

  return (
    <div>
      <div className="page-title">Cognitive Analytics</div>
      <div className="page-subtitle">Real-time brain domain scores, focus stability & duel curves</div>

      <div className="stat-row">
        <div className="stat-pill">
          <div className="stat-pill-value">{behavior.focusStability}%</div>
          <div className="stat-pill-label">Focus Score</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{behavior.strongestDomain}</div>
          <div className="stat-pill-label">Strongest</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{behavior.weakestDomain}</div>
          <div className="stat-pill-label">Train Next</div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">📈 Recent Duel Score Trend</div>
        <LineScoreChart data={duelSeries} valueKey="score" labelKey="label" color="#3b82f6" />
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">🧠 6-Domain Brain Profile</div>
        <DomainMasteryBars domains={behavior.domainBreakdown} />
      </div>

      {stats && (
        <div className="card mb-16">
          <div className="section-title mb-16">Cloud 30-Day Summary</div>
          <div className="duel-sub">Quest completion: {stats.completionRate}% ({stats.completedQuests}/{stats.totalQuests})</div>
          <div className="duel-sub">Total duels: {stats.duelCount} ({stats.duelImprovement >= 0 ? '+' : ''}{stats.duelImprovement} pts)</div>
        </div>
      )}

      {onNavigate && (
        <button className="btn btn-secondary btn-full" onClick={() => onNavigate('weekly-report')}>
          View Full 7-Day Weekly Report →
        </button>
      )}
    </div>
  );
}
