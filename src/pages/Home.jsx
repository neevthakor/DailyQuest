import { calculateLevel } from '../utils/xp';
import { getToday } from '../utils/date';
import { getTodayDuelProgress, TRIFECTA_BONUS_GOLD } from '../services/duelService';
import { CATEGORY_ICONS } from '../data/quests';
import ProgressBar from '../components/ProgressBar';
import AdPlaceholder from '../components/AdPlaceholder';
import { usePremium } from '../hooks/usePremium';
import { useAuth } from '../context/AuthContext';
import { shouldShowAds } from '../services/adsService';
import { claimDailyReward } from '../services/economyService';
import { getRankTitle } from '../services/rpgService';
import { canUsePhoenixRecovery, markPhoenixUsed } from '../services/psychologyService';
import { useState } from 'react';

export default function Home({ data, onNavigate, showToast }) {
  const { isPremium } = usePremium();
  const { profile, quests, achievements } = data;
  const levelInfo = calculateLevel(profile.xp);
  const rank = getRankTitle(profile.xp);
  const today = getToday();
  const completedCount = quests.items.filter((q) => q.completed).length;
  const { completedSlots, allThreeDone } = getTodayDuelProgress(data, today);
  const recentAch = achievements.filter((a) => a.unlocked).slice(-3);
  const hour = new Date().getHours();

  const [claiming, setClaiming] = useState(false);
  const [localClaimDate, setLocalClaimDate] = useState(null);
  const [phoenixDone, setPhoenixDone] = useState(false);
  const { refreshProfile } = useAuth();

  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const effectiveClaimDate = localClaimDate || profile?.last_daily_reward_claim_date;
  const canClaimDaily = effectiveClaimDate !== today;
  const showPhoenix = !phoenixDone && canUsePhoenixRecovery(profile.streak);

  const handlePhoenix = () => {
    markPhoenixUsed();
    setPhoenixDone(true);
    showToast?.('🔥 Phoenix Recovery activated! Complete 1 Brain Duel to reignite!');
    onNavigate('duel');
  };

  const handleClaimReward = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const result = await claimDailyReward();
      if (result.success) {
        showToast(`Claimed ${result.reward} 🪙! Streak: ${result.streak}`);
        setLocalClaimDate(today);
        await refreshProfile();
      } else {
        if (result.reason === 'already_claimed') {
          setLocalClaimDate(today);
          showToast('Already claimed today!');
        } else {
          showToast(result.reason === 'not_authenticated' ? 'Spin the Daily Gold Wheel in Shop for free Gold!' : (result.reason || 'Could not claim reward'));
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to claim reward');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div>
      <div className="greeting">
        {greeting}, <span className="greeting-name">{profile.username}</span> {rank.badge}
      </div>

      <div className="streak-banner">
        <span className="streak-icon">🔥</span>
        <div>
          <div className="streak-text">{profile.streak} Day Streak · {rank.title}</div>
          <div className="streak-sub">
            {completedCount >= 3 ? "Today's streak secured!" : `${3 - completedCount} more quests to keep it alive`}
          </div>
        </div>
      </div>

      {showPhoenix && (
        <div className="card mb-16" style={{ borderColor: 'var(--error)', background: 'rgba(239,68,68,0.1)' }}>
          <div className="inline-edit-row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700 }}>🔥 Phoenix Streak Recovery</div>
              <div className="duel-sub">No guilt — play 1 Brain Duel now to reignite your flame!</div>
            </div>
            <button className="btn btn-accent" onClick={handlePhoenix}>Reignite</button>
          </div>
        </div>
      )}

      {canClaimDaily && (
        <div className="card mb-16" style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Daily Reward</div>
            <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Claim your free Gold!</div>
          </div>
          <button
            className="btn btn-secondary"
            style={{ color: '#f59e0b', background: '#fff' }}
            onClick={handleClaimReward}
            disabled={claiming}
          >
            {claiming ? '...' : 'Claim'}
          </button>
        </div>
      )}

      <div className="level-card">
        <div className="level-header">
          <div className="level-badge">
            <div className="level-circle">{levelInfo.level}</div>
            <div>
              <div className="level-label">{rank.title}</div>
              <div className="level-number">Lvl {levelInfo.level}</div>
            </div>
          </div>
          <div className="coins-display" style={{ cursor: 'pointer' }} onClick={() => onNavigate('shop')}>
            🪙 {profile.coins}
          </div>
        </div>
        <ProgressBar
          value={levelInfo.xpIntoLevel}
          max={levelInfo.xpForNextLevel}
          label={`${levelInfo.xpIntoLevel} / ${levelInfo.xpForNextLevel} XP`}
          sublabel={`Next: Lvl ${levelInfo.level + 1}`}
        />
      </div>

      <div className={`duel-card ${allThreeDone ? 'played' : ''}`} onClick={() => onNavigate('duel')}>
        <div className="duel-icon">⚔️</div>
        <div className="duel-title">Daily Brain Duels ({completedSlots}/3)</div>
        <div className="duel-sub">
          {allThreeDone
            ? `All 3 puzzles cleared! Play 32-Game Arcade anytime.`
            : `Play 3 daily puzzles to win +${TRIFECTA_BONUS_GOLD} Trifecta Gold!`}
        </div>
      </div>

      <div className="arcade-grid mb-16">
        <div className="card arcade-card" onClick={() => onNavigate('skill-tree')}>
          <div className="arcade-icon">🧬</div>
          <div className="arcade-title">Skill Tree & Boss</div>
          <div className="duel-sub">RPG perks & Weekly Raid</div>
        </div>
        <div className="card arcade-card" onClick={() => onNavigate('ai-coach')}>
          <div className="arcade-icon">🤖</div>
          <div className="arcade-title">AI Brain Coach</div>
          <div className="duel-sub">Device behavior & goal plan</div>
        </div>
        <div className="card arcade-card" onClick={() => onNavigate('todos')}>
          <div className="arcade-icon">⏱️</div>
          <div className="arcade-title">Live Task Timer</div>
          <div className="duel-sub">2m Micro-Start & +2 🪙/min</div>
        </div>
        <div className="card arcade-card" onClick={() => onNavigate('weekly-report')}>
          <div className="arcade-icon">📊</div>
          <div className="arcade-title">Weekly Graphs</div>
          <div className="duel-sub">Shareable PNG Brain Card</div>
        </div>
      </div>

      <div className="section-header">
        <span className="section-title">Today's Quests</span>
        <button className="section-link" onClick={() => onNavigate('quests')}>View all →</button>
      </div>
      <div className="mb-16">
        {quests.items.slice(0, 3).map((q) => (
          <div key={q.id} className="quest-card" style={{ padding: '10px 12px' }}>
            <div className="quest-icon" style={{ width: '36px', height: '36px', fontSize: '1.2rem' }}>
              {CATEGORY_ICONS[q.category] || '❓'}
            </div>
            <div className="quest-body">
              <div className="quest-title" style={{ fontSize: '0.85rem' }}>{q.title}</div>
              <div className="quest-meta">
                <span className="tag tag-reward">+{q.xpReward} XP</span>
                <span className="tag tag-reward">+{q.coinReward} 🪙</span>
                {q.completed && <span className="tag tag-easy">✓ Done</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="section-header">
        <span className="section-title">Recent Achievements</span>
        <button className="section-link" onClick={() => onNavigate('achievements')}>View all →</button>
      </div>
      {recentAch.length > 0 ? (
        <div className="ach-grid mb-16">
          {recentAch.map((a) => (
            <div key={a.id} className="ach-card unlocked">
              <div className="ach-icon">{a.icon}</div>
              <div className="ach-name">{a.name}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state mb-16">No achievements yet. Complete quests to unlock them!</div>
      )}

      {shouldShowAds(isPremium) && <AdPlaceholder />}
    </div>
  );
}
