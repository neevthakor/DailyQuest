import { useEffect, useState } from 'react';
import {
  completeFocusSession,
  computeElapsedSeconds,
  FOCUS_PRESETS,
  loadActiveTimer,
  loadFocusHistory,
  saveActiveTimer,
} from '../services/deepWorkService';
import {
  getActiveSoundscape,
  playSoundscape,
  SOUNDSCAPES,
  stopSoundscape,
} from '../services/soundscapeService';

function formatMMSS(totalSec) {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export default function DeepWork({ onAdjustGold, showToast }) {
  const [presetId, setPresetId] = useState('pomodoro_25_5');
  const [customMinutes, setCustomMinutes] = useState(25);
  const [intention, setIntention] = useState('');
  const [reflection, setReflection] = useState('');
  const [timerState, setTimerState] = useState(() => loadActiveTimer());
  const [elapsedSec, setElapsedSec] = useState(() => computeElapsedSeconds(loadActiveTimer()));
  const [distractions, setDistractions] = useState(0);
  const [zenMode, setZenMode] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [history, setHistory] = useState(() => loadFocusHistory());
  const [activeAudio, setActiveAudio] = useState(() => getActiveSoundscape());

  const preset = FOCUS_PRESETS.find((p) => p.id === presetId) || FOCUS_PRESETS[0];
  const targetSec = (presetId === 'custom' ? Math.max(5, Number(customMinutes) || 25) : preset.workMinutes) * 60;

  useEffect(() => {
    if (!timerState) return;
    const tick = () => {
      const current = computeElapsedSeconds(timerState, Date.now());
      setElapsedSec(current);
      if (current >= timerState.targetSec && !showCompleteModal) {
        setShowCompleteModal(true);
      }
    };
    tick();
    const id = setInterval(tick, 500);

    const onVis = () => {
      if (document.hidden && !timerState.isPaused) {
        setDistractions((d) => d + 1);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [timerState, showCompleteModal]);

  const handleStart = () => {
    const cleanIntention = intention.trim() || `${preset.label} Focus Block`;
    const next = {
      mode: presetId,
      intention: cleanIntention,
      targetSec,
      startedAtMs: Date.now(),
      accumulatedSec: 0,
      isPaused: false,
    };
    saveActiveTimer(next);
    setTimerState(next);
    setElapsedSec(0);
    setDistractions(0);
    setShowCompleteModal(false);
  };

  const handlePauseResume = () => {
    if (!timerState) return;
    if (timerState.isPaused) {
      const resumed = { ...timerState, startedAtMs: Date.now(), isPaused: false };
      saveActiveTimer(resumed);
      setTimerState(resumed);
    } else {
      const acc = computeElapsedSeconds(timerState, Date.now());
      const paused = { ...timerState, accumulatedSec: acc, isPaused: true };
      saveActiveTimer(paused);
      setTimerState(paused);
      setElapsedSec(acc);
    }
  };

  const handleFinishSession = (e) => {
    e?.preventDefault();
    if (!timerState) return;
    const finalElapsed = Math.max(60, computeElapsedSeconds(timerState, Date.now()));
    const res = completeFocusSession({
      mode: timerState.mode,
      intention: timerState.intention,
      reflection,
      durationSec: finalElapsed,
      targetSec: timerState.targetSec,
      distractions,
    });
    setTimerState(null);
    setElapsedSec(0);
    setReflection('');
    setShowCompleteModal(false);
    setZenMode(false);
    setHistory(loadFocusHistory());
    onAdjustGold?.(res.goldEarned, `Deep Work 2.0: ${res.entry.intention}`);
    showToast?.(`🌊 Deep Work complete (${res.minutes}m)! +${res.goldEarned} 🪙`);
  };

  const remainingSec = Math.max(0, (timerState?.targetSec || targetSec) - elapsedSec);
  const pct = timerState ? Math.min(100, Math.round((elapsedSec / timerState.targetSec) * 100)) : 0;

  return (
    <div className={zenMode ? 'zen-fullscreen' : ''}>
      <div className="section-header">
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Deep Work 2.0</div>
          <div className="page-subtitle" style={{ marginBottom: 0 }}>
            Timestamp-accurate Pomodoro & 52/17 Flow Studio
          </div>
        </div>
        {timerState && (
          <button className="btn btn-secondary" onClick={() => setZenMode((z) => !z)}>
            {zenMode ? 'Exit Zen' : '⛶ Zen Mode'}
          </button>
        )}
      </div>

      {!timerState ? (
        <div className="card mb-16 mt-16">
          <div className="section-title mb-16">1. Choose Focus Protocol</div>
          <div className="goal-track-grid mb-16">
            {FOCUS_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`goal-track-btn ${presetId === p.id ? 'active' : ''}`}
                onClick={() => setPresetId(p.id)}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>

          <div className="section-title mb-16">2. Set Session Intention</div>
          <input
            className="input-field mb-16"
            placeholder="What is the ONE outcome of this session?"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
          />

          <button className="btn btn-primary btn-full" onClick={handleStart}>
            ▶ Start Deep Work Block ({preset.workMinutes} mins)
          </button>
        </div>
      ) : (
        <div className="card mb-16 mt-16" style={{ borderColor: 'var(--accent)', textAlign: 'center' }}>
          <div className="duel-sub" style={{ color: 'var(--accent)', fontWeight: 700 }}>
            INTENTION: {timerState.intention}
          </div>
          <div style={{ fontSize: '3.2rem', fontWeight: 800, margin: '14px 0', color: 'var(--text-bright)' }}>
            {formatMMSS(remainingSec)}
          </div>
          <div className="progress-bar mb-16">
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
          </div>
          <div className="duel-sub mb-16">
            Elapsed: {formatMMSS(elapsedSec)} · Tab switches: <strong>{distractions}</strong>
          </div>

          {!showCompleteModal ? (
            <div className="inline-edit-row">
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handlePauseResume}>
                {timerState.isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setShowCompleteModal(true)}>
                ✓ Complete & Reflect
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  saveActiveTimer(null);
                  setTimerState(null);
                  setZenMode(false);
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <form onSubmit={handleFinishSession} style={{ textAlign: 'left', marginTop: 12 }}>
              <div className="section-title mb-16">Session Reflection</div>
              <input
                className="input-field mb-16"
                placeholder="What did you accomplish or learn in this block?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
              <button className="btn btn-accent btn-full" type="submit">
                Save Session & Claim Gold →
              </button>
            </form>
          )}
        </div>
      )}

      {/* AMBIENT SOUNDSCAPE BAR */}
      <div className="card mb-16">
        <div className="section-title mb-16">🎧 Ambient Focus Soundscapes</div>
        <div className="chip-scroll">
          {SOUNDSCAPES.map((s) => {
            const on = activeAudio === s.id;
            return (
              <button
                key={s.id}
                className={`chip-btn ${on ? 'active' : ''}`}
                onClick={() => {
                  if (on) {
                    stopSoundscape();
                    setActiveAudio(null);
                  } else {
                    playSoundscape(s.id);
                    setActiveAudio(s.id);
                  }
                }}
              >
                {on ? `⏹ ${s.name}` : `▶ ${s.name}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOCUS HISTORY */}
      <div className="card">
        <div className="section-title mb-16">Recent Deep Work Sessions ({history.length})</div>
        {history.length === 0 && <div className="empty-state">No Deep Work sessions logged yet.</div>}
        {history.slice(0, 5).map((h) => (
          <div key={h.id} className="quest-card" style={{ padding: '10px 12px' }}>
            <div className="quest-body">
              <div className="quest-title">{h.intention}</div>
              <div className="duel-sub">
                {Math.max(1, Math.round(h.durationSec / 60))}m · {h.distractions} distractions · {h.date}
                {h.reflection ? ` · "${h.reflection}"` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
