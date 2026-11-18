import { DUEL_CHALLENGES } from '../data/duels.js';
import { analyzeBehaviorProfile } from './deviceBehaviorService.js';
import { getWeeklyHabitSummary } from './habitService.js';
import { getVaultSummary } from './knowledgeVaultService.js';
import { getToday } from '../utils/date.js';

const AI_PREF_KEY = 'dailyquest_ai_preferences_v2';

export const GOAL_TRACKS = [
  { id: 'exam-mastery', label: 'Exam & Coding Mastery', domains: ['Logic', 'Math', 'Memory'], icon: '🎓' },
  { id: 'speed-reflex', label: 'Sharp Reflex & Speed', domains: ['Speed', 'Spatial'], icon: '⚡' },
  { id: 'deep-focus', label: 'Deep Focus & Discipline', domains: ['Memory', 'Language'], icon: '🧘' },
  { id: 'genius-all', label: 'All-Round Genius Mode', domains: ['Logic', 'Math', 'Spatial', 'Memory'], icon: '🧠' },
];

const DEFAULT_PREFS = {
  completedInterview: false,
  primaryGoal: 'genius-all',
  customGoalText: '',
  dailyMinutes: 30,
  preferredDifficulty: 'Medium',
  focusStyle: 'Pomodoro (25m)',
  distractionTrigger: 'Social media / tab switching',
  aiEndpointUrl: '', // Optional server proxy endpoint (keys stay on server, never in browser)
  updatedAt: null,
};

