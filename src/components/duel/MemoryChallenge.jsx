import { useState, useEffect } from 'react';

export default function MemoryChallenge({ onFinish }) {
  const [phase, setPhase] = useState('showing');
  const [sequence, setSequence] = useState(() => generateSeq());
  const [userInput, setUserInput] = useState([]);
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);

  function generateSeq() {
    const symbols = ['★', '♦', '♥', '▲', '●', '■'];
    const seq = [];
    for (let i = 0; i < 4; i++) {
      seq.push(symbols[Math.floor(Math.random() * symbols.length)]);
    }
    return seq;
  }

  useEffect(() => {
    if (phase === 'showing') {
      const t = setTimeout(() => setPhase('input'), 3000);
      return () => clearTimeout(t);
    }
  }, [phase, round]);

  const handleSymbol = (sym) => {
    if (phase !== 'input') return;
    const next = [...userInput, sym];
    const idx = userInput.length;
    if (sym !== sequence[idx]) {
      setPhase('wrong');
      setTimeout(() => onFinish(score, 'Memory challenge'), 1200);
      return;
    }
    if (next.length === sequence.length) {
      const newScore = score + 25;
      setScore(newScore);
      if (round + 1 >= 3) {
        setTimeout(() => onFinish(newScore, 'Memory challenge'), 600);
      } else {
        setRound((r) => r + 1);
        setSequence(generateSeq());
        setUserInput([]);
        setPhase('showing');
      }
    } else {
      setUserInput(next);
    }
  };

  if (phase === 'showing') {
    return (
      <div className="duel-screen">
        <div className="duel-game-title">🧠 Memory Challenge</div>
        <div className="duel-game-desc">Memorize the sequence! Round {round + 1} / 3</div>
        <div className="duel-sequence">
          {sequence.map((sym, i) => (
            <div key={i} className="duel-seq-item">{sym}</div>
          ))}
        </div>
        <div className="duel-game-desc">Reveal ends in 3s...</div>
      </div>
    );
  }

  if (phase === 'wrong') {
    return (
      <div className="duel-screen">
        <div className="duel-game-title">🧠 Memory Challenge</div>
        <div className="duel-result">❌ Wrong!</div>
        <div className="duel-game-desc">Final score: {score}</div>
      </div>
    );
  }

  const symbols = ['★', '♦', '♥', '▲', '●', '■'];
  return (
    <div className="duel-screen">
      <div className="duel-game-title">🧠 Memory Challenge</div>
      <div className="duel-game-desc">Reproduce the sequence! Round {round + 1} / 3</div>
      <div className="duel-score-bar">
        <span className="duel-score-current">Score: {score}</span>
      </div>
      <div className="duel-sequence">
        {sequence.map((_, i) => (
          <div key={i} className="duel-seq-item hidden">
            {userInput[i] || '?'}
          </div>
        ))}
      </div>
      <div className="duel-options" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {symbols.map((sym) => (
          <button key={sym} className="duel-option" onClick={() => handleSymbol(sym)}>
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
