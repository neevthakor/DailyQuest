import { DUEL_CHALLENGES, getChallengeById } from '../data/duels';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import { getToday } from '../utils/date';
import { createRng, hashString } from '../utils/rng';
import { applyXpAndCoins } from '../utils/xp';
import { analyzeBehaviorProfile, recordGamePerformance } from './deviceBehaviorService';

export const DAILY_DUEL_SLOTS = 3;
export const TRIFECTA_BONUS_GOLD = 150;

export function getDailyDuelSet(dateStr = getToday()) {
  const rng = createRng(hashString(`dailyquest:duelset:${dateStr}`));
  const behavior = analyzeBehaviorProfile();

  const pool = [...DUEL_CHALLENGES];
  const warmupPool = pool.filter((c) => !c.isGenius);
  const targetedPool = pool.filter((c) => c.category === behavior.weakestDomain);
  const geniusPool = pool.filter((c) => c.isGenius);

  const slot1 = warmupPool[Math.floor(rng() * warmupPool.length)] || pool[0];

  const slot2Candidates = (targetedPool.length > 0 ? targetedPool : pool).filter((c) => c.id !== slot1.id);
  const slot2 = slot2Candidates[Math.floor(rng() * slot2Candidates.length)] || pool[1];

  const slot3Candidates = geniusPool.filter((c) => c.id !== slot1.id && c.id !== slot2.id);
  const slot3 = slot3Candidates[Math.floor(rng() * slot3Candidates.length)] || pool[2];

  return [
    { ...slot1, slotIndex: 0, slotLabel: 'Puzzle 1 · Warmup' },
    { ...slot2, slotIndex: 1, slotLabel: `Puzzle 2 · AI Target (${behavior.weakestDomain})` },
    { ...slot3, slotIndex: 2, slotLabel: 'Puzzle 3 · Genius Boss' },
  ];
}

export function getDailyDuelChallenge(dateStr = getToday()) {
  return getDailyDuelSet(dateStr)[0];
}

export function getDuelDifficulty(userLevel) {
  if (userLevel >= 25) return 'Genius';
  if (userLevel >= 16) return 'Hard';
  if (userLevel >= 8) return 'Medium';
  return 'Easy';
}

export function getTodayDuel(dateStr = getToday()) {
  return getDailyDuelChallenge(dateStr);
}

export function getTodayDuelProgress(data, dateStr = getToday()) {
  const history = Array.isArray(data?.duel?.history) ? data.duel.history : [];
  const todayEntries = history.filter((h) => h.date === dateStr);
  const completedIds = new Set(todayEntries.map((h) => h.challengeId));
  const dailySet = getDailyDuelSet(dateStr);
  const completedSlots = dailySet.filter((d) => completedIds.has(d.id)).length;
  return {
    dailySet,
    todayEntries,
    completedIds,
    completedSlots,
    allThreeDone: completedSlots >= DAILY_DUEL_SLOTS,
  };
}

export function hasPlayedDuelToday(data, dateStr = getToday()) {
  const { allThreeDone } = getTodayDuelProgress(data, dateStr);
  return allThreeDone;
}

export function hasPlayedToday(data, dateStr = getToday()) {
  return hasPlayedDuelToday(data, dateStr);
}

export function completeDuel(data, score, challengeId, { isPractice = false } = {}) {
  const today = getToday();
  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const challenge = getChallengeById(challengeId);

  // Record real cognitive telemetry
  recordGamePerformance(challenge.id, safeScore);

  if (isPractice) {
    const practiceXp = Math.max(10, Math.round(safeScore * 0.2));
    const practiceGold = Math.max(5, Math.round(safeScore * 0.15));
    const reward = applyXpAndCoins(data.profile, practiceXp, practiceGold);
    if (!Array.isArray(data.duel.history)) data.duel.history = [];
    data.duel.history.push({
      date: today,
      score: safeScore,
      challengeId: challenge.id,
      category: challenge.category,
      isPractice: true,
    });
    return {
      success: true,
      xpEarned: practiceXp,
      coinsEarned: practiceGold,
      leveledUp: reward.leveledUp,
      level: reward.level,
      firstTime: false,
      trifectaBonus: 0,
    };
  }

  const { completedIds } = getTodayDuelProgress(data, today);
  if (completedIds.has(challenge.id)) {
    return {
      success: false,
      reason: 'already_played',
      xpEarned: 0,
      coinsEarned: 0,
      leveledUp: false,
      firstTime: false,
      trifectaBonus: 0,
    };
  }

  data.duel.lastPlayedDate = today;
  if (!Array.isArray(data.duel.history)) data.duel.history = [];
  data.duel.history.push({
    date: today,
    score: safeScore,
    challengeId: challenge.id,
    category: challenge.category,
  });
  data.profile.duelsCompleted = Math.max(0, data.profile.duelsCompleted) + 1;

  const newCompletedCount = completedIds.size + 1;
  const trifectaBonus = newCompletedCount === DAILY_DUEL_SLOTS ? TRIFECTA_BONUS_GOLD : 0;
  const totalGold = DUEL_COIN_REWARD + trifectaBonus;

  const reward = applyXpAndCoins(data.profile, DUEL_XP_REWARD, totalGold);

  if (safeScore > data.duel.bestScore) data.duel.bestScore = safeScore;
  if (safeScore > data.profile.bestDuelScore) data.profile.bestDuelScore = safeScore;

  return {
    success: true,
    xpEarned: DUEL_XP_REWARD,
    coinsEarned: totalGold,
    leveledUp: reward.leveledUp,
    level: reward.level,
    firstTime: true,
    trifectaBonus,
  };
}

export function submitDuelScore(data, score, challengeId, options) {
  return completeDuel(data, score, challengeId, options);
}

export function getBestDuelScore(data) {
  return Math.max(
    0,
    Number(data?.profile?.bestDuelScore) || 0,
    Number(data?.duel?.bestScore) || 0
  );
}

export function scoreReactionTime(elapsedMs, difficulty = 'Easy') {
  const elapsed = Number(elapsedMs) || 0;
  let multiplier = 1;
  if (difficulty === 'Medium') multiplier = 0.85;
  if (difficulty === 'Hard') multiplier = 0.7;
  if (difficulty === 'Genius') multiplier = 0.6;

  if (elapsed < 250 * multiplier) return 100;
  if (elapsed < 350 * multiplier) return 80;
  if (elapsed < 450 * multiplier) return 60;
  if (elapsed < 600 * multiplier) return 40;
  return 20;
}
