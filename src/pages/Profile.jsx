import { useEffect, useState } from 'react';
import { calculateLevel } from '../utils/xp';

const AVATARS = ['⚡', '🛡️', '🔥', '🌙', '🏆', '💎'];

export default function Profile({
  data,
  onChangeUsername,
  onChangeAvatar,
  onReset,
  onNavigate,
  auth,
  cloudSaving,
  cloudError,
}) {
  const { profile } = data;
  const levelInfo = calculateLevel(profile.xp);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [showReset, setShowReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!editing) setName(profile.username);
  }, [editing, profile.username]);

  const handleSaveName = () => {
    if (onChangeUsername(name)) {
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    await auth.signOut();
    setSigningOut(false);
  };

  const handleReset = () => {
    onReset();
    setShowReset(false);
  };

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar">{profile.avatar || profile.username.charAt(0).toUpperCase()}</div>
        <div className="profile-name">{profile.username}</div>
        <div className="page-subtitle" style={{ marginBottom: '0' }}>
          Level {levelInfo.level} • {profile.totalXPEarned} Total XP
        </div>
        <div className={`account-badge ${auth.isAuthenticated ? 'online' : ''}`}>
          {auth.isAuthenticated ? (cloudSaving ? 'Saving cloud profile...' : 'Cloud profile active') : 'Local profile on this device'}
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat">
          <div className="profile-stat-value">🪙 {profile.coins}</div>
          <div className="profile-stat-label">Coins</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">🔥 {profile.streak}</div>
          <div className="profile-stat-label">Streak</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">{profile.totalQuestsCompleted}</div>
          <div className="profile-stat-label">Quests Done</div>
        </div>
        <div className="profile-stat">
          <div className="profile-stat-value">{profile.bestDuelScore}</div>
          <div className="profile-stat-label">Best Duel</div>
        </div>
      </div>

      {cloudError && <div className="form-error mb-16">{cloudError}</div>}

      {!auth.isAuthenticated && (
        <div className="card mb-16 cloud-card">
          <div className="section-title mb-16">Cloud Save</div>
          <div className="profile-help">
            Sign in to persist your profile, recover it on another device, and prepare for future leaderboard and social features.
          </div>
          <button className="btn btn-primary btn-full" onClick={() => onNavigate('auth')}>Sign In / Create Account</button>
        </div>
      )}

      <div className="card mb-16">
        <div className="section-title mb-16">Username</div>
        {editing ? (
          <div className="inline-edit-row">
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
            />
            <button className="btn btn-primary" onClick={handleSaveName}>Save</button>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setName(profile.username); }}>Cancel</button>
          </div>
        ) : (
          <div className="profile-row">
            <span>{profile.username}</span>
            <button className="btn btn-secondary" onClick={() => setEditing(true)}>Change</button>
          </div>
        )}
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Avatar</div>
        <div className="avatar-picker profile-avatar-picker">
          {AVATARS.map((item) => (
            <button
              key={item}
              type="button"
              className={`avatar-choice ${profile.avatar === item ? 'active' : ''}`}
              onClick={() => onChangeAvatar(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">More</div>
        <button className="btn btn-secondary btn-full mb-16" onClick={() => onNavigate('premium')}>
          ⭐ View Premium
        </button>
        <button className="btn btn-secondary btn-full mb-16" onClick={() => onNavigate('achievements')}>
          🏆 View Achievements
        </button>
        {auth.isAuthenticated && (
          <button className="btn btn-secondary btn-full" onClick={handleSignOut} disabled={signingOut}>
            {signingOut ? 'Signing out...' : 'Logout'}
          </button>
        )}
      </div>

      <div className="card" style={{ borderColor: 'var(--error)' }}>
        <div className="section-title mb-16" style={{ color: 'var(--error)' }}>Danger Zone</div>
        <button className="btn btn-danger btn-full" onClick={() => setShowReset(true)}>
          Reset All Progress
        </button>
      </div>

      {showReset && (
        <div className="modal-overlay" onClick={() => setShowReset(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Reset all progress?</div>
            <div className="modal-body">
              This will permanently erase your XP, level, coins, streak, quests, and achievements. This cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReset(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
