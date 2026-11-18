import { COGNITIVE_DOMAINS, DUEL_CHALLENGES } from '../data/duels';
import { analyzeBehaviorProfile } from './deviceBehaviorService';
import { getToday } from '../utils/date';

const RPG_KEY = 'dailyquest_rpg_v3';

export const RANK_TITLES = [
  { minXp: 0, title: 'Novice', badge: '🌱' },
  { minXp: 300, title: 'Tactician', badge: '⚔️' },
  { minXp: 900, title: 'Savant', badge: '🔮' },
  { minXp: 2000, title: 'Architect', badge: '🏛️' },
  { minXp: 4000, title: 'Grandmaster', badge: '👑' },
];

export const RELIC_CATALOG = [
  { id: 'chrono_lens', name: 'Chrono Lens', icon: '⏳', cost: 600, perk: '+10% Focus Timer Gold' },
  { id: 'neon_crown', name: 'Neon Crown Border', icon: '👑', cost: 900, perk: 'Animated Gold Leaderboard Frame' },
  { id: 'synapse_core', name: 'Synapse Core', icon: '🧬', cost: 1200, perk: '+15% Brain Duel XP' },
  { id: 'phoenix_crest', name: 'Phoenix Crest', icon: '🔥', cost: 1500, perk: 'Auto-protects 1 missed day/month' },
];

export const WEEKLY_BOSSES = [
  { id: 'chrono-sphinx', name: 'The Chrono-Sphinx', icon: '🦁', targetScore: 380, rewardMin: 350, rewardMax: 800, desc: 'Master of Time & Logic. Score 380+ across 5 domains.' },
  { id: 'nexus-hydra', name: 'Nexus Hydra', icon: '🐉', targetScore: 420, rewardMin: 450, rewardMax: 1000, desc: 'Five-headed cognitive titan. Unlocks Mythic Boss Chest.' },
];

function loadRPG() {
  try {
    const raw = localStorage.getItem(RPG_KEY);
    return raw ? JSON.parse(raw) : { unlockedRelics: [], equippedBorder: null, bossClears: [] };
  } catch {
    return { unlockedRelics: [], equippedBorder: null, bossClears: [] };
  }
}

function saveRPG(state) {
  try {
    localStorage.setItem(RPG_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
  return state;
}

export function getRankTitle(xp = 0) {
  let current = RANK_TITLES[0];
  for (const r of RANK_TITLES) {
    if (xp >= r.minXp) current = r;
  }
  return current;
}

export function getSkillTreeData() {
  const behavior = analyzeBehaviorProfile();
  return COGNITIVE_DOMAINS.map((domain) => {
    const stat = behavior.domainBreakdown.find((d) => d.domain === domain) || { plays: 0, avgScore: 0, bestScore: 0 };
    const domainXp = stat.plays * 35 + stat.bestScore;
    const level = Math.max(1, Math.floor(domainXp / 120) + 1);
    const progressPct = Math.round(((domainXp % 120) / 120) * 100);
    const perk =
      level >= 5
        ? `Active Perk: +15% ${domain} Gold & Genius Multiplier`
        : level >= 3
          ? `Active Perk: +10% ${domain} Duel XP`
          : `Reach Lvl 3 for +10% ${domain} XP`;
    return { domain, level, domainXp, progressPct, plays: stat.plays, bestScore: stat.bestScore, perk };
  });
}

export function getRPGInventory() {
  return loadRPG();
}

export function unlockRelic(relicId) {
  const s = loadRPG();
  if (!s.unlockedRelics.includes(relicId)) {
    s.unlockedRelics.push(relicId);
  }
  return saveRPG(s);
}

export function getCurrentBoss() {
  const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const boss = WEEKLY_BOSSES[weekNum % WEEKLY_BOSSES.length];
  const s = loadRPG();
  const clearedThisWeek = s.bossClears.some((b) => b.weekNum === weekNum);
  const games = COGNITIVE_DOMAINS.slice(0, 5).map((dom) => {
    const pool = DUEL_CHALLENGES.filter((c) => c.category === dom);
    return pool[weekNum % pool.length] || DUEL_CHALLENGES[0];
  });
  return { ...boss, weekNum, clearedThisWeek, games };
}

export function recordBossClear(weekNum, totalScore) {
  const s = loadRPG();
  s.bossClears.push({ weekNum, totalScore, date: getToday() });
  return saveRPG(s);
}
