import { useEffect, useMemo, useState } from 'react';
import { DUEL_CHALLENGES } from '../data/duels';
import { createRng, hashString } from '../utils/rng';
import BrainGameEngine from '../components/duel/BrainGameEngine';

const RIVAL_TIERS = [
  { id: 'bronze', name: 'ByteBot (Bronze)', elo: 1050, baseMin: 55, baseMax: 85, difficulty: 'Easy' },
  { id: 'silver', name: 'NexusAI (Silver)', elo: 1320, baseMin: 75, baseMax: 105, difficulty: 'Medium' },
  { id: 'gold', name: 'CortexPro (Gold)', elo: 1640, baseMin: 95, baseMax: 125, difficulty: 'Hard' },
  { id: 'genius', name: 'OmegaMind (Grandmaster)', elo: 2050, baseMin: 110, baseMax: 145, difficulty: 'Genius' },
];

const WAGER_AMOUNTS = [0, 50, 100, 250, 500];

export default function Multiplayer({ data, onAdjustGold, onNavigate, showToast }) {
  const [mode, setMode] = useState('rival'); // 'rival' | 'room'
  const [rivalId, setRivalId] = useState('silver');
  const [wager, setWager] = useState(50);
  const [roomCode, setRoomCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());
  const [joinCode, setJoinCode] = useState('');

  const [matchState, setMatchState] = useState('lobby'); // 'lobby' | 'playing' | 'summary'
  const [roundIdx, setRoundIdx] = useState(0);
  const [myScores, setMyScores] = useState([]);
  const [oppScores, setOppScores] = useState([]);
  const [oppLiveTicker, setOppLiveTicker] = useState(0);

  const coins = data?.profile?.coins || 0;
  const rival = RIVAL_TIERS.find((r) => r.id === rivalId) || RIVAL_TIERS[1];

  const matchGames = useMemo(() => {
    const seed = mode === 'room' ? (joinCode.trim().toUpperCase() || roomCode) : `${Date.now()}-${rivalId}`;
    const rng = createRng(hashString(`mp:${seed}`));
    const pool = [...DUEL_CHALLENGES];
    const picked = [];
    while (picked.length < 3 && pool.length > 0) {
      const idx = Math.floor(rng() * pool.length);
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked;
  }, [matchState === 'playing', mode, roomCode, joinCode, rivalId]);

  useEffect(() => {
    if (matchState !== 'playing') return;
    setOppLiveTicker(0);
    const t = setInterval(() => {
      setOppLiveTicker((prev) => Math.min(100, prev + Math.floor(Math.random() * 14) + 5));
    }, 900);
    return () => clearInterval(t);
  }, [matchState, roundIdx]);

  const startMatch = () => {
    if (wager > coins) {
      showToast?.('Not enough Gold for that wager!');
      return;
    }
    if (wager > 0) {
      onAdjustGold?.(-wager, `Multiplayer wager (${wager} Gold)`);
    }
    setMyScores([]);
    setOppScores([]);
    setRoundIdx(0);
    setMatchState('playing');
  };

  const handleRoundFinish = (score) => {
    const oppScore = Math.floor(
      rival.baseMin + Math.random() * (rival.baseMax - rival.baseMin)
    );
    const nextMy = [...myScores, score];
    const nextOpp = [...oppScores, oppScore];
    setMyScores(nextMy);
    setOppScores(nextOpp);

    if (roundIdx + 1 >= 3) {
      const myTotal = nextMy.reduce((a, b) => a + b, 0);
      const oppTotal = nextOpp.reduce((a, b) => a + b, 0);
      if (myTotal > oppTotal) {
        const winGold = wager * 2 + 40;
        onAdjustGold?.(winGold, `Multiplayer Arena Victory (+${winGold} Gold)`);
        showToast?.(`🏆 You Won! +${winGold} Gold!`);
      } else if (myTotal === oppTotal && wager > 0) {
        onAdjustGold?.(wager, 'Multiplayer Draw Refund');
      }
      setMatchState('summary');
    } else {
      setRoundIdx(roundIdx + 1);
    }
  };

  if (matchState === 'playing') {
    const currentGame = matchGames[roundIdx];
    const myTotal = myScores.reduce((a, b) => a + b, 0);
    const oppTotal = oppScores.reduce((a, b) => a + b, 0);
    return (
      <div>
        <div className="section-header">
          <div className="page-title" style={{ marginBottom: 0 }}>⚔️ Round {roundIdx + 1}/3</div>
          <button className="btn btn-secondary" onClick={() => setMatchState('lobby')}>Forfeit</button>
        </div>
        <div className="card mb-16" style={{ padding: 12 }}>
          <div className="inline-edit-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span>You: <strong>{myTotal} pts</strong></span>
            <span>Pot: <strong>🪙 {wager * 2 + 40}</strong></span>
            <span>{rival.name.split(' ')[0]}: <strong>{oppTotal} pts</strong></span>
          </div>
          <div className="duel-sub">Opponent live round progress: {oppLiveTicker}%</div>
          <div className="progress-bar" style={{ height: 6, marginTop: 4 }}>
            <div className="progress-bar-fill" style={{ width: `${oppLiveTicker}%`, background: 'var(--accent)' }} />
          </div>
        </div>

        <div className="page-subtitle">
          {currentGame.icon} {currentGame.name} ({currentGame.category})
        </div>

        <BrainGameEngine
          gameId={currentGame.id}
          difficulty={rival.difficulty}
          onFinish={handleRoundFinish}
        />
      </div>
    );
  }

  if (matchState === 'summary') {
    const myTotal = myScores.reduce((a, b) => a + b, 0);
    const oppTotal = oppScores.reduce((a, b) => a + b, 0);
    const won = myTotal > oppTotal;
    const draw = myTotal === oppTotal;

    return (
      <div>
        <div className="page-title">Arena Match Complete</div>
        <div className="duel-result-card">
          <div className="duel-game-title">
            {won ? '🏆 Victory!' : draw ? '🤝 Draw!' : '💀 Defeated'}
          </div>
          <div className="stat-row mt-16">
            <div className="stat-pill">
              <div className="stat-pill-value">{myTotal}</div>
              <div className="stat-pill-label">Your Score</div>
            </div>
            <div className="stat-pill">
              <div className="stat-pill-value">{oppTotal}</div>
              <div className="stat-pill-label">{rival.name.split(' ')[0]}</div>
            </div>
          </div>

          <div className="duel-sub mb-16">
            {won
              ? `You won the pot: +${wager * 2 + 40} Gold!`
              : draw
                ? 'Match tied — wager refunded.'
                : 'Train in the 32-Game Arcade and challenge again!'}
          </div>

          <button className="btn btn-primary btn-full mb-16" onClick={() => setMatchState('lobby')}>
            Play Another Match
          </button>
          <button className="btn btn-secondary btn-full" onClick={() => onNavigate('duel')}>
            Back to Daily Duel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">Multiplayer Brain Arena</div>
      <div className="page-subtitle">1v1 3-Round Cognitive Blitz · Balance: 🪙 {coins}</div>

      <div className="leaderboard-tabs mb-16">
        <button className={`leaderboard-tab ${mode === 'rival' ? 'active' : ''}`} onClick={() => setMode('rival')}>
          🤖 AI Rival Match
        </button>
        <button className={`leaderboard-tab ${mode === 'room' ? 'active' : ''}`} onClick={() => setMode('room')}>
          👥 Friend Room Code
        </button>
      </div>

      {mode === 'rival' ? (
        <div className="card mb-16">
          <div className="section-title mb-16">Select Opponent Tier</div>
          {RIVAL_TIERS.map((r) => (
            <div
              key={r.id}
              className={`quest-card ${rivalId === r.id ? 'selected-ring' : ''}`}
              style={{ cursor: 'pointer', borderColor: rivalId === r.id ? 'var(--accent)' : undefined }}
              onClick={() => setRivalId(r.id)}
            >
              <div className="quest-body">
                <div className="quest-title">{r.name}</div>
                <div className="duel-sub">ELO {r.elo} · Difficulty: {r.difficulty}</div>
              </div>
              {rivalId === r.id && <span className="tag tag-reward">Selected</span>}
            </div>
          ))}
        </div>
      ) : (
        <div className="card mb-16">
          <div className="section-title mb-16">Private Challenge Room</div>
          <div className="duel-sub mb-16">
            Share your Room Code so a friend gets the exact same 3-game seed:
          </div>
          <div className="logic-box mb-16" style={{ textAlign: 'center', fontSize: '1.4rem', letterSpacing: 4 }}>
            {roomCode}
          </div>
          <input
            className="input-field mb-16"
            placeholder="Or enter friend's 6-char room code..."
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
        </div>
      )}

      <div className="card mb-16">
        <div className="section-title mb-16">Gold Wager (Winner Takes 2× + 40 Bonus)</div>
        <div className="chip-scroll">
          {WAGER_AMOUNTS.map((amt) => (
            <button
              key={amt}
              className={`chip-btn ${wager === amt ? 'active' : ''}`}
              onClick={() => setWager(amt)}
            >
              {amt === 0 ? 'Free Play' : `🪙 ${amt}`}
            </button>
          ))}
        </div>
      </div>

      <button className="btn btn-accent btn-full" onClick={startMatch}>
        ⚔️ Start 3-Round Arena Match (Pot: 🪙 {wager * 2 + 40})
      </button>
    </div>
  );
}
