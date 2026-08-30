import { useState, useRef, useEffect } from 'react';
import { scoreReactionTime } from '../../services/duelService';

export default function ReactionTest({ onFinish }) {
  const [state, setState] = useState('waiting');
  const [result, setResult] = useState(null);
  const startTimeRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const start = () => {
    setState('ready');
    setResult(null);
    const delay = 1500 + Math.random() * 3000;
    timeoutRef.current = setTimeout(() => {
      setState('click');
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (state === 'ready') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setState('tooSoon');
      return;
    }
    if (state === 'click') {
      const elapsed = Date.now() - startTimeRef.current;
      setResult(elapsed);
      setState('done');
      onFinish(scoreReactionTime(elapsed), `${elapsed}ms reaction time`);
    }
  };

  if (state === 'waiting') {
    return (
      <div className="duel-screen">
        <div className="duel-game-title">⚡ Reaction Test</div>
        <div className="duel-game-desc">Click as fast as you can when the screen turns green!</div>
        <button className="btn btn-primary btn-full" onClick={start}>Start</button>
      </div>
    );
  }

  if (state === 'ready') {
    return (
      <div className="duel-screen" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
        <div className="duel-wait">WAIT...</div>
        <div className="duel-game-desc">Click when it says CLICK!</div>
        <button className="btn btn-secondary btn-full" onClick={handleClick}>Click here</button>
      </div>
    );
  }

  if (state === 'click') {
    return (
      <div className="duel-screen" style={{ background: 'rgba(16, 185, 129, 0.12)', cursor: 'pointer' }} onClick={handleClick}>
        <div className="duel-click">CLICK!</div>
      </div>
    );
  }

  if (state === 'tooSoon') {
    return (
      <div className="duel-screen">
        <div className="duel-game-title">Too soon! 😅</div>
        <div className="duel-game-desc">Wait for the green screen next time.</div>
        <button className="btn btn-primary btn-full" onClick={start}>Try again</button>
      </div>
    );
  }

  return (
    <div className="duel-screen">
      <div className="duel-game-title">⚡ Reaction Test</div>
      <div className="duel-result">{result}ms</div>
      <button className="btn btn-primary btn-full" onClick={start}>Try again</button>
    </div>
  );
}
