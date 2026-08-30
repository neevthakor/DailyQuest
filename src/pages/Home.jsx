import { calculateLevel } from '../utils/xp';
import { getToday } from '../utils/date';
import { hasPlayedDuelToday } from '../services/duelService';
import { CATEGORY_ICONS } from '../data/quests';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import ProgressBar from '../components/ProgressBar';
import AdPlaceholder from '../components/AdPlaceholder';

export default function Home({ data, onNavigate }) {
  const { profile, quests, achievements } = data;
  const levelInfo = calculateLevel(profile.xp);
  const today = getToday();
  const completedCount = quests.items.filter((q) => q.completed).length;
  const duelPlayed = hasPlayedDuelToday(data, today);
  const recentAch = achievements.filter((a) => a.unlocked).slice(-3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div>
      <div className="greeting">{greeting}, <span className="greeting-name">{profile.username}</span> 👋</div>

      <div className="streak-banner">
        <span className="streak-icon">🔥</span>
        <div>
          <div className="streak-text">{profile.streak} Day Streak</div>
          <div className="streak-sub">
            {completedCount >= 3 ? "Today's streak secured!" : `${3 - completedCount} more quests to keep it alive`}
          </div>
        </div>
      </div>

      <div className="level-card">
        <div className="level-header">
          <div className="level-badge">
            <div className="level-circle">{levelInfo.level}</div>
            <div>
              <div className="level-label">Level</div>
              <div className="level-number">{levelInfo.level}</div>
            </div>
          </div>
          <div className="coins-display">🪙 {profile.coins}</div>
        </div>
        <ProgressBar
          value={levelInfo.xpIntoLevel}
          max={levelInfo.xpForNextLevel}
          label={`${levelInfo.xpIntoLevel} / ${levelInfo.xpForNextLevel} XP`}
          sublabel={`Next: Lvl ${levelInfo.level + 1}`}
        />
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

      <div
        className={`duel-card ${duelPlayed ? 'played' : ''}`}
        onClick={() => !duelPlayed && onNavigate('duel')}
      >
        <div className="duel-icon">⚔️</div>
        <div className="duel-title">Daily Duel</div>
        <div className="duel-sub">
          {duelPlayed ? 'Played today — come back tomorrow!' : `Play today's challenge for +${DUEL_XP_REWARD} XP & ${DUEL_COIN_REWARD} coins`}
        </div>
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

      <AdPlaceholder />
    </div>
  );
}
