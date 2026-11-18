import { useEffect, useMemo, useRef, useState } from 'react';
import ReactionTest from './ReactionTest';
import NumberChallenge from './NumberChallenge';
import MemoryChallenge from './MemoryChallenge';
import PatternChallenge from './PatternChallenge';
import { getChallengeById } from '../../data/duels';

const COLORS = [
  { name: 'RED', hex: '#ef4444' },
  { name: 'BLUE', hex: '#3b82f6' },
  { name: 'GREEN', hex: '#10b981' },
  { name: 'GOLD', hex: '#f59e0b' },
];

const WORDS_POOL = [
  'BRAIN', 'QUEST', 'FOCUS', 'LOGIC', 'SPARK', 'NEXUS', 'PULSE', 'ORBIT',
  'SYNAPSE', 'VECTOR', 'MATRIX', 'CIPHER', 'PRISM', 'ZENITH', 'QUARTZ', 'ATLAS',
];

const ANAGRAM_WORDS = ['BRAIN', 'LOGIC', 'SMART', 'FOCUS', 'QUEST', 'FLASH', 'TRAIN', 'POWER', 'SPEED', 'THINK'];

const SEMANTIC_GROUPS = [
  { group: ['Neuron', 'Axon', 'Synapse'], odd: 'Piston' },
  { group: ['Prime', 'Integer', 'Fraction'], odd: 'Sonnet' },
  { group: ['Mercury', 'Venus', 'Mars'], odd: 'Granite' },
  { group: ['Python', 'Rust', 'Kotlin'], odd: 'Cello' },
  { group: ['Triangle', 'Hexagon', 'Octagon'], odd: 'Velocity' },
  { group: ['Memory', 'Recall', 'Retention'], odd: 'Voltage' },
];

const TYPO_SETS = [
  { ok: ['Cognitive', 'Precision', 'Algorithm'], bad: 'Algoritm' },
  { ok: ['Velocity', 'Momentum', 'Friction'], bad: 'Momentem' },
  { ok: ['Synapse', 'Cortex', 'Cerebral'], bad: 'Cerabral' },
  { ok: ['Strategy', 'Tactics', 'Analysis'], bad: 'Analisys' },
  { ok: ['Schedule', 'Calendar', 'Deadline'], bad: 'Calender' },
];

const SYLLOGISMS = [
  { p1: 'All A are B.', p2: 'All B are C.', c: 'Therefore, all A are C.', valid: true },
  { p1: 'Some X are Y.', p2: 'All Y are Z.', c: 'Therefore, all X are Z.', valid: false },
  { p1: 'No P are Q.', p2: 'All R are P.', c: 'Therefore, no R are Q.', valid: true },
  { p1: 'All M are N.', p2: 'Some K are M.', c: 'Therefore, some K are N.', valid: true },
  { p1: 'All lions are cats.', p2: 'Some pets are cats.', c: 'Therefore, some pets are lions.', valid: false },
  { p1: 'If it rains, the ground is wet.', p2: 'The ground is wet.', c: 'Therefore, it rained.', valid: false },
];

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Unified 32-Game Brain Engine with Pre-Game "How to Play & Pro Tips" Briefing.
 * Timer and rounds only start AFTER the player clicks "Start Puzzle Now".
 */
