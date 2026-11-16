import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { purchaseItem } from '../services/economyService';
import { supabase } from '../lib/supabase';
import { getToday } from '../utils/date';
import {
  getActiveSoundscape,
  playSoundscape,
  SOUNDSCAPES,
  stopSoundscape,
} from '../services/soundscapeService';

const SHOP_CATEGORIES = [
  { id: 'spin', label: '🎡 Gold Spin' },
  { id: 'entertain', label: '🎧 Audio & Themes' },
  { id: 'boosts', label: '⚡ Boosts' },
  { id: 'profile', label: '👤 Profile' },
  { id: 'premium', label: '⭐ Pro' },
];

const INVENTORY_KEY = 'dailyquest_shop_inventory_v2';
const SPIN_KEY = 'dailyquest_last_spin_date_v2';

const WHEEL_PRIZES = [
  { label: '+75 Gold', gold: 75 },
  { label: '+150 Gold', gold: 150 },
  { label: '+300 Gold', gold: 300 },
  { label: '+500 JACKPOT!', gold: 500 },
  { label: '+50 Gold', gold: 50 },
  { label: '+200 Gold', gold: 200 },
];

const THEMES = [
  { id: 'default', name: 'Midnight Blue (Default)', cost: 0, primary: '#3b82f6', accent: '#f59e0b' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', cost: 400, primary: '#ec4899', accent: '#06b6d4' },
  { id: 'emerald', name: 'Emerald Matrix', cost: 400, primary: '#10b981', accent: '#34d399' },
  { id: 'royal', name: 'Royal Gold', cost: 800, primary: '#f59e0b', accent: '#fde047' },
];

function loadInventory() {
  try {
    const raw = localStorage.getItem(INVENTORY_KEY);
    return raw ? JSON.parse(raw) : { unlockedThemes: ['default'], activeTheme: 'default', audioUnlocked: false, shields: 0 };
  } catch {
    return { unlockedThemes: ['default'], activeTheme: 'default', audioUnlocked: false, shields: 0 };
  }
}

function saveInventory(inv) {
  try {
    localStorage.setItem(INVENTORY_KEY, JSON.stringify(inv));
  } catch {
    // ignore
  }
  return inv;
}

export function applyThemeColors(themeId) {
  const t = THEMES.find((x) => x.id === themeId) || THEMES[0];
  if (typeof document !== 'undefined') {
    document.documentElement.style.setProperty('--primary', t.primary);
    document.documentElement.style.setProperty('--accent', t.accent);
  }
}

export default function Shop({ data, onAdjustGold, onNavigate, showToast }) {
  const { user, profile, refreshProfile } = useAuth();
  const { isPremium } = usePremium();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [category, setCategory] = useState('spin');
  const [inventory, setInventory] = useState(() => loadInventory());
  const [activeTrack, setActiveTrack] = useState(() => getActiveSoundscape());
  const [spinning, setSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState(null);
  const [lastSpinDate, setLastSpinDate] = useState(() => localStorage.getItem(SPIN_KEY) || '');

  const coins = data?.profile?.coins ?? profile?.coins ?? 0;
  const today = getToday();
  const freeSpinReady = lastSpinDate !== today;

  const handleSpin = () => {
    if (spinning) return;
    setError('');
    if (!freeSpinReady && coins < 150) {
      setError('Need 150 Gold for an extra spin!');
      return;
    }
    if (!freeSpinReady) {
      onAdjustGold?.(-150, 'Extra Gold Wheel Spin');
    } else {
      localStorage.setItem(SPIN_KEY, today);
      setLastSpinDate(today);
    }

    setSpinning(true);
    setSpinResult(null);
    setTimeout(() => {
      const prize = WHEEL_PRIZES[Math.floor(Math.random() * WHEEL_PRIZES.length)];
      onAdjustGold?.(prize.gold, `Gold Wheel Prize: ${prize.label}`);
      setSpinResult(prize);
      setSpinning(false);
      showToast?.(`🎡 Won ${prize.label}!`);
    }, 900);
  };

  const handleUnlockAudio = () => {
    if (inventory.audioUnlocked) return;
    if (coins < 300) {
      setError('Need 300 Gold to unlock Binaural Focus Audio Studio.');
      return;
    }
    onAdjustGold?.(-300, 'Unlocked Binaural Focus Audio Studio');
    const next = saveInventory({ ...inventory, audioUnlocked: true });
    setInventory(next);
    setSuccess('🎧 Binaural Focus Audio Studio unlocked!');
  };

  const handleThemeAction = (theme) => {
    const owned = inventory.unlockedThemes.includes(theme.id);
    if (!owned) {
      if (coins < theme.cost) {
        setError(`Need ${theme.cost} Gold to unlock ${theme.name}.`);
        return;
      }
      onAdjustGold?.(-theme.cost, `Unlocked Theme: ${theme.name}`);
    }
    const unlockedThemes = owned ? inventory.unlockedThemes : [...inventory.unlockedThemes, theme.id];
    const next = saveInventory({ ...inventory, unlockedThemes, activeTheme: theme.id });
    setInventory(next);
    applyThemeColors(theme.id);
    setSuccess(`Applied theme: ${theme.name}`);
  };

  const handleBuyShield = () => {
    if (coins < 400) {
      setError('Need 400 Gold for a Streak Freeze Shield.');
      return;
    }
    onAdjustGold?.(-400, 'Bought Streak Freeze Shield');
    const next = saveInventory({ ...inventory, shields: (inventory.shields || 0) + 1 });
    setInventory(next);
    setSuccess('🛡️ Streak Freeze Shield added to your inventory!');
  };

  const handleLegacyPurchase = async (itemId, payload = {}) => {
    if (!user) {
      setError('Sign in to sync cloud profile purchases.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await purchaseItem(itemId, payload);
      if (result.success) {
        setSuccess('Purchase successful!');
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
    if (!user) {
      if (coins < cost) {
        setError(`Need ${cost} Gold.`);
        return;
      }
      onAdjustGold?.(-cost, `Bought ${itemId}`);
      setSuccess('Boost activated locally!');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { data: res, error: rpcError } = await supabase.rpc('purchase_shop_item', {
        p_item_id: itemId,
        p_cost: cost,
      });
      if (rpcError) throw rpcError;
      if (res?.success) {
        setSuccess('Boost purchased successfully!');
        await refreshProfile();
      } else {
        setError(`Purchase failed: ${res?.reason || 'Unknown error'}`);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-title">Gold Shop & Entertainment</div>
      <div className="page-subtitle">Balance: 🪙 <strong>{coins}</strong> Gold · 🛡️ Shields: {inventory.shields || 0}</div>

      <div className="chip-scroll mb-16">
        {SHOP_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`chip-btn ${category === cat.id ? 'active' : ''}`}
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

      {category === 'spin' && (
        <div className="card mb-16" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 8 }}>{spinning ? '🌀' : '🎡'}</div>
          <div className="section-title mb-16">Daily Lucky Gold Wheel</div>
          <div className="duel-sub mb-16">
            Win between +50 and +500 Gold! {freeSpinReady ? 'Your FREE daily spin is ready!' : 'Extra spins cost 150 Gold.'}
          </div>
          {spinResult && (
            <div className="card mb-16" style={{ borderColor: 'var(--accent)', background: 'rgba(245,158,11,0.12)' }}>
              <strong>🎉 Won {spinResult.label}!</strong>
            </div>
          )}
          <button className="btn btn-accent btn-full" onClick={handleSpin} disabled={spinning}>
            {spinning ? 'Spinning...' : freeSpinReady ? '🎁 Spin FREE Daily Wheel' : '🪙 Spin Again (150 Gold)'}
          </button>
        </div>
      )}

      {category === 'entertain' && (
        <>
          <div className="card mb-16">
            <div className="section-header" style={{ marginBottom: 8 }}>
              <span className="section-title">🎧 Binaural Focus Audio Studio</span>
              {!inventory.audioUnlocked && <span className="tag tag-reward">300 🪙</span>}
            </div>
            <div className="duel-sub mb-16">
              Real-time Web Audio synthesizer for Alpha 10Hz Focus, Gamma 40Hz Genius, and Deep Brown Noise.
            </div>
            {!inventory.audioUnlocked ? (
              <button className="btn btn-primary btn-full" onClick={handleUnlockAudio}>
                Unlock Audio Studio (300 🪙)
              </button>
            ) : (
              <div>
                {SOUNDSCAPES.map((s) => {
                  const playing = activeTrack === s.id;
                  return (
                    <div key={s.id} className="quest-card" style={{ padding: '10px 12px' }}>
                      <div className="quest-body">
                        <div className="quest-title">{s.name}</div>
                        <div className="duel-sub">{s.desc}</div>
                      </div>
                      <button
                        className={`btn ${playing ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => {
                          if (playing) {
                            stopSoundscape();
                            setActiveTrack(null);
                          } else {
                            playSoundscape(s.id);
                            setActiveTrack(s.id);
                          }
                        }}
                      >
                        {playing ? '⏹ Stop' : '▶ Play'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">🎨 App Color Themes</div>
            {THEMES.map((t) => {
              const owned = inventory.unlockedThemes.includes(t.id);
              const active = inventory.activeTheme === t.id;
              return (
                <div key={t.id} className="quest-card" style={{ padding: '10px 12px' }}>
                  <div className="quest-body">
                    <div className="quest-title">{t.name}</div>
                    <div className="duel-sub">
                      <span style={{ color: t.primary }}>● Primary</span> · <span style={{ color: t.accent }}>● Accent</span>
                    </div>
                  </div>
                  <button
                    className={`btn ${active ? 'btn-secondary' : 'btn-primary'}`}
                    disabled={active}
                    onClick={() => handleThemeAction(t)}
                  >
                    {active ? 'Active' : owned ? 'Apply' : `Buy ${t.cost} 🪙`}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {category === 'boosts' && (
        <>
          <div className="card mb-16">
            <div className="section-title mb-16">🛡️ Streak Freeze Shield</div>
            <div className="duel-sub mb-16">Protect your Daily Streak if you miss a day.</div>
            <button className="btn btn-accent btn-full" onClick={handleBuyShield}>
              Buy Streak Shield (400 🪙)
            </button>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">⚡ 2x XP Boost (24 Hours)</div>
            <div className="duel-sub mb-16">Double all XP gained from Quests and Daily Duels for 24 hours.</div>
            <button
              className="btn btn-accent btn-full"
              onClick={() => handleBoostPurchase('xp_multiplier_2x', 5000)}
              disabled={loading || coins < 5000}
            >
              Buy 2x XP Boost (5,000 🪙)
            </button>
          </div>

          <div className="card mb-16">
            <div className="section-title mb-16">📜 Extra 5 Tasks (24 Hours)</div>
            <div className="duel-sub mb-16">Get an additional 5 daily quests for 24 hours.</div>
            <button
              className="btn btn-accent btn-full"
              onClick={() => handleBoostPurchase('extra_tasks_5', 10000)}
              disabled={loading || coins < 10000}
            >
              Buy Extra Tasks (10,000 🪙)
            </button>
          </div>
        </>
      )}

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
            <div className="duel-sub mb-16">Cost: 5,000 Gold</div>
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

      {category === 'premium' && (
        <div className="card mb-16">
          <div className="section-title mb-16">DailyQuest Pro - 14 Days</div>
          <div className="duel-sub mb-16">Cost: 50,000 Gold. Unlocks all Genius features & zero ads.</div>
          <button
            className="btn btn-accent btn-full"
            onClick={() => handleLegacyPurchase('premium_14_days')}
            disabled={loading || coins < 50000}
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
