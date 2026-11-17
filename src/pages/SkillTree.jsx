import { useState } from 'react';
import {
  getCurrentBoss,
  getRankTitle,
  getSkillTreeData,
  recordBossClear,
} from '../services/rpgService';
import BrainGameEngine from '../components/duel/BrainGameEngine';

export default function SkillTree({ data, onAdjustGold, onNavigate, showToast }) {
  const [bossMode, setBossMode] = useState(false);
  const [bossRound, setBossRound] = useState(0);
  const [bossScores, setBossScores] = useState([]);
  const [bossResult, setBossResult] = useState(null);

  const xp = data?.profile?.xp || 0;
  const rank = getRankTitle(xp);
  const skills = getSkillTreeData();
  const boss = getCurrentBoss();

  const handleBossRoundFinish = (score) => {
    const next = [...bossScores, score];
    setBossScores(next);
    if (bossRound + 1 >= boss.games.length) {
      const total = next.reduce((a, b) => a + b, 0);
      const defeated = total >= boss.targetScore;
      let reward = 0;
      if (defeated) {
        reward = Math.round(boss.rewardMin + Math.random() * (boss.rewardMax - boss.rewardMin));
        recordBossClear(boss.weekNum, total);
        onAdjustGold?.(reward, `Defeated Weekly Boss: ${boss.name}`);
        showToast?.(`🏆 Boss Defeated! +${reward} Gold!`);
      }
      setBossResult({ total, defeated, reward });
      setBossMode(false);
    } else {
      setBossRound(bossRound + 1);
    }
  };

  if (bossMode) {
    const currentGame = boss.games[bossRound];
    const runningTotal = bossScores.reduce((a, b) => a + b, 0);
    return (
      <div>
        <div className="section-header">
          <div className="page-title" style={{ marginBottom: 0 }}>
            {boss.icon} {boss.name}
          </div>
          <button className="btn btn-secondary" onClick={() => setBossMode(false)}>Retreat</button>
        </div>
        <div className="page-subtitle">
          Round {bossRound + 1}/5 · Running Score: <strong>{runningTotal}</strong> / {boss.targetScore}
        </div>
        <div className="progress-bar mb-16">
          <div className="progress-bar-fill" style={{ width: `${Math.min(100, (runningTotal / boss.targetScore) * 100)}%`, background: 'var(--error)' }} />
        </div>
        <BrainGameEngine gameId={currentGame.id} difficulty="Hard" onFinish={handleBossRoundFinish} />
      </div>
    );
  }

  return (
    <div>
      <div className="page-title">RPG Skill Tree & Boss Raid</div>
      <div className="page-subtitle">
        Current Rank: <strong>{rank.badge} {rank.title}</strong> ({xp} XP)
      </div>

      {bossResult && (
        <div className="card mb-16" style={{ borderColor: bossResult.defeated ? 'var(--success)' : 'var(--error)' }}>
          <div className="section-title mb-16">
            {bossResult.defeated ? `🏆 ${boss.name} Defeated!` : `💀 ${boss.name} Survived`}
          </div>
          <div className="duel-sub">
            Total Score: <strong>{bossResult.total}</strong> / {boss.targetScore}
            {bossResult.defeated ? ` · Boss Chest: +${bossResult.reward} 🪙!` : ' · Train your weakest domain and try again!'}
          </div>
        </div>
      )}

      {/* WEEKLY BOSS RAID */}
      <div className="card mb-16" style={{ borderColor: 'var(--error)', background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(245,158,11,0.08))' }}>
        <div className="section-header" style={{ marginBottom: 6 }}>
          <span className="section-title">{boss.icon} Weekly Boss: {boss.name}</span>
          <span className="tag tag-reward">+{boss.rewardMin}–{boss.rewardMax} 🪙</span>
        </div>
        <div className="duel-sub mb-16">{boss.desc}</div>
        <button
          className="btn btn-accent btn-full"
          onClick={() => {
            setBossScores([]);
            setBossRound(0);
            setBossResult(null);
            setBossMode(true);
          }}
        >
          {boss.clearedThisWeek ? '⚔️ Rematch Weekly Boss' : '⚔️ Enter 5-Round Boss Raid'}
        </button>
      </div>

      {/* 6-DOMAIN COGNITIVE SKILL TREE */}
      <div className="section-title mb-16">🧬 6-Domain Cognitive Skill Tree</div>
      {skills.map((s) => (
        <div key={s.domain} className="card mb-16">
          <div className="inline-edit-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontWeight: 700 }}>{s.domain} · Lvl {s.level}</span>
            <span className="tag tag-reward">{s.plays} plays · Best {s.bestScore}</span>
          </div>
          <div className="progress-bar mb-16">
            <div className="progress-bar-fill" style={{ width: `${s.progressPct}%` }} />
          </div>
          <div className="duel-sub">{s.perk}</div>
        </div>
      ))}

      <button className="btn btn-secondary btn-full" onClick={() => onNavigate('duel')}>
        Train Skills in 32-Game Arcade →
      </button>
    </div>
  );
}
