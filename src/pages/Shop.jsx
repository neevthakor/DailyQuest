import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { purchaseItem } from '../services/economyService';
import { supabase } from '../lib/supabase';

const SHOP_CATEGORIES = [
  { id: 'profile', label: 'Profile' },
  { id: 'boosts', label: 'Boosts & Tasks' },
  { id: 'premium', label: 'Premium' },
];

export default function Shop({ onNavigate }) {
  const { user, profile, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [category, setCategory] = useState('boosts');

  const handleLegacyPurchase = async (itemId, payload = {}) => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await purchaseItem(itemId, payload);
      if (result.success) {
        setSuccess(`Purchase successful!`);
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

  const handleBoostPurchase = async (itemId, cost) => {
    if (!user) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data, error: rpcError } = await supabase.rpc('purchase_shop_item', {
        p_item_id: itemId,
        p_cost: cost,
      });
      if (rpcError) throw rpcError;
      
      if (data?.success) {
        setSuccess(`Boost purchased successfully!`);
        await refreshProfile();
      } else {
        setError(`Purchase failed: ${data?.reason || 'Unknown error'}`);
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

      <div className="leaderboard-tabs mb-16">
        {SHOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`leaderboard-tab ${category === cat.id ? 'active' : ''}`}
            onClick={() => {
              setCategory(cat.id);
              setError('');
              setSuccess('');
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {error && <div className="form-error mb-16">{error}</div>}
      {success && <div className="toast">{success}</div>}

      {category === 'profile' && (
        <>
          <div className="card mb-16">
            <div className="section-title mb-16">Change Username</div>
            <div className="duel-sub mb-16">Cost: {isPremium ? 'Free (Pro)' : '10,000 Gold'}</div>
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
                onClick={() => handleLegacyPurchase('change_username', { new_username: newUsername })}
                disabled={loading || !newUsername.trim()}
              >
                Buy
              </button>
            </div>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">Change Avatar Emoji</div>
            <div className="duel-sub mb-16">Cost: 5,000 Gold (Custom image uploads are free in Profile)</div>
            <button
              className="btn btn-secondary btn-full"
              onClick={() => {
                const avatar = prompt('Enter emoji for your new avatar:');
                if (avatar) handleLegacyPurchase('change_avatar', { new_avatar: avatar });
              }}
              disabled={loading}
            >
              Buy Emoji Avatar (5k 🪙)
            </button>
          </div>
        </>
      )}

      {category === 'boosts' && (
        <>
          <div className="card mb-16">
            <div className="section-title mb-16">2x XP Boost (24 Hours)</div>
            <div className="duel-sub mb-16">Double all XP gained from Quests and Daily Duels for 24 hours. Stacks duration.</div>
            <button
              className="btn btn-accent btn-full"
              onClick={() => handleBoostPurchase('xp_multiplier_2x', 5000)}
              disabled={loading || (profile?.coins || 0) < 5000}
            >
              Buy 2x XP Boost (5,000 🪙)
            </button>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">Extra 5 Tasks (24 Hours)</div>
            <div className="duel-sub mb-16">Get an additional 5 daily quests for 24 hours. Maximize your Gold!</div>
            <button
              className="btn btn-accent btn-full"
              onClick={() => handleBoostPurchase('extra_tasks_5', 10000)}
              disabled={loading || (profile?.coins || 0) < 10000}
            >
              Buy Extra Tasks (10,000 🪙)
            </button>
          </div>
        </>
      )}

      {category === 'premium' && (
        <div className="card mb-16">
          <div className="section-title mb-16">Premium - 14 Days</div>
          <div className="duel-sub mb-16">Cost: 50,000 Gold. Extends your existing subscription safely.</div>
          <button
            className="btn btn-accent btn-full"
            onClick={() => handleLegacyPurchase('premium_14_days')}
            disabled={loading || (profile?.coins || 0) < 50000}
          >
            Buy Premium (50,000 🪙)
          </button>
        </div>
      )}

      <button className="btn btn-secondary btn-full" onClick={() => onNavigate('hub-rewards')}>
        Back to Rewards
      </button>
    </div>
  );
}
