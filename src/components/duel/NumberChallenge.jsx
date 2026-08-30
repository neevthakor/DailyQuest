import { useState } from 'react';

export default function NumberChallenge({ onFinish }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [question, setQuestion] = useState(() => generateQuestion());
  const [feedback, setFeedback] = useState(null);

  function generateQuestion() {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    const ops = ['+', '-', '×'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    let answer;
    if (op === '+') answer = a + b;
    else if (op === '-') answer = a - b;
    else answer = a * b;

    const options = new Set([answer]);
    while (options.size < 4) {
      const delta = Math.floor(Math.random() * 10) - 5;
      const candidate = answer + delta;
      if (candidate !== answer && candidate >= -50) {
        options.add(candidate);
      }
    }
    return {
      prompt: `${a} ${op} ${b} = ?`,
      answer,
      options: shuffle([...options]),
    };
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  const handleAnswer = (option) => {
    if (feedback) return;
    const correct = option === question.answer;
    setFeedback(correct ? 'correct' : 'wrong');
    if (correct) setScore((s) => s + 20);

    setTimeout(() => {
      if (round + 1 >= 5) {
        onFinish(score + (correct ? 20 : 0), `${round + 1} questions answered`);
      } else {
        setRound((r) => r + 1);
        setQuestion(generateQuestion());
        setFeedback(null);
      }
    }, 700);
  };

  return (
    <div className="duel-screen">
      <div className="duel-game-title">🔢 Number Challenge</div>
      <div className="duel-game-desc">Solve quick math problems! Round {round + 1} / 5</div>
      <div className="duel-score-bar">
        <span className="duel-score-current">Score: {score}</span>
      </div>
      <div className="duel-result" style={{ fontSize: '2.2rem' }}>{question.prompt}</div>
      <div className="duel-options">
        {question.options.map((opt, i) => (
          <button
            key={i}
            className={`duel-option ${
              feedback === 'correct' && opt === question.answer ? 'correct' :
              feedback === 'wrong' && opt === question.answer ? 'correct' :
              feedback && opt !== question.answer ? '' : ''
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
