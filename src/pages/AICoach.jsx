import { useEffect, useState } from 'react';
import {
  answerAICoachQuestion,
  generateAICoachPlan,
  GOAL_TRACKS,
  loadAIPreferences,
  saveAIPreferences,
} from '../services/aiCoachService';
import {
  collectDeviceSnapshot,
  setTelemetryConsent,
} from '../services/deviceBehaviorService';

export default function AICoach({ onNavigate, showToast }) {
  const [prefs, setPrefs] = useState(() => loadAIPreferences());
  const [plan, setPlan] = useState(() => generateAICoachPlan());
  const [scanning, setScanning] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      role: 'ai',
      text: 'Hi! I analyze your device focus patterns, duel scores, and personal goals to build your daily brain training plan. Ask me anything or update your preferences below.',
    },
  ]);

  const refreshPlan = () => {
    setPlan(generateAICoachPlan());
  };

  useEffect(() => {
    if (plan.behavior.consentGranted && !plan.behavior.deviceSnapshot) {
      collectDeviceSnapshot().then(refreshPlan);
    }
  }, []);

  const handleToggleConsent = async () => {
    const next = !plan.behavior.consentGranted;
    setTelemetryConsent(next);
    if (next) {
      setScanning(true);
      await collectDeviceSnapshot();
      setScanning(false);
      showToast?.('Device & behavior analyzer enabled!');
    } else {
      showToast?.('Device telemetry paused.');
    }
    refreshPlan();
  };

  const handleScanDevice = async () => {
    setScanning(true);
    await collectDeviceSnapshot();
    setScanning(false);
    refreshPlan();
    showToast?.('Device & behavior snapshot updated!');
  };

  const handleSavePrefs = (e) => {
    e.preventDefault();
    const saved = saveAIPreferences({ ...prefs, completedInterview: true });
    setPrefs(saved);
    refreshPlan();
    showToast?.('AI training plan updated to your goals!');
  };

  const handleAsk = (e) => {
    e.preventDefault();
    const q = question.trim();
    if (!q) return;
    const reply = answerAICoachQuestion(q);
    setChatHistory((prev) => [...prev, { role: 'user', text: q }, { role: 'ai', text: reply }]);
    setQuestion('');
  };

  const { behavior, recommendedGames, tasks, summary } = plan;
  const snap = behavior.deviceSnapshot;

  return (
    <div>
      <div className="page-title">AI Brain Coach & Behavior Lab</div>
      <div className="page-subtitle">
        Adaptive training powered by your goals and live device behavior
      </div>

      {/* DEVICE & BEHAVIOR TELEMETRY */}
      <div className="card mb-16" style={{ borderColor: behavior.consentGranted ? 'var(--success)' : 'var(--border)' }}>
        <div className="section-header" style={{ marginBottom: 8 }}>
          <span className="section-title">📱 Device & Behavior Analyzer</span>
          <button
            className={`btn ${behavior.consentGranted ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleToggleConsent}
          >
            {behavior.consentGranted ? 'Active (Pause)' : 'Allow Access'}
          </button>
        </div>

        <div className="duel-sub mb-16">
          Analyzes tab-switching distractions, peak cognitive hours, session fatigue, and device specs locally to tailor your games & tasks.
        </div>

        {behavior.consentGranted ? (
          <>
            <div className="stat-row">
              <div className="stat-pill">
                <div className="stat-pill-value">{behavior.focusStability}%</div>
                <div className="stat-pill-label">Focus Stability</div>
              </div>
              <div className="stat-pill">
                <div className="stat-pill-value">{behavior.weakestDomain}</div>
                <div className="stat-pill-label">Growth Domain</div>
              </div>
              <div className="stat-pill">
                <div className="stat-pill-value">{behavior.peakHour !== null ? `${behavior.peakHour}:00` : '--'}</div>
                <div className="stat-pill-label">Peak Hour</div>
              </div>
            </div>

            <div className="duel-sub mb-16">
              Fatigue Risk: <strong>{behavior.fatigueRisk}</strong> · Focus Mins: <strong>{behavior.totalFocusMins}m</strong> · Distractions: <strong>{behavior.totalDistractions}</strong>
              {snap && (
                <div style={{ marginTop: 4 }}>
                  Device: {snap.platform} ({snap.screen})
                  {snap.cpuCores ? ` · ${snap.cpuCores} Cores` : ''}
                  {snap.battery ? ` · 🔋 ${snap.battery.levelPct}%${snap.battery.charging ? '⚡' : ''}` : ''}
                  {snap.networkType ? ` · 📶 ${snap.networkType}` : ''}
                </div>
              )}
            </div>

            <button className="btn btn-secondary btn-full" onClick={handleScanDevice} disabled={scanning}>
              {scanning ? 'Scanning...' : '🔄 Refresh Device & Behavior Scan'}
            </button>
          </>
        ) : (
          <div className="empty-state">
            Enable Device & Behavior Access above to unlock real-time distraction & circadian focus analysis.
          </div>
        )}
      </div>

      {/* AI GOAL & PREFERENCE INTERVIEW */}
      <form className="card mb-16" onSubmit={handleSavePrefs}>
        <div className="section-title mb-16">🎯 Your AI Training Preferences</div>

        <div className="duel-sub mb-16">What is your main cognitive/life goal right now?</div>
        <div className="goal-track-grid mb-16">
          {GOAL_TRACKS.map((g) => (
            <button
              key={g.id}
              type="button"
              className={`goal-track-btn ${prefs.primaryGoal === g.id ? 'active' : ''}`}
              onClick={() => setPrefs({ ...prefs, primaryGoal: g.id })}
            >
              <span>{g.icon}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>

        <input
          className="input-field mb-16"
          placeholder="Specific goal (e.g. Crack GATE/placements, faster mental math...)"
          value={prefs.customGoalText}
          onChange={(e) => setPrefs({ ...prefs, customGoalText: e.target.value })}
        />

        <div className="inline-edit-row mb-16">
          <select
            className="input-field"
            value={prefs.dailyMinutes}
            onChange={(e) => setPrefs({ ...prefs, dailyMinutes: Number(e.target.value) })}
          >
            <option value={15}>15 min / day</option>
            <option value={30}>30 min / day</option>
            <option value={45}>45 min / day</option>
            <option value={60}>60+ min / day</option>
          </select>

          <select
            className="input-field"
            value={prefs.preferredDifficulty}
            onChange={(e) => setPrefs({ ...prefs, preferredDifficulty: e.target.value })}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Genius">Genius</option>
          </select>
        </div>

        <button className="btn btn-primary btn-full" type="submit">
          Save Preferences & Regenerate AI Plan
        </button>
      </form>

      {/* AI DAILY PRESCRIPTION */}
      <div className="card mb-16">
        <div className="section-title mb-16">🧬 Today's AI Brain Prescription</div>
        <ul className="benefit-list mb-16">
          {summary.map((line, i) => (
            <li key={i} className="benefit-item">
              <span className="benefit-check">✦</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className="duel-sub" style={{ fontWeight: 700, marginBottom: 8 }}>Recommended Brain Games:</div>
        {recommendedGames.map((g) => (
          <div key={g.id} className="quest-card" style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => onNavigate('duel')}>
            <div className="quest-icon" style={{ width: 36, height: 36, fontSize: '1.2rem' }}>{g.icon}</div>
            <div className="quest-body">
              <div className="quest-title" style={{ fontSize: '0.9rem' }}>{g.name}</div>
              <div className="duel-sub">{g.category} · {g.description}</div>
            </div>
            <span className="tag tag-reward">Train →</span>
          </div>
        ))}

        <div className="duel-sub" style={{ fontWeight: 700, marginTop: 14, marginBottom: 8 }}>AI-Assigned Focus Tasks:</div>
        {tasks.map((t) => (
          <div key={t.id} className="card mb-16" style={{ padding: 12 }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div className="duel-sub">{t.reason}</div>
            <div className="quest-meta" style={{ marginTop: 6 }}>
              <span className="tag tag-reward">+{t.goldReward} 🪙</span>
              <span className="tag">⏱ {t.targetMinutes}m</span>
            </div>
          </div>
        ))}
        <button className="btn btn-accent btn-full" onClick={() => onNavigate('todos')}>
          Start Live Task Timer in My Tasks →
        </button>
      </div>

      {/* INTERACTIVE AI COACH CHAT */}
      <div className="card">
        <div className="section-title mb-16">💬 Ask Your AI Coach</div>
        <div className="coach-chat-box mb-16">
          {chatHistory.map((m, i) => (
            <div key={i} className={`coach-msg ${m.role}`}>
              {m.text}
            </div>
          ))}
        </div>
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input-field"
            placeholder="Ask: What is my weak spot? How to earn Gold?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Ask</button>
        </form>
      </div>
    </div>
  );
}
