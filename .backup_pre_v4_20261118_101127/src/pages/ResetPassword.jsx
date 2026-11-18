import { useState } from 'react';

export default function ResetPassword({ updatePassword, onDone }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords must match.');
      return;
    }

    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="card" style={{ maxWidth: 400, margin: '40px auto' }}>
      <div className="section-title mb-16">Set New Password</div>
      
      {success ? (
        <div style={{ textAlign: 'center' }}>
          <div className="mb-16">Your password has been successfully reset!</div>
          <button className="btn btn-primary btn-full" onClick={onDone}>
            Continue
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <div className="form-error mb-16">{error}</div>}
          
          <label className="field-label" htmlFor="reset-password">New Password</label>
          <input
            id="reset-password"
            className="input-field mb-16"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />

          <label className="field-label" htmlFor="reset-confirm">Confirm Password</label>
          <input
            id="reset-confirm"
            className="input-field mb-16"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}