export default function BrainGameEngine({ gameId, difficulty = 'Medium', onFinish }) {
  const [ready, setReady] = useState(false);
  const meta = getChallengeById(gameId);

  useEffect(() => {
    setReady(false);
  }, [gameId]);

  if (!ready) {
    return (
      <div className="card mb-16" style={{ borderColor: 'var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ fontSize: '2.2rem' }}>{meta.icon || '🧠'}</div>
          <div>
            <div className="section-title">{meta.name}</div>
            <div className="duel-sub">
              Domain: <strong>{meta.category}</strong> · Difficulty: <strong>{difficulty}</strong>
              {meta.isGenius ? ' · ⭐ Genius Tier' : ''}
            </div>
          </div>
        </div>

        <div className="card mb-16" style={{ background: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.35)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-bright)', marginBottom: 6 }}>
            📖 How to Play
          </div>
          <div className="duel-sub" style={{ color: 'var(--text)', lineHeight: 1.5 }}>
            {meta.howToPlay || meta.description}
          </div>
        </div>

        {meta.proTip && (
          <div className="card mb-16" style={{ background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.35)' }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>
              💡 Grandmaster Strategy Tip
            </div>
            <div className="duel-sub" style={{ color: 'var(--text)', lineHeight: 1.5 }}>
              {meta.proTip}
            </div>
          </div>
        )}

        <button className="btn btn-primary btn-full" onClick={() => setReady(true)}>
          ▶ I'm Ready — Start Puzzle Now
        </button>
      </div>
    );
  }

  if (gameId === 'reaction') return <ReactionTest difficulty={difficulty} onFinish={onFinish} />;
  if (gameId === 'number') return <NumberChallenge difficulty={difficulty} onFinish={onFinish} />;
  if (gameId === 'memory') return <MemoryChallenge difficulty={difficulty} onFinish={onFinish} />;
  if (gameId === 'pattern') return <PatternChallenge difficulty={difficulty} onFinish={onFinish} />;

  return <DynamicBrainGame key={gameId} gameId={gameId} difficulty={difficulty} onFinish={onFinish} />;
}

function DynamicBrainGame({ gameId, difficulty, onFinish }) {
  const totalRounds = difficulty === 'Genius' ? 7 : difficulty === 'Hard' ? 6 : 5;
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(difficulty === 'Genius' ? 35 : 45);
  const finishedRef = useRef(false);

  const finishOnce = (finalScore) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    onFinish(Math.max(10, Math.round(finalScore)));
  };

  useEffect(() => {
    if (done) return;
    if (gameId === 'focus-hold' || gameId === 'card-pairs' || gameId === 'tap-order') return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          finishOnce(score);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [done, gameId, score]);

  const recordAnswer = (isCorrect, bonus = 0) => {
    const nextCombo = isCorrect ? combo + 1 : 0;
    const pts = isCorrect ? 20 + nextCombo * 5 + bonus : 0;
    const nextScore = score + pts;
    setScore(nextScore);
    setCombo(nextCombo);
    setFeedback(isCorrect ? `✓ +${pts} pts${nextCombo > 1 ? ` (${nextCombo}x Combo!)` : ''}` : '✗ Missed');

    setTimeout(() => {
      setFeedback(null);
      if (round >= totalRounds) {
        finishOnce(nextScore + timeLeft);
      } else {
        setRound((r) => r + 1);
      }
    }, 450);
  };

  if (gameId === 'tap-order') return <TapOrderGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'card-pairs') return <CardPairsGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'matrix-memory') return <MatrixMemoryGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'color-sequence') return <ColorSequenceGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'nback') return <NBackGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'path-finder') return <PathMemoryGame difficulty={difficulty} onFinish={finishOnce} />;
  if (gameId === 'focus-hold') return <FocusHoldGame onFinish={finishOnce} />;
  if (gameId === 'tower-sort') return <OrderSortGame difficulty={difficulty} onFinish={finishOnce} />;

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>Round {round}/{totalRounds}</span>
        <span>Score: <strong>{score}</strong></span>
        <span>⏱ {timeLeft}s</span>
      </div>

      {feedback && (
        <div className={`duel-feedback ${feedback.startsWith('✓') ? 'good' : 'bad'}`}>
          {feedback}
        </div>
      )}

      <RoundPromptGame
        key={`${gameId}-${round}`}
        gameId={gameId}
        difficulty={difficulty}
        onAnswer={recordAnswer}
      />
    </div>
  );
}

