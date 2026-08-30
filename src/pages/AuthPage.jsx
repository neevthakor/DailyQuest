import { useState } from 'react';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const AVATARS = ['⚡', '🛡️', '🔥', '🌙', '🏆', '💎'];

export default function AuthPage({ mode = 'signin', onModeChange, onDone, authError, signIn, signUp, forgotPassword }) {
  const [formMode, setFormMode] = useState(mode);
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const activeMode = onModeChange ? mode : formMode;
  const setMode = (next) => {
    setError('');
    setMessage('');
    if (onModeChange) onModeChange(next);
    setFormMode(next);
  };

  const validateSignup = () => {
    const cleanName = username.trim();
    if (!cleanName) return 'Choose a username.';
    if (cleanName.length < 2 || cleanName.length > 20) return 'Username must be 2 to 20 characters.';
    if (!isValidEmail(email)) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords must match.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (activeMode === 'forgot') {
      if (!isValidEmail(email)) {
        setError('Enter the email for your DailyQuest account.');
        return;
      }
      setLoading(true);
      const result = await forgotPassword(email);
      setLoading(false);
      if (!result.success) setError(result.error);
      else setMessage('Password reset email sent.');
      return;
    }

    if (activeMode === 'signup') {
      const validation = validateSignup();
      if (validation) {
        setError(validation);
        return;
      }
      setLoading(true);
      const result = await signUp({ username: username.trim(), email, password, avatar });
      setLoading(false);
      if (!result.success) setError(result.error);
      else {
        setMessage(result.needsEmailConfirmation ? 'Account created. Check your email to confirm sign in.' : 'Account created.');
        onDone?.();
      }
      return;
    }

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);
    const result = await signIn({ email, password });
    setLoading(false);
    if (!result.success) setError(result.error);
    else onDone?.();
  };

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <button className="auth-back" onClick={onDone} type="button">←</button>
        <div className="onboarding-logo">DAILYQUEST</div>
        <div className="auth-title">
          {activeMode === 'signup' ? 'Create your adventurer' : activeMode === 'forgot' ? 'Recover your account' : 'Welcome back'}
        </div>
        <div className="auth-subtitle">
          Cloud save keeps your XP, coins, streak, and profile ready across devices.
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {activeMode === 'signup' && (
            <>
              <label className="field-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
                autoComplete="nickname"
              />
              <div className="avatar-picker" aria-label="Avatar">
                {AVATARS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`avatar-choice ${avatar === item ? 'active' : ''}`}
                    onClick={() => setAvatar(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}

          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            className="input-field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          {activeMode !== 'forgot' && (
            <>
              <label className="field-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={activeMode === 'signup' ? 'new-password' : 'current-password'}
              />
            </>
          )}

          {activeMode === 'signup' && (
            <>
              <label className="field-label" htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                className="input-field"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </>
          )}

          {(error || authError) && <div className="form-error">{error || authError}</div>}
          {message && <div className="form-success">{message}</div>}

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Working...' : activeMode === 'signup' ? 'Create Account' : activeMode === 'forgot' ? 'Send Reset Email' : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          {activeMode === 'signin' && (
            <>
              <button type="button" onClick={() => setMode('signup')}>Create Account</button>
              <button type="button" onClick={() => setMode('forgot')}>Forgot Password</button>
            </>
          )}
          {activeMode === 'signup' && <button type="button" onClick={() => setMode('signin')}>Already have an account? Sign in</button>}
          {activeMode === 'forgot' && <button type="button" onClick={() => setMode('signin')}>Back to sign in</button>}
        </div>
      </div>
    </div>
  );
}
