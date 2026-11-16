import { useEffect, useState } from 'react';
import { getToday } from '../utils/date';
import {
  getDuelDifficulty,
  getTodayDuelProgress,
  TRIFECTA_BONUS_GOLD,
} from '../services/duelService';
import { calculateLevel } from '../utils/xp';
import { COGNITIVE_DOMAINS, DUEL_CHALLENGES } from '../data/duels';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import {
  fetchDuelRetryStatus,
  submitDuelRetry,
} from '../services/duelRetryService';
import { usePremium } from '../hooks/usePremium';
import BrainGameEngine from '../components/duel/BrainGameEngine';

export default function DailyDuel({ data, onFinishDuel, onNavigate }) {
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [customDifficulty, setCustomDifficulty] = useState(null);
  const [domainFilter, setDomainFilter] = useState('All');
  const [tab, setTab] = useState('daily'); // 'daily' | 'arcade'
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const [retryStatus, setRetryStatus] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');
  const [isRetryAttempt, setIsRetryAttempt] = useState(false);

  const today = getToday();
  const { dailySet, completedIds, completedSlots, allThreeDone } = getTodayDuelProgress(data, today);
  const { isPremium } = usePremium();

  const userLevelInfo = calculateLevel(data.profile.xp);
  const baseDifficulty = getDuelDifficulty(userLevelInfo.level);
  const difficulty = customDifficulty || baseDifficulty;

  useEffect(() => {
    let cancelled = false;
    async function loadRetryStatus() {
      try {
        const status = await fetchDuelRetryStatus(today);
        if (!cancelled) setRetryStatus(status);
      } catch {
        if (!cancelled) setRetryStatus(null);
      }
    }
    loadRetryStatus();
    return () => {
      cancelled = true;
    };
  }, [today]);

  const retryAvailable =
    !!isPremium &&
    !!retryStatus?.hasPlayedToday &&
    !!retryStatus?.retryAvailable &&
    !retryStatus?.retryUsed;

  const startPuzzle = (challenge, practice = false) => {
    setActiveChallenge(challenge);
    setIsPracticeMode(practice);
    setIsRetryAttempt(false);
    setResult(null);
    setRetryError('');
  };

  const handleRetry = () => {
    if (!retryAvailable || retryLoading) return;
    setRetryLoading(true);
    setRetryError('');
    setActiveChallenge(dailySet[0]);
    setIsPracticeMode(false);
    setIsRetryAttempt(true);
    setResult(null);
    setRetryLoading(false);
  };

  const handleFinish = async (score) => {
    if (!activeChallenge) return;
    setSaving(true);
    setRetryError('');
    try {
      if (isRetryAttempt) {
        const retryResult = await submitDuelRetry(activeChallenge.id, score, null);
        setResult({
          score,
          gameName: activeChallenge.name,
          xpEarned: retryResult?.xp_earned || 0,
          coinsEarned: retryResult?.coins_earned || 0,
          firstTime: false,
          isRetry: true,
        });
        setRetryStatus((prev) => ({ ...(prev || {}), retryUsed: true, retryAvailable: false }));
        setIsRetryAttempt(false);
      } else {
        const res = await onFinishDuel(score, activeChallenge.id, { isPractice: isPracticeMode });
        setResult({
          score,
          gameName: activeChallenge.name,
          ...res,
          isRetry: false,
          isPractice: isPracticeMode,
        });
      }
    } catch (err) {
      setRetryError(err?.message || 'Failed to save duel result.');
    } finally {
      setSaving(false);
      setActiveChallenge(null);
    }
  };

  if (activeChallenge) {
    return (
      <div>
        <div className="section-header">
          <div className="page-title" style={{ marginBottom: 0 }}>
            {activeChallenge.icon} {activeChallenge.name}
          </div>
          <button className="btn btn-secondary" onClick={() => setActiveChallenge(null)}>
            Exit
          </button>
        </div>
        <div className="page-subtitle">
          {activeChallenge.category} · Difficulty: <strong>{difficulty}</strong>
          {isPracticeMode ? ' · Arcade Training' : ' · Official Daily Duel'}
          {isRetryAttempt && ' · Premium Retry'}
        </div>

        <BrainGameEngine
          gameId={activeChallenge.id}
          difficulty={difficulty}
          onFinish={handleFinish}
        />

        {saving && <div className="page-subtitle text-center mt-16">Saving result...</div>}
        {retryError && <div className="form-error mt-16">{retryError}</div>}
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div className="page-title">Brain Duel — Result</div>
        <div className="duel-result-card">
          <div className="duel-game-title">{result.gameName}</div>
          <div className="post-duel-tally">
            <div className="duel-game-desc">Points Scored</div>
            <div className="tally-points">+{result.score}</div>
          </div>

          <div className="duel-rewards">
            <span className="duel-reward xp">+{result.xpEarned} XP</span>
            <span className="duel-reward coins">+{result.coinsEarned} 🪙</span>
          </div>

          {result.trifectaBonus > 0 && (
            <div className="card mt-16" style={{ borderColor: 'var(--accent)', background: 'rgba(245,158,11,0.12)' }}>
              <strong>🏆 3/3 Daily Trifecta Bonus! +{result.trifectaBonus} Extra Gold!</strong>
            </div>
          )}

          <div className="duel-game-desc" style={{ marginTop: 12 }}>
            Total Duel Points: <strong>{data.profile.totalDuelPoints}</strong> · Best: <strong>{data.profile.bestDuelScore}</strong>
          </div>

          <button className="btn btn-primary btn-full mt-16" onClick={() => setResult(null)}>
            Back to Daily Duels ({completedSlots}/3 Done)
          </button>
        </div>
      </div>
    );
  }

  const filteredGames = DUEL_CHALLENGES.filter((g) => {
    if (domainFilter === 'All') return true;
    if (domainFilter === 'Genius') return g.isGenius;
    return g.category === domainFilter;
  });

  return (
    <div>
      <div className="page-title">Daily Duel & Brain Lab</div>
      <div className="page-subtitle">
        3 Daily Puzzles every day + {DUEL_CHALLENGES.length} Brain Training Games
      </div>

      <div className="leaderboard-tabs mb-16">
        <button
          className={`leaderboard-tab ${tab === 'daily' ? 'active' : ''}`}
          onClick={() => setTab('daily')}
        >
          ⚔️ Today's 3 Duels ({completedSlots}/3)
        </button>
        <button
          className={`leaderboard-tab ${tab === 'arcade' ? 'active' : ''}`}
          onClick={() => setTab('arcade')}
        >
          🧠 32-Game Arcade
        </button>
      </div>

      {tab === 'daily' && (
        <>
          <div className="card mb-16" style={{ borderColor: allThreeDone ? 'var(--success)' : 'var(--accent)' }}>
            <div className="section-header" style={{ marginBottom: 8 }}>
              <span className="section-title">Daily Trifecta Progress</span>
              <span className="tag tag-reward">{completedSlots}/3 Complete</span>
            </div>
            <div className="progress-bar mb-16">
              <div className="progress-bar-fill" style={{ width: `${(completedSlots / 3) * 100}%` }} />
            </div>
            <div className="duel-sub">
              {allThreeDone
                ? `🎉 All 3 daily puzzles cleared! +${TRIFECTA_BONUS_GOLD} Gold Trifecta unlocked!`
                : `Finish all 3 puzzles today to unlock +${TRIFECTA_BONUS_GOLD} bonus Gold!`}
            </div>
          </div>

          {dailySet.map((puzzle) => {
            const done = completedIds.has(puzzle.id);
            return (
              <div key={puzzle.id} className={`card mb-16 ${done ? 'completed' : ''}`}>
                <div className="inline-edit-row" style={{ justifyContent: 'space-between' }}>
                  <div>
                    <div className="duel-sub" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      {puzzle.slotLabel} {puzzle.isGenius ? '· GENIUS' : ''}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: 2 }}>
                      {puzzle.icon} {puzzle.name}
                    </div>
                    <div className="duel-sub">{puzzle.description}</div>
                    <div className="quest-meta" style={{ marginTop: 6 }}>
                      <span className="tag tag-reward">+{DUEL_XP_REWARD} XP</span>
                      <span className="tag tag-reward">+{DUEL_COIN_REWARD} 🪙</span>
                      <span className="tag">{puzzle.category}</span>
                    </div>
                  </div>
                  <button
                    className={`btn ${done ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={done}
                    onClick={() => startPuzzle(puzzle, false)}
                  >
                    {done ? '✓ Done' : 'Play'}
                  </button>
                </div>
              </div>
            );
          })}

          {retryAvailable && (
            <button
              className="btn btn-accent btn-full mb-16"
              onClick={handleRetry}
              disabled={retryLoading}
            >
              ⭐ Use Premium Extra Retry
            </button>
          )}

          {onNavigate && (
            <div className="card mb-16" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.18), rgba(59,130,246,0.12))' }}>
              <div className="inline-edit-row" style={{ justifyContent: 'space-between' }}>
                <div>
                  <div className="section-title">⚔️ Multiplayer Brain Arena</div>
                  <div className="duel-sub">Challenge friends or AI rivals & wager Gold!</div>
                </div>
                <button className="btn btn-primary" onClick={() => onNavigate('multiplayer')}>
                  Enter Arena
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'arcade' && (
        <>
          <div className="card mb-16">
            <div className="inline-edit-row" style={{ justifyContent: 'space-between' }}>
              <span className="section-title">Difficulty Mode</span>
              <select
                className="input-field"
                style={{ width: 'auto', padding: '6px 12px' }}
                value={difficulty}
                onChange={(e) => setCustomDifficulty(e.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
                <option value="Genius">Genius (High Level)</option>
              </select>
            </div>
          </div>

          <div className="chip-scroll mb-16">
            {['All', 'Genius', ...COGNITIVE_DOMAINS].map((cat) => (
              <button
                key={cat}
                className={`chip-btn ${domainFilter === cat ? 'active' : ''}`}
                onClick={() => setDomainFilter(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="arcade-grid">
            {filteredGames.map((g) => (
              <div key={g.id} className="card arcade-card" onClick={() => startPuzzle(g, true)}>
                <div className="arcade-icon">{g.icon}</div>
                <div className="arcade-title">{g.name}</div>
                <div className="duel-sub">{g.category} {g.isGenius ? '· ⭐ Genius' : ''}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}