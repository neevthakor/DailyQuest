import { useState } from 'react';
import { getToday } from '../utils/date';
import { getDailyDuelChallenge, hasPlayedDuelToday } from '../services/duelService';
import { DUEL_CHALLENGES } from '../data/duels';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
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
  const today = getToday();
  const alreadyPlayed = hasPlayedDuelToday(data, today);
  const challenge = getDailyDuelChallenge(today);

  if (alreadyPlayed && !result) {
    return (
      <div>
        <div className="page-title">Daily Duel</div>
        <div className="page-subtitle">Come back tomorrow for a new challenge!</div>
        <div className="duel-result-card">
          <div className="duel-game-title">✅ Already played today</div>
          <div className="duel-result-score">{data.duel.bestScore}</div>
          <div className="duel-game-desc">Best Score</div>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <div className="page-title">Daily Duel — Result</div>
        <div className="duel-result-card">
          <div className="duel-game-title">{result.gameName}</div>
          <div className="duel-result-score">{result.score}</div>
          <div className="duel-game-desc">Your Score</div>
          {result.firstTime && (
            <div className="duel-rewards">
              <span className="duel-reward xp">+{result.xpEarned} XP</span>
              <span className="duel-reward coins">+{result.coinsEarned} 🪙</span>
            </div>
          )}
          <div className="duel-game-desc" style={{ marginTop: '12px' }}>
            Best: {data.duel.bestScore}
          </div>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
      <div>
        <div className="page-title">Daily Duel</div>
        <div className="page-subtitle">A random challenge awaits!</div>
        <div className="duel-card" onClick={() => setStarted(true)}>
          <div className="duel-icon">⚔️</div>
          <div className="duel-title">Start Today's Duel</div>
          <div className="duel-sub">Earn +{DUEL_XP_REWARD} XP & {DUEL_COIN_REWARD} coins for completing</div>
        </div>
        <div className="card">
          <div className="section-title mb-16">Possible Challenges:</div>
          {DUEL_CHALLENGES.map((g) => (
            <div key={g.id} className="benefit-item">
              <span style={{ fontSize: '1.2rem' }}>🎮</span>
              <span>{g.name}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const GameComponent = GAME_COMPONENTS[challenge.id] || ReactionTest;
  return (
      <div>
        <div className="page-title">Daily Duel</div>
        <div className="page-subtitle">{challenge.name}</div>
        <GameComponent
          onFinish={async (score) => {
            setSaving(true);
            const res = await onFinishDuel(score, challenge.id);
            setSaving(false);
            setResult({ score, gameName: challenge.name, ...res });
          }}
        />
        {saving && <div className="page-subtitle text-center mt-16">Saving official result...</div>}
      </div>
    );
}
