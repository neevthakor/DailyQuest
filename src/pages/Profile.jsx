import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  isAdmin,
}) {
  const { profile } = data;
  const levelInfo = calculateLevel(profile.xp);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.username);
  const [showReset, setShowReset] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (!editing) {
      setName(profile.username);
    }
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

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be less than 5 MB.');
      return;
    }

    if (!supabase || !auth.user?.id) {
      setAvatarError('Cloud save is not active or you are not logged in.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'png';
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
      const filePath = `${auth.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        onChangeAvatar(data.publicUrl);
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setAvatarError(err?.message || 'Could not upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar" style={{ overflow: 'hidden' }}>
          {(profile.avatar || '').startsWith('http') ? (
            <img src={profile.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            profile.avatar || profile.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="profile-name">
          {profile.username}
        </div>

        <div
          className="page-subtitle"
          style={{ marginBottom: '0' }}
        >
          Level {levelInfo.level} • {profile.totalXPEarned} Total XP
        </div>

        <div
          className={`account-badge ${
            auth.isAuthenticated ? 'online' : ''
          }`}
        >
          {auth.isAuthenticated
            ? cloudSaving
              ? 'Saving cloud profile...'
              : 'Cloud profile active'
            : 'Local profile on this device'}
        </div>
      </div>

      <div className="profile-stats">
        <div className="profile-stat" onClick={() => onNavigate('gold-history')} style={{ cursor: 'pointer' }}>
          <div className="profile-stat-value" style={{ color: '#f59e0b' }}>
            🪙 {profile.coins}
          </div>
          <div className="profile-stat-label">
            Gold
          </div>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-value">
            🔥 {profile.streak}
          </div>
          <div className="profile-stat-label">
            Streak
          </div>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-value">
            {profile.totalQuestsCompleted}
          </div>
          <div className="profile-stat-label">
            Quests Done
          </div>
        </div>

        <div className="profile-stat">
          <div className="profile-stat-value">
            {profile.bestDuelScore}
          </div>
          <div className="profile-stat-label">
            Best Duel
          </div>
        </div>
      </div>

      {cloudError && (
        <div className="form-error mb-16">
          {cloudError}
        </div>
      )}

      {!auth.isAuthenticated && (
        <div className="card mb-16 cloud-card">
          <div className="section-title mb-16">
            Cloud Save
          </div>

          <div className="profile-help">
            Sign in to persist your profile, recover it on another
            device, and prepare for future leaderboard and social
            features.
          </div>

          <button
            className="btn btn-primary btn-full"
            onClick={() => onNavigate('auth')}
          >
            Sign In / Create Account
          </button>
        </div>
      )}

      <div className="card mb-16">
        <div className="section-title mb-16">
          Username
        </div>
        <div className="profile-row">
          <span>{profile.username}</span>

          <button
            className="btn btn-secondary"
            onClick={() => onNavigate('shop')}
          >
            Change in Shop
          </button>
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">
          Avatar
        </div>
        
        {avatarError && <div className="form-error mb-16">{avatarError}</div>}

        <div className="mb-16">
          <label htmlFor="avatar-upload" className="btn btn-secondary btn-full" style={{ display: 'block', textAlign: 'center', cursor: 'pointer' }}>
            {uploadingAvatar ? 'Uploading...' : '📸 Upload Custom Avatar'}
          </label>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/png,image/jpeg,image/webp,image/gif" 
            style={{ display: 'none' }} 
            onChange={handleAvatarUpload}
            disabled={uploadingAvatar}
          />
        </div>

        <div className="duel-sub text-center mb-16">Or choose an emoji</div>

        <div className="avatar-picker profile-avatar-picker">
          {AVATARS.map((item) => (
            <button
              key={item}
              type="button"
              className={`avatar-choice ${
                profile.avatar === item ? 'active' : ''
              }`}
              onClick={() => onChangeAvatar(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">
          More
        </div>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('premium')}
        >
          ⭐ Premium
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('achievements')}
        >
          🏆 View Achievements
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('todos')}
        >
          ✅ My Tasks
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('goals')}
        >
          🎯 Goals
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('feed')}
        >
          📰 Progress Feed
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('groups')}
        >
          👥 Groups
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('analytics')}
        >
          📈 Analytics
        </button>

        <button
          className="btn btn-secondary btn-full mb-16"
          onClick={() => onNavigate('weekly-report')}
        >
          🗓️ Weekly Report
        </button>
          {isAdmin && (
  <button
    className="btn btn-accent btn-full mb-16"
    onClick={() => onNavigate('admin-payments')}
  >
    💳 Admin Payments
  </button>
)}
        {auth.isAuthenticated && (
          <button
            className="btn btn-secondary btn-full"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? 'Signing out...' : 'Logout'}
          </button>
        )}
      </div>

      <div
        className="card"
        style={{ borderColor: 'var(--error)' }}
      >
        <div
          className="section-title mb-16"
          style={{ color: 'var(--error)' }}
        >
          Danger Zone
        </div>

        <button
          className="btn btn-danger btn-full"
          onClick={() => setShowReset(true)}
        >
          Reset All Progress
        </button>
      </div>

      {showReset && (
        <div
          className="modal-overlay"
          onClick={() => setShowReset(false)}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">
              Reset all progress?
            </div>

            <div className="modal-body">
              This will permanently erase your XP, level, coins,
              streak, quests, and achievements. This cannot be undone.
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowReset(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-danger"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}