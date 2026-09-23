import { useEffect, useState } from 'react';
import { getToday } from '../utils/date';
import {
  getDailyDuelChallenge,
  hasPlayedDuelToday,
  getDuelDifficulty,
} from '../services/duelService';
import { calculateLevel } from '../utils/xp';
import { DUEL_CHALLENGES } from '../data/duels';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import {
  fetchDuelRetryStatus,
  submitDuelRetry,
} from '../services/duelRetryService';
import { usePremium } from '../hooks/usePremium';

import ReactionTest from '../components/duel/ReactionTest';
import NumberChallenge from '../components/duel/NumberChallenge';
import MemoryChallenge from '../components/duel/MemoryChallenge';
import PatternChallenge from '../components/duel/PatternChallenge';

const GAME_COMPONENTS = {
  reaction: ReactionTest,
  number: NumberChallenge,
  memory: MemoryChallenge,
  pattern: PatternChallenge,
};

export default function DailyDuel({ data, onFinishDuel }) {
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const [retryStatus, setRetryStatus] = useState(null);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryError, setRetryError] = useState('');

  const [isRetryAttempt, setIsRetryAttempt] = useState(false);

  const today = getToday();
  const challenge = getDailyDuelChallenge(today);

  const { isPremium } = usePremium();

  const alreadyPlayed = hasPlayedDuelToday(data, today);
  const userLevelInfo = calculateLevel(data.profile.xp);
  const difficulty = getDuelDifficulty(userLevelInfo.level);

  // Load server-side retry entitlement.
  useEffect(() => {
    let cancelled = false;

    async function loadRetryStatus() {
      try {
        const status = await fetchDuelRetryStatus(today);

        if (!cancelled) {
          setRetryStatus(status);
        }
      } catch (error) {
        console.error('Failed to load duel retry status:', error);

        if (!cancelled) {
          setRetryStatus(null);
        }
      }
    }

    loadRetryStatus();

    return () => {
      cancelled = true;
    };
  }, [today]);

  /*
   * A retry is available only when:
   * - the user is Premium
   * - today's duel has already been played
   * - the server says the retry has not been used
   */
  const retryAvailable =
    !!isPremium &&
    !!retryStatus?.hasPlayedToday &&
    !!retryStatus?.retryAvailable &&
    !retryStatus?.retryUsed;

  const handleRetry = async () => {
    if (!retryAvailable || retryLoading) return;

    setRetryLoading(true);
    setRetryError('');

    try {
      /*
       * Start a completely new attempt.
       *
       * The actual score is submitted after the mini-game finishes.
       */
      setIsRetryAttempt(true);
      setResult(null);
      setStarted(true);
    } catch (error) {
      console.error('Failed to start duel retry:', error);
      setRetryError(error?.message || 'Unable to start retry.');
    } finally {
      setRetryLoading(false);
    }
  };

  const handleNormalFinish = async (score) => {
    setSaving(true);
    setRetryError('');

    try {
      const res = await onFinishDuel(score, challenge.id);

      setResult({
        score,
        gameName: challenge.name,
        ...res,
        isRetry: false,
      });
    } catch (error) {
      console.error('Failed to save duel result:', error);
      setRetryError(error?.message || 'Failed to save duel result.');
    } finally {
      setSaving(false);
    }
  };

  const handleRetryFinish = async (score) => {
    setSaving(true);
    setRetryError('');

    try {
      /*
       * IMPORTANT:
       * This RPC is the authoritative Premium retry operation.
       *
       * It independently checks:
       * - Premium entitlement
       * - original duel attempt
       * - whether retry was already consumed
       */
      const retryResult = await submitDuelRetry(
        challenge.id,
        score,
        null
      );

      setResult({
        score,
        gameName: challenge.name,
        xpEarned: retryResult?.xp_earned || 0,
        coinsEarned: retryResult?.coins_earned || 0,
        firstTime: false,
        isRetry: true,
      });

      setRetryStatus((previous) => ({
        ...(previous || {}),
        retryUsed: true,
        retryAvailable: false,
      }));

      setIsRetryAttempt(false);
    } catch (error) {
      console.error('Failed to submit duel retry:', error);
      setRetryError(
        error?.message || 'Unable to submit your Premium retry.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * If the user has already played and has not started a retry,
   * show the normal "already played" screen.
   */
  if (alreadyPlayed && !result && !isRetryAttempt) {
    return (
      <div>
        <div className="page-title">Daily Duel</div>

        <div className="page-subtitle">
          Come back tomorrow for a new challenge!
        </div>

        <div className="duel-result-card">
          <div className="duel-game-title">
            ✅ Already played today
          </div>

          <div className="duel-result-score">
            {data.duel.bestScore}
          </div>

          <div className="duel-game-desc">
            Best Score
          </div>

          {retryAvailable && (
            <div style={{ marginTop: '20px' }}>
              <div className="duel-game-desc">
                Premium benefit: one extra attempt is available today.
              </div>

              <button
                className="btn btn-primary btn-full"
                style={{ marginTop: '12px' }}
                onClick={handleRetry}
                disabled={retryLoading}
              >
                {retryLoading
                  ? 'Starting retry...'
                  : '⭐ Use Premium Retry'}
              </button>
            </div>
          )}

          {retryError && (
            <div className="form-error mt-16">
              {retryError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div className="page-title">
          Daily Duel — Result
        </div>

        <div className="duel-result-card">
          <div className="duel-game-title">
            {result.gameName}
          </div>

          <div className="duel-result-score">
            {result.score}
          </div>

          <div className="duel-game-desc">
            Your Score
          </div>

          {result.firstTime && (
            <div className="duel-rewards">
              <span className="duel-reward xp">
                +{result.xpEarned} XP
              </span>

              <span className="duel-reward coins">
                +{result.coinsEarned} 🪙
              </span>
            </div>
          )}

          {result.isRetry && (
            <div className="duel-rewards">
              <span className="duel-reward xp">
                +{result.xpEarned} XP
              </span>

              <span className="duel-reward coins">
                +{result.coinsEarned} 🪙
              </span>
            </div>
          )}

          <div
            className="duel-game-desc"
            style={{ marginTop: '12px' }}
          >
            Best: {data.duel.bestScore}
          </div>

          {result.isRetry && (
            <div
              className="duel-game-desc"
              style={{ marginTop: '8px' }}
            >
              Premium retry used for today.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div>
        <div className="page-title">
          Daily Duel
        </div>

        <div className="page-subtitle">
          A random challenge awaits!
        </div>

        <div
          className="duel-card"
          onClick={() => setStarted(true)}
        >
          <div className="duel-icon">
            ⚔️
          </div>

          <div className="duel-title">
            Start Today's Duel
          </div>

          <div className="duel-sub">
            Earn +{DUEL_XP_REWARD} XP & {DUEL_COIN_REWARD} coins
            for completing
          </div>
        </div>

        <div className="card">
          <div className="section-title mb-16">
            Possible Challenges:
          </div>

          {DUEL_CHALLENGES.map((g) => (
            <div
              key={g.id}
              className="benefit-item"
            >
              <span style={{ fontSize: '1.2rem' }}>
                🎮
              </span>

              <span>
                {g.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const GameComponent =
    GAME_COMPONENTS[challenge.id] || ReactionTest;

  return (
    <div>
      <div className="page-title">
        Daily Duel
      </div>

      <div className="page-subtitle">
        {challenge.name}
        {isRetryAttempt && ' — Premium Retry'}
      </div>

      <GameComponent
        difficulty={difficulty}
        onFinish={
          isRetryAttempt
            ? handleRetryFinish
            : handleNormalFinish
        }
      />

      {saving && (
        <div className="page-subtitle text-center mt-16">
          Saving official result...
        </div>
      )}

      {retryError && (
        <div className="form-error mt-16">
          {retryError}
        </div>
      )}
    </div>
  );
}