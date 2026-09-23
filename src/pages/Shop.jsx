import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { purchaseItem } from '../services/economyService';

export default function Shop({ onNavigate }) {
  const { user, profile, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newUsername, setNewUsername] = useState('');

  const handlePurchase = async (itemId, payload = {}) => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await purchaseItem(itemId, payload);
      if (result.success) {
        setSuccess(`Purchase successful! Remaining Gold: ${result.remaining_gold}`);
        await refreshProfile();
        if (itemId === 'change_username') setNewUsername('');
      } else {
        setError(`Purchase failed: ${result.reason}`);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-title">Gold Shop</div>
      <div className="page-subtitle">Your Balance: 🪙 {profile?.coins || 0} Gold</div>

      {error && <div className="form-error mb-16">{error}</div>}
      {success && <div className="toast">{success}</div>}

      <div className="card mb-16">
        <div className="section-title mb-16">Change Username</div>
        <div className="duel-sub mb-16">
          Cost: {isPremium ? 'Free (Pro)' : '10,000 Gold'}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            className="input-field"
            placeholder="New username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            disabled={loading}
          />
          <button
            className="btn btn-primary"
            onClick={() => handlePurchase('change_username', { new_username: newUsername })}
            disabled={loading || !newUsername.trim()}
          >
            Buy
          </button>
        </div>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Premium - 14 Days</div>
        <div className="duel-sub mb-16">
          Cost: 50,000 Gold. Extends your existing subscription safely.
        </div>
        <button
          className="btn btn-accent btn-full"
          onClick={() => handlePurchase('premium_14_days')}
          disabled={loading}
        >
          Buy Premium (50k 🪙)
        </button>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Change Avatar</div>
        <div className="duel-sub mb-16">
          Cost: 5,000 Gold.
        </div>
        <button
          className="btn btn-secondary btn-full"
          onClick={() => {
            const avatar = prompt('Enter emoji for your new avatar:');
            if (avatar) handlePurchase('change_avatar', { new_avatar: avatar });
          }}
          disabled={loading}
        >
          Buy New Avatar (5k 🪙)
        </button>
      </div>

      <button className="btn btn-secondary btn-full" onClick={() => onNavigate('profile')}>
        Back to Profile
      </button>
    </div>
  );
}
