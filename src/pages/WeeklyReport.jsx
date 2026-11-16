import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { weeklyReportService } from '../services/weeklyReportService';
import { BarTrendChart, DomainMasteryBars, LineScoreChart } from '../components/Charts';

export default function WeeklyReport({ data, onNavigate }) {
  const { user } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setReport(await weeklyReportService.fetchWeeklyReport(user?.id || null, data));
      } catch (e) {
        setError(e.message || 'Could not load your weekly report.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, data]);

  return (
    <div>
      <div className="page-title">Weekly Brain & Focus Report</div>
      <div className="page-subtitle">Real performance graphs tailored to your activity</div>

      {loading && <div className="page-subtitle">Analyzing your last 7 days...</div>}
      {error && <div className="form-error">{error}</div>}

      {report && (
        <>
          <div className="stat-row">
            <div className="stat-pill">
              <div className="stat-pill-value">{report.activeDays}/7</div>
              <div className="stat-pill-label">Active Days</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{report.totalFocusMins}m</div>
              <div className="stat-pill-label">Focus Time</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{report.focusStability}%</div>
              <div className="stat-pill-label">Focus Stability</div>
            </div>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">⏱ Daily Focused Minutes (Last 7 Days)</div>
            <BarTrendChart data={report.dailyFocusSeries} valueKey="value" labelKey="label" color="#3b82f6" />
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">⚔️ Daily Duel Score Progression</div>
            <LineScoreChart data={report.dailyDuelSeries} valueKey="score" labelKey="label" color="#f59e0b" />
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">🧠 Cognitive Domain Mastery</div>
            <DomainMasteryBars domains={report.domainBreakdown} />
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">🔍 Personalized Insights</div>
            <ul className="benefit-list">
              {report.insights.map((ins, i) => (
                <li key={i} className="benefit-item">
                  <span className="benefit-check">✦</span>
                  <span>{ins}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">🎯 Next Week AI Prescription</div>
            <div className="duel-sub" style={{ color: 'var(--text)' }}>{report.recommendedFocus}</div>
            {onNavigate && (
              <button className="btn btn-primary btn-full mt-16" onClick={() => onNavigate('ai-coach')}>
                Open AI Coach & Adjust Plan →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
