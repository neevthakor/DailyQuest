import { useState } from 'react';

export default function PatternChallenge({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState(() => generateQuestion());
  const [feedback, setFeedback] = useState(null);

  function generateQuestion() {
    const types = ['number', 'shape'];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'number') {
      const start = Math.floor(Math.random() * 5) + 1;
      const step = Math.floor(Math.random() * 4) + 2;
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const answer = start + step * 4;
      const options = new Set([answer]);
      while (options.size < 4) {
        options.add(answer + (Math.floor(Math.random() * 6) - 3) + (Math.random() > 0.5 ? 0 : step));
      }
      return {
        type: 'number',
        display: [...seq, '?'],
        answer,
        options: shuffle([...options]),
      };
    } else {
      const shapes = ['●', '■', '▲', '♥'];
      const pattern = [0, 1, 2, 0, 1, 2];
      const seq = pattern.slice(0, 5).map((i) => shapes[i]);
      const answer = shapes[pattern[5]];
      const options = new Set([answer]);
      while (options.size < 4) {
        options.add(shapes[Math.floor(Math.random() * shapes.length)]);
      }
      return {
        type: 'shape',
        display: [...seq, '?'],
        answer,
        options: shuffle([...options]),
      };
    }
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const handleAnswer = (opt) => {
    if (feedback) return;
    const correct = opt === question.answer;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 25);

    setTimeout(() => {
      if (round + 1 >= 4) {
        onFinish(score + (correct ? 25 : 0), 'Pattern challenge');
      } else {
        setRound((r) => r + 1);
        setQuestion(generateQuestion());
        setFeedback(null);
      }
    }, 700);
  };

  return (
    <div className="duel-screen">
      <div className="duel-game-title">🔮 Pattern Challenge</div>
      <div className="duel-game-desc">What comes next? Round {round + 1} / 4</div>
      <div className="duel-score-bar">
        <span className="duel-score-current">Score: {score}</span>
      </div>
      <div className="duel-sequence" style={{ marginBottom: '20px' }}>
        {question.display.map((item, i) => (
          <div key={i} className="duel-seq-item">{item}</div>
        ))}
      </div>
      <div className="duel-options">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={`duel-option ${
              feedback && opt === question.answer ? 'correct' :
              feedback === 'wrong' && opt !== question.answer ? 'wrong' : ''
            }`}
            onClick={() => handleAnswer(opt)}
            disabled={!!feedback}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
