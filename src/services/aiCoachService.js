import { DUEL_CHALLENGES } from '../data/duels';
import { analyzeBehaviorProfile } from './deviceBehaviorService';
import { getToday } from '../utils/date';

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

export function generateAICoachPlan() {
  const prefs = loadAIPreferences();
  const behavior = analyzeBehaviorProfile();
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

  const blockMinutes = prefs.dailyMinutes >= 45 ? 25 : 15;
  const tasks = [
    {
      id: `ai_t1_${getToday()}`,
      title: `${track.label}: Deep Work Sprint (${blockMinutes}m)`,
      category: 'Focus',
      targetMinutes: blockMinutes,
      goldReward: 60,
      reason: `Matched to your "${track.label}" goal and ${behavior.focusStability}% focus stability.`,
    },
    {
      id: `ai_t2_${getToday()}`,
      title: `Train ${behavior.weakestDomain}: Play ${recommendedGames[0]?.name || 'Brain Duel'}`,
      category: behavior.weakestDomain,
      targetMinutes: 10,
      goldReward: 50,
      reason: `${behavior.weakestDomain} is currently your highest-growth cognitive area.`,
    },
    {
      id: `ai_t3_${getToday()}`,
      title: behavior.fatigueRisk.startsWith('High')
        ? 'Wind-down Recall Review & Screen Break (10m)'
        : 'Zero-Distraction Single-Tab Challenge (20m)',
      category: 'Discipline',
      targetMinutes: behavior.fatigueRisk.startsWith('High') ? 10 : 20,
      goldReward: 75,
      reason: `Calibrated for your current fatigue risk: ${behavior.fatigueRisk}.`,
    },
  ];

  const summary = [
    `Goal: ${prefs.customGoalText || track.label}`,
    `Focus Stability: ${behavior.focusStability}% (${behavior.totalDistractions} tab switches logged)`,
    behavior.peakHour !== null
      ? `Your peak cognitive hour is around ${behavior.peakHour}:00 — schedule hard Genius puzzles then.`
      : 'Complete 3+ brain duels to unlock your personal Peak Cognitive Hour detection.',
  ];

  return { prefs, behavior, track, recommendedGames, tasks, summary };
}

export function answerAICoachQuestion(question) {
  const q = (question || '').toLowerCase();
  const { prefs, behavior, track, recommendedGames } = generateAICoachPlan();

  if (q.includes('weak') || q.includes('improve') || q.includes('train')) {
    return `Based on your real duel telemetry, your weakest domain is **${behavior.weakestDomain}** and your strongest is **${behavior.strongestDomain}**. Start with **${recommendedGames[0]?.name}** (${recommendedGames[0]?.category}) on ${prefs.preferredDifficulty} difficulty.`;
  }
  if (q.includes('focus') || q.includes('distract') || q.includes('device') || q.includes('time')) {
    return `Your Focus Stability is **${behavior.focusStability}%** with **${behavior.totalFocusMins} focused minutes** and **${behavior.totalDistractions} distractions** logged. Current fatigue risk: **${behavior.fatigueRisk}**. Try a 25-minute single-tab sprint in My Tasks!`;
  }
  if (q.includes('gold') || q.includes('earn')) {
    return `Fastest Gold loop: Complete all **3 Daily Duel puzzles** (+150 Gold Trifecta bonus), run **Live Task Timers** (+2 Gold/min), spin the **Daily Gold Wheel**, and win **Multiplayer Wager Duels**!`;
  }
  return `For your **${track.label}** goal (${prefs.dailyMinutes} min/day), I recommend playing **${recommendedGames.map((g) => g.name).join(', ')}** today, followed by a ${prefs.focusStyle} live-tracked session in My Tasks.`;
}
