import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { calculateLevel } from '../utils/xp';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';

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

  // Image Cropping State
  const [cropFile, setCropFile] = useState(null);
  const [imgSrc, setImgSrc] = useState('');
  const [crop, setCrop] = useState({ unit: '%', width: 100, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

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

  const handleAvatarSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarError('');

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select a valid image file.');
      return;
    }
    
    setCropFile(file);
    const reader = new FileReader();
    reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset
  };

  const onImageLoad = (e) => {
    const { width, height } = e.currentTarget;
    const cropWidthInPercent = (Math.min(width, height) / width) * 100;
    const defaultCrop = {
      unit: '%',
      width: cropWidthInPercent,
      aspect: 1,
      x: (100 - cropWidthInPercent) / 2,
      y: 0,
    };
    setCrop(defaultCrop);
  };

  const getCroppedImg = async (image, crop) => {
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');
    
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(new File([blob], cropFile.name, { type: cropFile.type }));
      }, cropFile.type);
    });
  };

  const handleUploadCropped = async () => {
    if (!completedCrop || !imgRef.current || !cropFile) return;

    if (!supabase || !auth.user?.id) {
      setAvatarError('Cloud save is not active or you are not logged in.');
      setImgSrc('');
      return;
    }

    setUploadingAvatar(true);
    const prevSrc = imgSrc;
    setImgSrc(''); // close modal immediately
    try {
      // 1. Crop
      const croppedImage = await getCroppedImg(imgRef.current, completedCrop);
      
      // 2. Compress
      const compressedFile = await imageCompression(croppedImage, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 256,
        useWebWorker: true,
      });

      const fileExt = cropFile.name.split('.').pop()?.toLowerCase() || 'png';
      const safeExt = /^[a-z0-9]+$/.test(fileExt) ? fileExt : 'png';
      const fileName = `${Date.now()}-${crypto.randomUUID()}.${safeExt}`;
      const filePath = `${auth.user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: compressedFile.type,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (data?.publicUrl) {
        onChangeAvatar(`${data.publicUrl}?t=${Date.now()}`);
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setAvatarError(err?.message || 'Could not upload avatar. Please try again.');
      setImgSrc(prevSrc); // reopen on error
    } finally {
      setUploadingAvatar(false);
      setCropFile(null);
    }
  };

  return (
    <div>
      <div className="profile-header">
        <div className="profile-avatar" style={{ overflow: 'hidden' }}>
          {(profile.avatar || '').startsWith('http') ? (
            <img 
              src={profile.avatar} 
              alt="Profile" 
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} 
            />
          ) : null}
          <div style={{ display: (profile.avatar || '').startsWith('http') ? 'none' : 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            {!(profile.avatar || '').startsWith('http') && (profile.avatar || profile.username.charAt(0).toUpperCase())}
          </div>
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
            onChange={handleAvatarSelect}
            disabled={uploadingAvatar}
          />
        </div>

        {imgSrc && (
          <div className="modal-overlay" onClick={() => setImgSrc('')}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
              <div className="modal-title">Crop Avatar</div>
              <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#000', padding: '16px' }}>
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    style={{ maxHeight: '60vh' }}
                  />
                </ReactCrop>
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setImgSrc('')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleUploadCropped}>Save Avatar</button>
              </div>
            </div>
          </div>
        )}

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
          Settings
        </div>
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