function RoundPromptGame({ gameId, difficulty, onAnswer }) {
  const [phase, setPhase] = useState('show');
  const [inputVal, setInputVal] = useState('');

  const challenge = useMemo(() => {
    if (gameId === 'stroop') {
      const word = pick(COLORS);
      const ink = pick(COLORS);
      return { word: word.name, inkHex: ink.hex, answer: ink.name };
    }
    if (gameId === 'word-recall') {
      const chosen = shuffle(WORDS_POOL).slice(0, 4);
      const decoy = shuffle(WORDS_POOL.filter((w) => !chosen.includes(w))).slice(0, 3);
      const target = chosen[0];
      const options = shuffle([target, ...decoy]);
      return { chosen, target, options };
    }
    if (gameId === 'odd-one-out') {
      const pairs = [['◆', '◇'], ['▲', '△'], ['●', '○'], ['★', '☆'], ['■', '□'], ['⬟', '⬠']];
      const [main, odd] = pick(pairs);
      const size = difficulty === 'Genius' ? 16 : 9;
      const oddIdx = Math.floor(Math.random() * size);
      return { main, odd, size, oddIdx };
    }
    if (gameId === 'symbol-match') {
      const syms = ['◈', '❖', '✦', '⬡', '⬢', '◎', '⊗'];
      const a = pick(syms);
      const same = Math.random() > 0.45;
      const b = same ? a : pick(syms.filter((s) => s !== a));
      return { a, b, same };
    }
    if (gameId === 'logic-gates') {
      const a = Math.random() > 0.5 ? 1 : 0;
      const b = Math.random() > 0.5 ? 1 : 0;
      const gates = ['AND', 'OR', 'XOR', 'NAND'];
      const gate = pick(gates);
      let ans = 0;
      if (gate === 'AND') ans = a & b;
      if (gate === 'OR') ans = a | b;
      if (gate === 'XOR') ans = a ^ b;
      if (gate === 'NAND') ans = (a & b) ? 0 : 1;
      return { a, b, gate, ans };
    }
    if (gameId === 'syllogism') {
      return pick(SYLLOGISMS);
    }
    if (gameId === 'cipher-decode') {
      const word = pick(['CODE', 'MIND', 'STAR', 'FIRE', 'HERO', 'GAME', 'PEAK', 'BOLT']);
      const shift = Math.floor(Math.random() * 3) + 1;
      const encoded = word
        .split('')
        .map((ch) => String.fromCharCode(((ch.charCodeAt(0) - 65 + shift) % 26) + 65))
        .join('');
      const decoys = shuffle(['CODE', 'MIND', 'STAR', 'FIRE', 'HERO', 'GAME', 'PEAK', 'BOLT'].filter((w) => w !== word)).slice(0, 3);
      return { word, shift, encoded, options: shuffle([word, ...decoys]) };
    }
    if (gameId === 'rule-switch') {
      const rule = Math.random() > 0.5 ? 'EVEN' : 'OVER_50';
      const num = Math.floor(Math.random() * 90) + 10;
      const ans = rule === 'EVEN' ? num % 2 === 0 : num > 50;
      return { rule, num, ans };
    }
    if (gameId === 'missing-op') {
      const ops = ['+', '−', '×'];
      const op = pick(ops);
      const a = Math.floor(Math.random() * 12) + 2;
      const b = Math.floor(Math.random() * 12) + 2;
      const res = op === '+' ? a + b : op === '−' ? a - b : a * b;
      return { a, b, res, op };
    }
    if (gameId === 'fraction-duel') {
      const opts = [
        { label: '3/4', val: 0.75 },
        { label: '7/10', val: 0.7 },
        { label: '68%', val: 0.68 },
        { label: '5/8', val: 0.625 },
        { label: '4/5', val: 0.8 },
        { label: '82%', val: 0.82 },
        { label: '2/3', val: 0.666 },
        { label: '5/6', val: 0.833 },
      ];
      const [x, y] = shuffle(opts).slice(0, 2);
      return { x, y, winner: x.val > y.val ? x.label : y.label };
    }
    if (gameId === 'prime-sieve') {
      const nums = [11, 13, 15, 17, 19, 21, 23, 27, 29, 31, 33, 37, 39, 41, 43, 49, 51, 53];
      const n = pick(nums);
      return { n, prime: isPrime(n) };
    }
    if (gameId === 'estimation') {
      const a = Math.floor(Math.random() * 40) + 21;
      const b = Math.floor(Math.random() * 35) + 18;
      const exact = a * b;
      const options = shuffle([
        exact,
        exact + (Math.random() > 0.5 ? 120 : -120),
        exact + 260,
        Math.max(100, exact - 240),
      ]);
      return { a, b, exact, options };
    }
    if (gameId === 'chain-calc') {
      const start = Math.floor(Math.random() * 10) + 5;
      const s1 = Math.floor(Math.random() * 8) + 2;
      const s2 = Math.floor(Math.random() * 4) + 2;
      const s3 = Math.floor(Math.random() * 7) + 1;
      const ans = (start + s1) * s2 - s3;
      const options = shuffle([ans, ans + 4, ans - 3, ans + 8]);
      return { start, s1, s2, s3, ans, options };
    }
    if (gameId === 'mental-rotation') {
      const arrows = ['⬆️', '➡️', '⬇️', '⬅️'];
      const idx = Math.floor(Math.random() * 4);
      const steps = Math.floor(Math.random() * 3) + 1;
      const target = arrows[(idx + steps) % 4];
      return { start: arrows[idx], deg: steps * 90, target, arrows };
    }
    if (gameId === 'mirror-check') {
      const gridA = Array.from({ length: 9 }, () => (Math.random() > 0.55 ? 1 : 0));
      const isMirror = Math.random() > 0.45;
      const gridB = [
        gridA[2], gridA[1], gridA[0],
        gridA[5], gridA[4], gridA[3],
        gridA[8], gridA[7], gridA[6],
      ];
      if (!isMirror) {
        const flipIdx = Math.floor(Math.random() * 9);
        gridB[flipIdx] = gridB[flipIdx] ? 0 : 1;
      }
      const actualMirror =
        gridB[0] === gridA[2] && gridB[1] === gridA[1] && gridB[2] === gridA[0] &&
        gridB[3] === gridA[5] && gridB[4] === gridA[4] && gridB[5] === gridA[3] &&
        gridB[6] === gridA[8] && gridB[7] === gridA[7] && gridB[8] === gridA[6];
      return { gridA, gridB, actualMirror };
    }
    if (gameId === 'count-blocks') {
      const heights = Array.from({ length: 4 }, () => Math.floor(Math.random() * 4) + 1);
      const total = heights.reduce((s, h) => s + h, 0);
      const options = shuffle([total, total + 1, Math.max(2, total - 1), total + 2]);
      return { heights, total, options };
    }
    if (gameId === 'direction-sense') {
      const dirs = ['North', 'East', 'South', 'West'];
      let idx = Math.floor(Math.random() * 4);
      const start = dirs[idx];
      const turns = Array.from({ length: 3 }, () => (Math.random() > 0.5 ? 'Right' : 'Left'));
      for (const t of turns) {
        idx = t === 'Right' ? (idx + 1) % 4 : (idx + 3) % 4;
      }
      return { start, turns, answer: dirs[idx], dirs };
    }
    if (gameId === 'anagram') {
      const word = pick(ANAGRAM_WORDS);
      let scrambled = shuffle(word.split('')).join('');
      if (scrambled === word) scrambled = word.split('').reverse().join('');
      return { word, scrambled };
    }
    if (gameId === 'word-chain') {
      const item = pick(SEMANTIC_GROUPS);
      return { options: shuffle([...item.group, item.odd]), odd: item.odd };
    }
    if (gameId === 'typo-spotter') {
      const item = pick(TYPO_SETS);
      return { options: shuffle([...item.ok, item.bad]), bad: item.bad };
    }
    return {};
  }, [gameId]);

  useEffect(() => {
    if (gameId === 'word-recall') {
      setPhase('show');
      const t = setTimeout(() => setPhase('ask'), 2200);
      return () => clearTimeout(t);
    }
  }, [gameId]);

  if (gameId === 'stroop') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Tap the INK COLOR (ignore the word!)</div>
        <div className="stroop-word" style={{ color: challenge.inkHex }}>{challenge.word}</div>
        <div className="duel-btn-grid">
          {COLORS.map((c) => (
            <button key={c.name} className="btn btn-secondary" onClick={() => onAnswer(c.name === challenge.answer)}>
              {c.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'word-recall') {
    if (phase === 'show') {
      return (
        <div className="duel-stage">
          <div className="duel-prompt-label">Memorize these 4 words!</div>
          <div className="word-chip-grid">
            {challenge.chosen.map((w) => <span key={w} className="word-chip">{w}</span>)}
          </div>
        </div>
      );
    }
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Which word was in the list?</div>
        <div className="duel-btn-grid">
          {challenge.options.map((w) => (
            <button key={w} className="btn btn-secondary" onClick={() => onAnswer(w === challenge.target)}>
              {w}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'odd-one-out') {
    const cols = challenge.size === 16 ? 4 : 3;
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Tap the odd symbol!</div>
        <div className="symbol-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: challenge.size }, (_, idx) => (
            <button key={idx} className="symbol-cell" onClick={() => onAnswer(idx === challenge.oddIdx)}>
              {idx === challenge.oddIdx ? challenge.odd : challenge.main}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'symbol-match') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Do these symbols match?</div>
        <div className="symbol-pair">
          <span>{challenge.a}</span>
          <span>{challenge.b}</span>
        </div>
        <div className="duel-btn-grid">
          <button className="btn btn-primary" onClick={() => onAnswer(challenge.same)}>Yes, Match</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(!challenge.same)}>No, Different</button>
        </div>
      </div>
    );
  }

  if (gameId === 'logic-gates') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Evaluate the Boolean Gate:</div>
        <div className="logic-box">
          <code>{challenge.a}  {challenge.gate}  {challenge.b}  =  ?</code>
        </div>
        <div className="duel-btn-grid">
          <button className="btn btn-secondary" onClick={() => onAnswer(challenge.ans === 1)}>1 (TRUE)</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(challenge.ans === 0)}>0 (FALSE)</button>
        </div>
      </div>
    );
  }

  if (gameId === 'syllogism') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Does the conclusion logically follow?</div>
        <div className="card mb-16" style={{ textAlign: 'left', fontSize: '0.9rem' }}>
          <div>1. {challenge.p1}</div>
          <div>2. {challenge.p2}</div>
          <div style={{ marginTop: 8, color: 'var(--accent)', fontWeight: 700 }}>{challenge.c}</div>
        </div>
        <div className="duel-btn-grid">
          <button className="btn btn-primary" onClick={() => onAnswer(challenge.valid)}>Logically Valid</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(!challenge.valid)}>Invalid / Fallacy</button>
        </div>
      </div>
    );
  }

  if (gameId === 'cipher-decode') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Caesar Shift +{challenge.shift}. Decode:</div>
        <div className="stroop-word" style={{ letterSpacing: 6 }}>{challenge.encoded}</div>
        <div className="duel-btn-grid">
          {challenge.options.map((opt) => (
            <button key={opt} className="btn btn-secondary" onClick={() => onAnswer(opt === challenge.word)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'rule-switch') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">
          Active Rule: <strong>{challenge.rule === 'EVEN' ? 'Is it EVEN?' : 'Is it > 50?'}</strong>
        </div>
        <div className="stroop-word">{challenge.num}</div>
        <div className="duel-btn-grid">
          <button className="btn btn-primary" onClick={() => onAnswer(challenge.ans)}>YES</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(!challenge.ans)}>NO</button>
        </div>
      </div>
    );
  }

  if (gameId === 'missing-op') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Pick the missing operator:</div>
        <div className="stroop-word">{challenge.a} ? {challenge.b} = {challenge.res}</div>
        <div className="duel-btn-grid">
          {['+', '−', '×', '÷'].map((op) => (
            <button key={op} className="btn btn-secondary" onClick={() => onAnswer(op === challenge.op)}>
              {op}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'fraction-duel') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Which value is LARGER?</div>
        <div className="duel-btn-grid">
          <button className="btn btn-secondary" style={{ fontSize: '1.3rem', padding: 18 }} onClick={() => onAnswer(challenge.x.label === challenge.winner)}>
            {challenge.x.label}
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '1.3rem', padding: 18 }} onClick={() => onAnswer(challenge.y.label === challenge.winner)}>
            {challenge.y.label}
          </button>
        </div>
      </div>
    );
  }

  if (gameId === 'prime-sieve') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Is this number Prime?</div>
        <div className="stroop-word">{challenge.n}</div>
        <div className="duel-btn-grid">
          <button className="btn btn-primary" onClick={() => onAnswer(challenge.prime)}>Prime</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(!challenge.prime)}>Composite</button>
        </div>
      </div>
    );
  }

  if (gameId === 'estimation') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Pick the exact product:</div>
        <div className="stroop-word">{challenge.a} × {challenge.b}</div>
        <div className="duel-btn-grid">
          {challenge.options.map((opt) => (
            <button key={opt} className="btn btn-secondary" onClick={() => onAnswer(opt === challenge.exact)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'chain-calc') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Compute in order (left to right):</div>
        <div className="logic-box">
          <code>(({challenge.start} + {challenge.s1}) × {challenge.s2}) − {challenge.s3}</code>
        </div>
        <div className="duel-btn-grid">
          {challenge.options.map((opt) => (
            <button key={opt} className="btn btn-secondary" onClick={() => onAnswer(opt === challenge.ans)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'mental-rotation') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Rotate {challenge.start} clockwise by {challenge.deg}°:</div>
        <div className="duel-btn-grid">
          {challenge.arrows.map((ar) => (
            <button key={ar} className="btn btn-secondary" style={{ fontSize: '1.5rem' }} onClick={() => onAnswer(ar === challenge.target)}>
              {ar}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'mirror-check') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Are these two 3×3 grids horizontal mirrors?</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 16 }}>
          <div className="mini-grid-3">
            {challenge.gridA.map((v, i) => <div key={i} className={`mini-cell ${v ? 'lit' : ''}`} />)}
          </div>
          <div className="mini-grid-3">
            {challenge.gridB.map((v, i) => <div key={i} className={`mini-cell ${v ? 'lit' : ''}`} />)}
          </div>
        </div>
        <div className="duel-btn-grid">
          <button className="btn btn-primary" onClick={() => onAnswer(challenge.actualMirror)}>True Mirror</button>
          <button className="btn btn-secondary" onClick={() => onAnswer(!challenge.actualMirror)}>Not Mirror</button>
        </div>
      </div>
    );
  }

  if (gameId === 'count-blocks') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Sum the cube heights in this 2×2 stack:</div>
        <div className="symbol-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 180, margin: '0 auto 16px' }}>
          {challenge.heights.map((h, i) => (
            <div key={i} className="symbol-cell" style={{ fontSize: '1rem' }}>
              {'🧊'.repeat(h)} ({h})
            </div>
          ))}
        </div>
        <div className="duel-btn-grid">
          {challenge.options.map((opt) => (
            <button key={opt} className="btn btn-secondary" onClick={() => onAnswer(opt === challenge.total)}>
              {opt} cubes
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'direction-sense') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Facing <strong>{challenge.start}</strong>, then turn:</div>
        <div className="word-chip-grid mb-16">
          {challenge.turns.map((t, i) => <span key={i} className="word-chip">{t}</span>)}
        </div>
        <div className="duel-btn-grid">
          {challenge.dirs.map((d) => (
            <button key={d} className="btn btn-secondary" onClick={() => onAnswer(d === challenge.answer)}>
              {d}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (gameId === 'anagram') {
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">Unscramble the 5-letter word:</div>
        <div className="stroop-word" style={{ letterSpacing: 6 }}>{challenge.scrambled}</div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onAnswer(inputVal.trim().toUpperCase() === challenge.word, 10);
          }}
        >
          <input
            className="input-field mb-16"
            placeholder="Type word..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            autoFocus
          />
          <button className="btn btn-primary btn-full" type="submit">Submit</button>
        </form>
      </div>
    );
  }

  if (gameId === 'word-chain' || gameId === 'typo-spotter') {
    const target = gameId === 'word-chain' ? challenge.odd : challenge.bad;
    return (
      <div className="duel-stage">
        <div className="duel-prompt-label">
          {gameId === 'word-chain' ? 'Pick the word that does NOT belong:' : 'Spot the misspelled word:'}
        </div>
        <div className="duel-btn-grid">
          {challenge.options.map((opt) => (
            <button key={opt} className="btn btn-secondary" onClick={() => onAnswer(opt === target)}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

function TapOrderGame({ difficulty, onFinish }) {
  const count = difficulty === 'Genius' ? 20 : 16;
  const [nums] = useState(() => shuffle(Array.from({ length: count }, (_, i) => i + 1)));
  const [next, setNext] = useState(1);
  const [startTs] = useState(() => Date.now());
  const [errors, setErrors] = useState(0);

  const handleTap = (n) => {
    if (n === next) {
      if (n === count) {
        const secs = (Date.now() - startTs) / 1000;
        const score = Math.max(25, Math.round(160 - secs * 4 - errors * 5));
        onFinish(score);
      } else {
        setNext(next + 1);
      }
    } else {
      setErrors((e) => e + 1);
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>Find: <strong>{next}</strong> / {count}</span>
        <span>Mistakes: {errors}</span>
      </div>
      <div className="symbol-grid" style={{ gridTemplateColumns: `repeat(${count === 20 ? 5 : 4}, 1fr)` }}>
        {nums.map((n) => (
          <button key={n} className={`symbol-cell ${n < next ? 'done' : ''}`} disabled={n < next} onClick={() => handleTap(n)}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardPairsGame({ difficulty, onFinish }) {
  const icons = difficulty === 'Genius'
    ? ['⚡', '🧠', '🔥', '💎', '🎯', '🚀', '🧬', '🔮']
    : ['⚡', '🧠', '🔥', '💎', '🎯', '🚀'];
  const [cards] = useState(() => shuffle([...icons, ...icons]).map((icon, i) => ({ id: i, icon })));
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return;
    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      if (cards[a].icon === cards[b].icon) {
        const nextMatched = [...matched, a, b];
        setMatched(nextMatched);
        setFlipped([]);
        if (nextMatched.length === cards.length) {
          onFinish(Math.max(40, 160 - moves * 4));
        }
      } else {
        setTimeout(() => setFlipped([]), 600);
      }
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>Matched: {matched.length / 2}/{icons.length}</span>
        <span>Moves: {moves}</span>
      </div>
      <div className="symbol-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {cards.map((c, idx) => {
          const open = flipped.includes(idx) || matched.includes(idx);
          return (
            <button key={c.id} className={`symbol-cell ${open ? 'lit' : ''}`} onClick={() => handleFlip(idx)}>
              {open ? c.icon : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatrixMemoryGame({ difficulty, onFinish }) {
  const targetCount = difficulty === 'Genius' ? 7 : 5;
  const [targets] = useState(() => shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, targetCount));
  const [phase, setPhase] = useState('show');
  const [picked, setPicked] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => setPhase('guess'), 1800);
    return () => clearTimeout(t);
  }, []);

  const handlePick = (idx) => {
    if (phase !== 'guess' || picked.includes(idx)) return;
    const next = [...picked, idx];
    setPicked(next);
    if (next.length === targetCount) {
      const hits = next.filter((i) => targets.includes(i)).length;
      onFinish(hits * 22);
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>{phase === 'show' ? 'Memorize lit tiles...' : `Pick ${targetCount - picked.length} more tiles`}</span>
      </div>
      <div className="symbol-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Array.from({ length: 16 }, (_, idx) => {
          const isLit = (phase === 'show' && targets.includes(idx)) || picked.includes(idx);
          return (
            <button key={idx} className={`symbol-cell ${isLit ? 'lit' : ''}`} onClick={() => handlePick(idx)}>
              {isLit ? '🟦' : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorSequenceGame({ difficulty, onFinish }) {
  const len = difficulty === 'Genius' ? 6 : 4;
  const [seq] = useState(() => Array.from({ length: len }, () => Math.floor(Math.random() * 4)));
  const [activePad, setActivePad] = useState(null);
  const [phase, setPhase] = useState('show');
  const [step, setStep] = useState(0);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i >= seq.length) {
        setActivePad(null);
        setPhase('input');
        clearInterval(interval);
        return;
      }
      setActivePad(seq[i]);
      setTimeout(() => setActivePad(null), 350);
      i++;
    }, 600);
    return () => clearInterval(interval);
  }, [seq]);

  const handlePad = (idx) => {
    if (phase !== 'input') return;
    if (idx === seq[step]) {
      if (step + 1 === seq.length) onFinish(120);
      else setStep(step + 1);
    } else {
      onFinish(step * 25);
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>{phase === 'show' ? 'Watch the sequence...' : `Tap step ${step + 1}/${seq.length}`}</span>
      </div>
      <div className="duel-btn-grid">
        {COLORS.map((c, idx) => (
          <button
            key={c.name}
            className="btn"
            style={{
              background: activePad === idx ? c.hex : 'rgba(255,255,255,0.08)',
              border: `2px solid ${c.hex}`,
              color: '#fff',
              padding: 24,
            }}
            onClick={() => handlePad(idx)}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function NBackGame({ difficulty, onFinish }) {
  const totalSteps = difficulty === 'Genius' ? 10 : 8;
  const [stream] = useState(() => {
    const arr = [];
    for (let i = 0; i < totalSteps; i++) {
      if (i >= 2 && Math.random() < 0.4) arr.push(arr[i - 2]);
      else arr.push(Math.floor(Math.random() * 6) + 1);
    }
    return arr;
  });
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);

  const answer = (saysMatch) => {
    const actualMatch = idx >= 2 && stream[idx] === stream[idx - 2];
    const nextScore = saysMatch === actualMatch ? score + 20 : score;
    setScore(nextScore);
    if (idx + 1 >= totalSteps) onFinish(nextScore);
    else setIdx(idx + 1);
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>2-Back Step {idx + 1}/{totalSteps}</span>
        <span>Score: {score}</span>
      </div>
      <div className="stroop-word">{stream[idx]}</div>
      <div className="duel-prompt-label">Does this match the number 2 steps ago?</div>
      <div className="duel-btn-grid">
        <button className="btn btn-primary" disabled={idx < 2} onClick={() => answer(true)}>Match (2-Back)</button>
        <button className="btn btn-secondary" onClick={() => answer(false)}>{idx < 2 ? 'Next' : 'No Match'}</button>
      </div>
    </div>
  );
}

function PathMemoryGame({ difficulty, onFinish }) {
  const len = difficulty === 'Genius' ? 6 : 4;
  const [path] = useState(() => shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, len));
  const [phase, setPhase] = useState('show');
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setPhase('guess'), 2000);
    return () => clearTimeout(t);
  }, []);

  const handleCell = (idx) => {
    if (phase !== 'guess') return;
    if (idx === path[step]) {
      if (step + 1 === path.length) onFinish(130);
      else setStep(step + 1);
    } else {
      onFinish(step * 25);
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>{phase === 'show' ? 'Memorize numbered path 1→' + len : `Tap step #${step + 1}`}</span>
      </div>
      <div className="symbol-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {Array.from({ length: 16 }, (_, idx) => {
          const order = path.indexOf(idx);
          const showNum = phase === 'show' && order !== -1;
          const doneNum = phase === 'guess' && order !== -1 && order < step;
          return (
            <button key={idx} className={`symbol-cell ${showNum || doneNum ? 'lit' : ''}`} onClick={() => handleCell(idx)}>
              {showNum || doneNum ? order + 1 : ''}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FocusHoldGame({ onFinish }) {
  const [holding, setHolding] = useState(false);
  const startRef = useRef(0);

  const startHold = () => {
    startRef.current = performance.now();
    setHolding(true);
  };

  const endHold = () => {
    if (!holding) return;
    setHolding(false);
    const elapsed = (performance.now() - startRef.current) / 1000;
    const diff = Math.abs(5.0 - elapsed);
    const score = Math.max(15, Math.round(140 - diff * 45));
    onFinish(score);
  };

  return (
    <div className="duel-arena">
      <div className="duel-prompt-label">Press & HOLD for exactly 5.00 seconds, then release!</div>
      <button
        className={`btn ${holding ? 'btn-accent' : 'btn-primary'} btn-full`}
        style={{ padding: 36, fontSize: '1.2rem' }}
        onMouseDown={startHold}
        onMouseUp={endHold}
        onTouchStart={startHold}
        onTouchEnd={endHold}
      >
        {holding ? 'Holding... Feel 5 Seconds!' : 'Hold Here'}
      </button>
    </div>
  );
}

function OrderSortGame({ difficulty, onFinish }) {
  const count = difficulty === 'Genius' ? 8 : 6;
  const [items] = useState(() => shuffle(Array.from({ length: count }, (_, i) => (i + 1) * 7)));
  const [sorted] = useState(() => [...items].sort((a, b) => a - b));
  const [idx, setIdx] = useState(0);
  const [startTs] = useState(() => Date.now());

  const handleTap = (val) => {
    if (val === sorted[idx]) {
      if (idx + 1 === sorted.length) {
        const secs = (Date.now() - startTs) / 1000;
        onFinish(Math.max(40, Math.round(140 - secs * 6)));
      } else {
        setIdx(idx + 1);
      }
    }
  };

  return (
    <div className="duel-arena">
      <div className="duel-hud">
        <span>Tap smallest remaining ({idx}/{count})</span>
      </div>
      <div className="duel-btn-grid">
        {items.map((v) => {
          const picked = sorted.slice(0, idx).includes(v);
          return (
            <button key={v} className="btn btn-secondary" disabled={picked} onClick={() => handleTap(v)}>
              {picked ? '✓' : v}
            </button>
          );
        })}
      </div>
    </div>
  );
}
