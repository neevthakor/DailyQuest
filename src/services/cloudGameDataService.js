import { ACHIEVEMENTS } from '../data/achievements';
import { CATEGORY_ICONS, DIFFICULTY_CONFIG, generateDailyQuests } from '../data/quests';
import { DUEL_COIN_REWARD, DUEL_XP_REWARD } from '../lib/constants';
import { supabase, supabaseConfigError } from '../lib/supabase';
import { getToday } from '../utils/date';
import { calculateLevel } from '../utils/xp';
import { getDefaultData, sanitizeGameData } from './storageService';
import { rowToProfile, upsertProfile } from './cloudProfileService';

function requireClient() {
  if (!supabase) {
    throw new Error(supabaseConfigError || 'Supabase is not available.');
  }
  return supabase;
}

function rowDate(value) {
  return typeof value === 'string' ? value.slice(0, 10) : null;
}

function rowToQuest(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    category: row.category || 'Mind',
    difficulty: row.difficulty || 'Easy',
    xpReward: Math.max(0, Number(row.xp_reward) || 0),
    coinReward: Math.max(0, Number(row.coin_reward) || 0),
    completed: !!row.completed,
    completedAt: row.completed_at || null,
  };
}

function questToRow(userId, date, quest) {
  const difficulty = quest.difficulty || 'Easy';
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy;
  return {
    user_id: userId,
    quest_date: date,
    title: quest.title,
    description: quest.description || '',
    category: quest.category || 'Mind',
    difficulty,
    xp_reward: Math.max(0, Math.floor(Number(quest.xpReward) || 0)),
    coin_reward: Math.max(0, Math.floor(Number(quest.coinReward) || 0)),
    icon: CATEGORY_ICONS[quest.category] || cfg.icon || null,
    estimated_minutes: null,
    completed: !!quest.completed,
    completed_at: quest.completed ? new Date().toISOString() : null,
  };
}

function mergeAchievementDefinitions(unlockedIds) {
  const unlocked = new Set(unlockedIds || []);
  return ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id),
  }));
}

function buildDuelState(rows) {
  const history = (rows || []).map((row) => ({
    date: rowDate(row.duel_date),
    score: Math.max(0, Number(row.score) || 0),
    challengeId: row.challenge_type,
  })).filter((entry) => entry.date);

  const bestScore = history.reduce((best, entry) => Math.max(best, entry.score), 0);
  const today = getToday();
  return {
    lastPlayedDate: history.some((entry) => entry.date === today) ? today : null,
    bestScore,
    history,
  };
}

async function fetchTodayQuestRows(userId, date = getToday()) {
  const client = requireClient();
  const { data, error } = await client
    .from('daily_quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_date', date)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTodayQuests(userId, date = getToday()) {
  const rows = await fetchTodayQuestRows(userId, date);
  if (rows.length > 0) {
    return { date, items: rows.map(rowToQuest) };
  }
  return generateTodayQuests(userId, date);
}

export async function generateTodayQuests(userId, date = getToday()) {
  const client = requireClient();
  const generated = generateDailyQuests(date);
  const rows = generated.map((quest) => questToRow(userId, date, quest));

  const { error } = await client
    .from('daily_quests')
    .upsert(rows, {
      onConflict: 'user_id,quest_date,title',
      ignoreDuplicates: true,
    });

  if (error) throw error;
  return { date, items: (await fetchTodayQuestRows(userId, date)).map(rowToQuest) };
}

export function isQuestCompleted(quests, questId) {
  return !!(quests || []).find((quest) => quest.id === questId && quest.completed);
}

export function getQuestProgress(quests) {
  const items = Array.isArray(quests) ? quests : [];
  const completed = items.filter((quest) => quest.completed).length;
  return {
    completed,
    total: items.length,
    percent: items.length > 0 ? Math.round((completed / items.length) * 100) : 0,
  };
}

export async function completeCloudQuest(userId, currentData, questId) {
  const client = requireClient();
  const oldLevel = calculateLevel(currentData.profile.xp).level;
  const quest = currentData.quests.items.find((item) => item.id === questId);

  if (!quest) {
    return { success: false, reason: 'missing', data: currentData, result: { success: false, reason: 'missing' }, unlocked: [] };
  }
  if (quest.completed) {
    return { success: false, reason: 'already_completed', data: currentData, result: { success: false, reason: 'already_completed' }, unlocked: [] };
  }

  const { data, error } = await client.rpc('complete_daily_quest', { p_quest_id: questId });
  if (error) throw error;
  if (!data?.success) {
    return { success: false, reason: data?.reason || 'already_completed', data: currentData, result: data || {}, unlocked: [] };
  }

  const next = sanitizeGameData({
    ...currentData,
    profile: rowToProfile(data.profile),
    quests: {
      ...currentData.quests,
      items: currentData.quests.items.map((item) =>
        item.id === questId ? { ...item, completed: true, completedAt: new Date().toISOString() } : item
      ),
    },
  });
  next.profile.duelsCompleted = currentData.profile.duelsCompleted || 0;
  const newLevel = calculateLevel(next.profile.xp).level;

  return {
    success: true,
    data: next,
    result: {
      success: true,
      xpEarned: data.xp_awarded ?? quest.xpReward,
      coinsEarned: data.coins_awarded ?? quest.coinReward,
      leveledUp: newLevel > oldLevel,
      level: newLevel,
      quest,
    },
    unlocked: [],
  };
}

export async function fetchUnlockedAchievementIds(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).map((row) => row.achievement_id);
}

