import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { weeklyReportService } from '../services/weeklyReportService';
import { BarTrendChart, DomainMasteryBars, LineScoreChart } from '../components/Charts';
import { getRankTitle } from '../services/rpgService';

export default function WeeklyReport({ data, onNavigate, showToast }) {
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

  const handleDownloadCard = () => {
    if (!report) return;
    const rank = getRankTitle(data?.profile?.xp || 0);
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 420;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 720, 420);
    grad.addColorStop(0, '#09090b');
    grad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 720, 420);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 684, 384);

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('DAILYQUEST · WEEKLY BRAIN CARD', 44, 68);

    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 34px sans-serif';
    ctx.fillText(`${data?.profile?.username || 'Player'} · ${rank.badge} ${rank.title}`, 44, 122);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '20px sans-serif';
    ctx.fillText(`Active Days: ${report.activeDays}/7   |   Focus Time: ${report.totalFocusMins}m   |   Stability: ${report.focusStability}%`, 44, 178);

    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`Strongest Domain: ${report.strongestDomain}   ·   Growth Target: ${report.weakestDomain}`, 44, 238);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`Avg Duel Score: ${report.avgDuelScore} pts   ·   Duels Played: ${report.duelCount}`, 44, 290);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = '16px sans-serif';
    ctx.fillText('Train your mind at DailyQuest · github.com/neevthakor/DailyQuest', 44, 366);

    const link = document.createElement('a');
    link.download = `DailyQuest-Brain-Card-${report.endDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast?.('Weekly Brain Card PNG downloaded!');
  };

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

          <button className="btn btn-accent btn-full mb-16" onClick={handleDownloadCard}>
            📸 Share Weekly Brain Card (Download PNG)
          </button>

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
