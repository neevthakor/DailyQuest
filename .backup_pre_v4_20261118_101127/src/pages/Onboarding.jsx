import { useState } from 'react';

export default function Onboarding({ onStart, onAuth, isAuthenticated }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onStart(trimmed.slice(0, 20));
  };

  return (
    <div className="onboarding">
      <div className="onboarding-logo">DAILYQUEST</div>
      <div className="onboarding-tagline">Turn every day into an adventure</div>
      <form onSubmit={handleSubmit}>
        <input
          className="input-field onboarding-input"
          type="text"
          placeholder="Enter your name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-full" disabled={!name.trim()}>
          Begin Your Quest
        </button>
      </form>
      {!isAuthenticated && (
        <div className="local-play-card">
          <div className="local-play-title">Want cloud save?</div>
          <div className="local-play-text">
            Sign in to keep your profile across devices and prepare for future leaderboards and social features.
          </div>
          <button type="button" className="btn btn-secondary btn-full" onClick={onAuth}>
            Sign In / Create Account
          </button>
        </div>
      )}
    </div>
  );
}
