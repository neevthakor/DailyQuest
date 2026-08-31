import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import PremiumGate from '../components/PremiumGate';
import { weeklyReportService } from '../services/weeklyReportService';

function ReportBody() {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setReport(await weeklyReportService.fetchWeeklyReport(user.id));
      } catch (e) {
        setError(e.message || 'Could not load your weekly report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div className="page-subtitle">Building your report...</div>;
  if (error) return <div className="form-error">{error}</div>;
  if (!report) return null;

  return (
    <div>
      <div className="card mb-16">
        <div className="section-title mb-16">This week</div>
        <div className="duel-sub">Active days: {report.activeDays} / 7</div>
        <div className="duel-sub">Quests completed: {report.questsCompleted} ({report.completionRate}%)</div>
        <div className="duel-sub">Daily Duel attempts: {report.duelCount}</div>
      </div>

      {report.strongestCategory && (
        <div className="card mb-16">
          <div className="section-title mb-16">Category improvement</div>
          <div className="duel-sub">Strongest area: {report.strongestCategory.category}</div>
          {report.weakestCategory && <div className="duel-sub">Weakest area: {report.weakestCategory.category}</div>}
        </div>
      )}

      <div className="card">
        <div className="section-title mb-16">Recommended focus for next week</div>
        <div>{report.recommendedFocus}</div>
      </div>
    </div>
  );
}

export default function WeeklyReport({ onNavigate }) {
  return (
    <div>
      <div className="page-title">Weekly Report</div>
      <div className="page-subtitle">Your last 7 days, summarized</div>
      <PremiumGate onNavigate={onNavigate}>
        <ReportBody />
      </PremiumGate>
    </div>
  );
}