export async function saveUnlockedAchievements(userId, achievements) {
  const unlocked = (achievements || []).filter((achievement) => achievement.unlocked);
  if (unlocked.length === 0) return true;

  const client = requireClient();
  const { error } = await client
    .from('user_achievements')
    .upsert(
      unlocked.map((achievement) => ({ user_id: userId, achievement_id: achievement.id })),
      { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
    );

  if (error) throw error;
  return true;
}

export async function fetchDuelRows(userId) {
  const client = requireClient();
  const { data, error } = await client
    .from('duel_scores')
    .select('*')
    .eq('user_id', userId)
    .order('duel_date', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function submitCloudDuelScore(userId, currentData, score, challengeId, durationMs = null) {
  const client = requireClient();
  const today = getToday();
  const oldLevel = calculateLevel(currentData.profile.xp).level;

  if ((currentData.duel.history || []).some((entry) => entry.date === today)) {
    return {
      success: false,
      reason: 'already_played',
      data: currentData,
      result: {
        success: false,
        reason: 'already_played',
        xpEarned: 0,
        coinsEarned: 0,
        leveledUp: false,
        firstTime: false,
      },
      unlocked: [],
    };
  }

  const safeScore = Math.max(0, Math.floor(Number(score) || 0));
  const { data, error } = await client.rpc('submit_daily_duel', {
    p_duel_date: today,
    p_challenge_type: challengeId,
    p_score: safeScore,
    p_duration_ms: durationMs,
  });

  if (error) throw error;
  if (!data?.success) {
    return {
      success: false,
      reason: data?.reason || 'already_played',
      data: currentData,
      result: {
        success: false,
        reason: data?.reason || 'already_played',
        xpEarned: 0,
        coinsEarned: 0,
        leveledUp: false,
        firstTime: false,
      },
      unlocked: [],
    };
  }

  const nextHistory = [
    ...(currentData.duel.history || []),
    { date: today, score: safeScore, challengeId },
  ];
  const nextDuel = {
    lastPlayedDate: today,
    bestScore: Math.max(currentData.duel.bestScore || 0, safeScore),
    history: nextHistory,
  };
  const nextProfile = rowToProfile(data.profile);
  nextProfile.duelsCompleted = Math.max(0, Number(currentData.profile.duelsCompleted) || 0) + 1;
  nextProfile.bestDuelScore = Math.max(nextProfile.bestDuelScore || 0, nextDuel.bestScore);

  const next = sanitizeGameData({
    ...currentData,
    profile: nextProfile,
    duel: nextDuel,
  });
  next.profile.duelsCompleted = nextProfile.duelsCompleted;

  const newLevel = calculateLevel(next.profile.xp).level;
  return {
    success: true,
    data: next,
    result: {
      success: true,
      xpEarned: data.xp_awarded ?? DUEL_XP_REWARD,
      coinsEarned: data.coins_awarded ?? DUEL_COIN_REWARD,
      leveledUp: newLevel > oldLevel,
      level: newLevel,
      firstTime: true,
    },
    unlocked: [],
  };
}

export async function hydrateCloudGame(userId, profile) {
  const [quests, achievementIds, duelRows] = await Promise.all([
    getTodayQuests(userId),
    fetchUnlockedAchievementIds(userId),
    fetchDuelRows(userId),
  ]);
  const duel = buildDuelState(duelRows);
  const cloudProfile = {
    ...profile,
    duelsCompleted: duel.history.length,
    bestDuelScore: Math.max(profile?.bestDuelScore || 0, duel.bestScore),
  };

  return sanitizeGameData({
    ...getDefaultData(),
    profile: cloudProfile,
    quests,
    achievements: mergeAchievementDefinitions(achievementIds),
    duel,
    settings: {
      ...getDefaultData().settings,
      onboarded: true,
    },
  });
}

function mergeProfilesForImport(localProfile, cloudProfile) {
  if (!cloudProfile) return localProfile;
  return {
    ...cloudProfile,
    username: localProfile.username || cloudProfile.username,
    avatar: localProfile.avatar || cloudProfile.avatar,
    xp: Math.max(localProfile.xp || 0, cloudProfile.xp || 0),
    coins: Math.max(localProfile.coins || 0, cloudProfile.coins || 0),
    streak: Math.max(localProfile.streak || 0, cloudProfile.streak || 0),
    lastStreakDate: localProfile.lastStreakDate || cloudProfile.lastStreakDate || null,
    totalQuestsCompleted: Math.max(localProfile.totalQuestsCompleted || 0, cloudProfile.totalQuestsCompleted || 0),
    totalXPEarned: Math.max(localProfile.totalXPEarned || 0, cloudProfile.totalXPEarned || 0),
    bestDuelScore: Math.max(localProfile.bestDuelScore || 0, cloudProfile.bestDuelScore || 0),
    duelsCompleted: Math.max(localProfile.duelsCompleted || 0, cloudProfile.duelsCompleted || 0),
  };
}

export async function migrateLocalGameData(userId, localData, cloudData = null) {
  const safe = sanitizeGameData(localData);
  const mergedProfile = mergeProfilesForImport(safe.profile, cloudData?.profile);
  await upsertProfile(userId, mergedProfile);

  if (safe.quests.date && safe.quests.items.length > 0) {
    const client = requireClient();
    const questRows = safe.quests.items.map((quest) => questToRow(userId, safe.quests.date, quest));
    const { error: questError } = await client
      .from('daily_quests')
      .upsert(questRows, {
        onConflict: 'user_id,quest_date,title',
        ignoreDuplicates: false,
      });
    if (questError) throw questError;

    const savedRows = await fetchTodayQuestRows(userId, safe.quests.date);
    const byTitle = new Map(savedRows.map((row) => [row.title, row]));
    const completionRows = safe.quests.items
      .filter((quest) => quest.completed && byTitle.has(quest.title))
      .map((quest) => {
        const row = byTitle.get(quest.title);
        return {
          user_id: userId,
          quest_id: row.id,
          completed_at: row.completed_at || new Date().toISOString(),
          xp_awarded: quest.xpReward,
          coins_awarded: quest.coinReward,
        };
      });

    if (completionRows.length > 0) {
      const { error: completionError } = await client
        .from('quest_completions')
        .upsert(completionRows, {
          onConflict: 'user_id,quest_id',
          ignoreDuplicates: true,
        });
      if (completionError) throw completionError;
    }
  }

  if (safe.duel.history.length > 0) {
    const client = requireClient();
    const { error } = await client
      .from('duel_scores')
      .upsert(
        safe.duel.history.map((entry) => ({
          user_id: userId,
          duel_date: entry.date,
          challenge_type: entry.challengeId || 'unknown',
          score: Math.max(0, Math.floor(Number(entry.score) || 0)),
          duration_ms: null,
        })),
        { onConflict: 'user_id,duel_date', ignoreDuplicates: true }
      );
    if (error) throw error;
  }

  await saveUnlockedAchievements(userId, safe.achievements);
  return hydrateCloudGame(userId, mergedProfile);
}
