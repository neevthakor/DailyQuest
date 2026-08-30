import { DUEL_CHALLENGES } from '../data/duels';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import { getToday } from '../utils/date';
import { createRng, hashString } from '../utils/rng';
import { applyXpAndCoins } from '../utils/xp';

export function getDailyDuelChallenge(dateStr = getToday()) {
  const rng = createRng(hashString(`dailyquest:duel:${dateStr}`));
  const index = Math.floor(rng() * DUEL_CHALLENGES.length);
  return DUEL_CHALLENGES[index];
}

export function getTodayDuel(dateStr = getToday()) {
  return getDailyDuelChallenge(dateStr);
}

export function hasPlayedDuelToday(data, dateStr = getToday()) {
  if (data.duel.lastPlayedDate === dateStr) return true;
  return Array.isArray(data.duel.history) && data.duel.history.some((h) => h.date === dateStr);
}

export function hasPlayedToday(data, dateStr = getToday()) {
  return hasPlayedDuelToday(data, dateStr);
}

export function completeDuel(data, score, challengeId) {
  const today = getToday();
  if (hasPlayedDuelToday(data, today)) {
    return {
      success: false,
      reason: 'already_played',
      xpEarned: 0,
      coinsEarned: 0,
      leveledUp: false,
      firstTime: false,
    };
  }

  const safeScore = Math.max(0, Math.floor(Number(score) || 0));

  data.duel.lastPlayedDate = today;
  if (!Array.isArray(data.duel.history)) data.duel.history = [];
  data.duel.history.push({ date: today, score: safeScore, challengeId });
  data.profile.duelsCompleted = Math.max(0, data.profile.duelsCompleted) + 1;

  const reward = applyXpAndCoins(data.profile, DUEL_XP_REWARD, DUEL_COIN_REWARD);

  if (safeScore > data.duel.bestScore) data.duel.bestScore = safeScore;
  if (safeScore > data.profile.bestDuelScore) data.profile.bestDuelScore = safeScore;

  return {
    success: true,
    xpEarned: DUEL_XP_REWARD,
    coinsEarned: DUEL_COIN_REWARD,
    leveledUp: reward.leveledUp,
    level: reward.level,
    firstTime: true,
  };
}

export function submitDuelScore(data, score, challengeId) {
  return completeDuel(data, score, challengeId);
}

export function getBestDuelScore(data) {
  return Math.max(
    0,
    Number(data?.profile?.bestDuelScore) || 0,
    Number(data?.duel?.bestScore) || 0
  );
}

export function scoreReactionTime(elapsedMs) {
  const elapsed = Number(elapsedMs) || 0;
  if (elapsed < 250) return 100;
  if (elapsed < 350) return 80;
  if (elapsed < 450) return 60;
  if (elapsed < 600) return 40;
  return 20;
}