export function loadAIPreferences() {
  try {
    const raw = localStorage.getItem(AI_PREF_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAIPreferences(prefs) {
  const next = { ...DEFAULT_PREFS, ...prefs, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(AI_PREF_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

/**
 * Decomposes any user goal into 4 concrete, actionable milestones.
 */
export function decomposeGoalIntoMilestones(goalText = '', trackId = 'genius-all') {
  const clean = String(goalText || '').trim();
  const label = clean || (GOAL_TRACKS.find((g) => g.id === trackId)?.label ?? 'Personal Growth');
  return [
    { step: 1, title: `Foundation: 15m daily habit & baseline flashcards for ${label}`, targetDays: 7 },
    { step: 2, title: `Deep Work: 3× 25m distraction-free sprints/week on ${label}`, targetDays: 14 },
    { step: 3, title: `Cognitive Edge: Reach 80+ avg score in weak brain domains`, targetDays: 21 },
    { step: 4, title: `Mastery Simulation: Weekly Boss clear + 90% Knowledge Vault retention`, targetDays: 30 },
  ];
}

export function generateAICoachPlan() {
  const prefs = loadAIPreferences();
  const behavior = analyzeBehaviorProfile();
  const habitSummary = getWeeklyHabitSummary();
  const vaultSummary = getVaultSummary();
  const track = GOAL_TRACKS.find((g) => g.id === prefs.primaryGoal) || GOAL_TRACKS[3];

  const targetDomains = Array.from(new Set([behavior.weakestDomain, ...track.domains]));
  const recommendedGames = [];
  for (const dom of targetDomains) {
    const matches = DUEL_CHALLENGES.filter((c) => c.category === dom);
    for (const m of matches) {
      if (recommendedGames.length < 3 && !recommendedGames.some((r) => r.id === m.id)) {
        recommendedGames.push(m);
      }
    }
  }

  const blockMinutes = prefs.dailyMinutes >= 45 ? 52 : 25;
  const milestones = decomposeGoalIntoMilestones(prefs.customGoalText, prefs.primaryGoal);

  const tasks = [
    {
      id: `ai_t1_${getToday()}`,
      title: `${track.label}: Deep Work Block (${blockMinutes}m)`,
      category: 'Focus',
      targetMinutes: blockMinutes,
      goldReward: 60,
      reason: `Matched to your "${prefs.customGoalText || track.label}" goal and ${behavior.focusStability}% focus stability.`,
    },
    {
      id: `ai_t2_${getToday()}`,
      title: `Train ${behavior.weakestDomain}: Play ${recommendedGames[0]?.name || 'Brain Duel'}`,
      category: behavior.weakestDomain,
      targetMinutes: 10,
      goldReward: 50,
      reason: `${behavior.weakestDomain} is currently your highest-upside cognitive domain.`,
    },
    {
      id: `ai_t3_${getToday()}`,
      title:
        vaultSummary.dueCount > 0
          ? `Knowledge Vault: Review ${vaultSummary.dueCount} Due Flashcards`
          : `Habit Forge: Complete ${habitSummary.totalHabits - habitSummary.completedToday} pending routine habits`,
      category: 'Study',
      targetMinutes: 15,
      goldReward: 45,
      reason: `Keeps your SM-2 retention (${vaultSummary.retentionRate}%) and Habit Consistency (${habitSummary.avgConsistency}%) high.`,
    },
  ];

  const summary = [
    `Goal: ${prefs.customGoalText || track.label} (${prefs.dailyMinutes}m/day)`,
    `Focus Stability: ${behavior.focusStability}% · Habit Consistency: ${habitSummary.avgConsistency}%`,
    `Knowledge Vault: ${vaultSummary.dueCount} cards due today (${vaultSummary.retentionRate}% retention)`,
    behavior.peakHour !== null
      ? `Peak Cognitive Window: ${behavior.peakHour}:00 — schedule Deep Work & Genius Duels then.`
      : 'Complete 3+ brain duels across the day to unlock Peak Cognitive Hour detection.',
  ];

  return { prefs, behavior, habitSummary, vaultSummary, track, recommendedGames, tasks, milestones, summary };
}

export function answerAICoachQuestion(question) {
  const q = String(question || '').toLowerCase();
  const { prefs, behavior, habitSummary, vaultSummary, track, recommendedGames, milestones } = generateAICoachPlan();

  if (q.includes('habit') || q.includes('routine') || q.includes('streak')) {
    return `Your Habit Consistency is **${habitSummary.avgConsistency}%** (${habitSummary.completedToday}/${habitSummary.totalHabits} done today, best streak: **${habitSummary.bestStreak}d**). Tip: Anchor your hardest habit to your morning routine in Habit Forge and use a Recovery Day if you're exhausted.`;
  }
  if (q.includes('learn') || q.includes('flashcard') || q.includes('study') || q.includes('vault')) {
    return `You have **${vaultSummary.dueCount} flashcards due** in Knowledge Vault with **${vaultSummary.retentionRate}% recall retention**. Complete your daily SM-2 queue before starting new topics!`;
  }
  if (q.includes('milestone') || q.includes('plan') || q.includes('roadmap') || q.includes('goal')) {
    return `4-Step Roadmap for **${prefs.customGoalText || track.label}**:\n1. ${milestones[0].title}\n2. ${milestones[1].title}\n3. ${milestones[2].title}\n4. ${milestones[3].title}`;
  }
  if (q.includes('weak') || q.includes('improve') || q.includes('train') || q.includes('brain')) {
    return `Your growth domain is **${behavior.weakestDomain}** and your strongest domain is **${behavior.strongestDomain}**. Play **${recommendedGames[0]?.name}** on ${prefs.preferredDifficulty} difficulty today.`;
  }
  if (q.includes('focus') || q.includes('distract') || q.includes('deep work')) {
    return `Focus Stability is **${behavior.focusStability}%** (${behavior.totalFocusMins}m logged, ${behavior.totalDistractions} tab switches). Launch **Deep Work 2.0** in 52/17 mode with Alpha 10Hz audio.`;
  }
  return `Today's OS Priority for **${prefs.customGoalText || track.label}**: 1) Clear **${vaultSummary.dueCount} due flashcards**, 2) Run a **25m Deep Work block**, and 3) Play **${recommendedGames.map((g) => g.name).join(', ')}** in Daily Duel.`;
}
