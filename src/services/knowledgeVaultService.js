import { getToday, toDateString } from '../utils/date.js';
import { enqueueOfflineAction } from './offlineSyncService.js';

const VAULT_CARDS_KEY = 'dailyquest_vault_cards_v4';
const VAULT_PATHS_KEY = 'dailyquest_vault_paths_v4';
const VAULT_STATS_KEY = 'dailyquest_vault_stats_v4';

export const INITIAL_LEARNING_PATHS = [
  {
    id: 'path_cs',
    title: 'Computer Science & Algorithms',
    subject: 'Computer Science',
    description: 'Core data structures, Big-O complexity, and system architecture.',
    milestones: ['Big-O & Arrays', 'Trees & Graphs', 'Dynamic Programming', 'Distributed Systems'],
  },
  {
    id: 'path_prog',
    title: 'Modern Programming & React',
    subject: 'Programming',
    description: 'JavaScript closures, async concurrency, React rendering, and security.',
    milestones: ['Event Loop & Closures', 'React Hooks & State', 'Type Safety & Testing', 'Web Security (XSS/RLS)'],
  },
  {
    id: 'path_ds',
    title: 'Data Science & Machine Learning',
    subject: 'Data Science',
    description: 'Probability, gradient descent, overfitting prevention, and evaluation metrics.',
    milestones: ['Bayes & Distributions', 'Loss Functions', 'Regularization', 'Transformer Architecture'],
  },
  {
    id: 'path_math',
    title: 'Quantitative Mathematics',
    subject: 'Mathematics',
    description: 'Linear algebra, modular arithmetic, combinatorics, and calculus fundamentals.',
    milestones: ['Matrix Operations', 'Number Theory & Primes', 'Combinatorics', 'Optimization'],
  },
  {
    id: 'path_gk',
    title: 'General Knowledge & Mental Models',
    subject: 'General Knowledge',
    description: 'First-principles thinking, cognitive biases, economics, and decision theory.',
    milestones: ['First Principles', 'Second-Order Thinking', 'Pareto & Compounding', 'Game Theory'],
  },
];

const INITIAL_FLASHCARDS = [
  {
    id: 'fc_1',
    pathId: 'path_cs',
    deck: 'Computer Science',
    front: 'What is the time complexity of binary search on a sorted array of N elements?',
    back: 'O(log N) — because each comparison halves the remaining search space.',
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  },
  {
    id: 'fc_2',
    pathId: 'path_prog',
    deck: 'Programming',
    front: 'Why should timers use timestamp deltas (Date.now()) instead of counting setInterval ticks?',
    back: 'Browser background tabs throttle setInterval to 1s+ or pause it; timestamp deltas remain accurate regardless of tab throttling.',
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  },
  {
    id: 'fc_3',
    pathId: 'path_ds',
    deck: 'Data Science',
    front: 'What does Precision vs. Recall measure in classification?',
    back: 'Precision = TP / (TP + FP) (exactness of positive predictions); Recall = TP / (TP + FN) (coverage of actual positives).',
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  },
  {
    id: 'fc_4',
    pathId: 'path_math',
    deck: 'Mathematics',
    front: 'What is Bayes’ Theorem formula?',
    back: 'P(A|B) = [P(B|A) · P(A)] / P(B) — updates prior probability using new evidence.',
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  },
  {
    id: 'fc_5',
    pathId: 'path_gk',
    deck: 'General Knowledge',
    front: 'How does the SM-2 spaced repetition algorithm schedule reviews?',
    back: 'It adjusts each card’s easiness factor (EF >= 1.3) and multiplies the review interval after each successful recall (grade >= 3).',
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  },
];

export function computeSM2Review(card, grade, todayStr = getToday()) {
  const q = Math.min(5, Math.max(0, Math.round(Number(grade) || 0)));
  let repetition = Number(card.repetition) || 0;
  let intervalDays = Number(card.intervalDays) || 1;
  let easiness = Number(card.easiness) || 2.5;

  if (q >= 3) {
    if (repetition === 0) intervalDays = 1;
    else if (repetition === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easiness);
    repetition += 1;
  } else {
    repetition = 0;
    intervalDays = 1;
  }

  easiness = easiness + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (easiness < 1.3) easiness = 1.3;
  easiness = Math.round(easiness * 100) / 100;

  const baseDate = new Date(`${todayStr}T00:00:00`);
  baseDate.setDate(baseDate.getDate() + intervalDays);
  const nextReviewDate = toDateString(baseDate);

  return {
    ...card,
    repetition,
    intervalDays,
    easiness,
    lastReviewedDate: todayStr,
    nextReviewDate,
  };
}

export function loadLearningPaths() {
  try {
    const raw = localStorage.getItem(VAULT_PATHS_KEY);
    if (!raw) return INITIAL_LEARNING_PATHS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_LEARNING_PATHS;
  } catch {
    return INITIAL_LEARNING_PATHS;
  }
}

export function createLearningPath({ title, subject = 'Custom', description = '', milestones = [] }) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) throw new Error('Learning path title is required.');
  const paths = loadLearningPaths();
  const created = {
    id: `path_${Date.now()}`,
    title: cleanTitle,
    subject,
    description,
    milestones: milestones.length > 0 ? milestones : ['Fundamentals', 'Core Practice', 'Mastery Quiz'],
  };
  const next = [created, ...paths];
  try {
    localStorage.setItem(VAULT_PATHS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return created;
}

export function loadFlashcards() {
  try {
    const raw = localStorage.getItem(VAULT_CARDS_KEY);
    if (!raw) return INITIAL_FLASHCARDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FLASHCARDS;
  } catch {
    return INITIAL_FLASHCARDS;
  }
}

export function saveFlashcards(cards) {
  try {
    localStorage.setItem(VAULT_CARDS_KEY, JSON.stringify(cards));
  } catch {
    // ignore
  }
  return cards;
}

export function createFlashcard({ front, back, deck = 'General', pathId = null }) {
  if (!String(front || '').trim() || !String(back || '').trim()) {
    throw new Error('Both front question and back answer are required.');
  }
  const cards = loadFlashcards();
  const card = {
    id: `fc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    pathId,
    deck: String(deck).trim() || 'General',
    front: String(front).trim(),
    back: String(back).trim(),
    intervalDays: 1,
    repetition: 0,
    easiness: 2.5,
    nextReviewDate: getToday(),
  };
  const next = [card, ...cards];
  saveFlashcards(next);
  enqueueOfflineAction('flashcard_create', card, `fc_create_${card.id}`);
  return card;
}

export function reviewFlashcard(cardId, grade, todayStr = getToday()) {
  const cards = loadFlashcards();
  let updatedCard = null;
  const next = cards.map((c) => {
    if (c.id !== cardId) return c;
    updatedCard = computeSM2Review(c, grade, todayStr);
    return updatedCard;
  });
  saveFlashcards(next);

  try {
    const raw = localStorage.getItem(VAULT_STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { totalReviewed: 0, correctCount: 0, byDate: {} };
    stats.totalReviewed += 1;
    if (grade >= 3) stats.correctCount += 1;
    stats.byDate[todayStr] = (stats.byDate[todayStr] || 0) + 1;
    localStorage.setItem(VAULT_STATS_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }

  enqueueOfflineAction('flashcard_review', { cardId, grade, todayStr }, `fc_rev_${cardId}_${todayStr}_${Date.now()}`);
  return updatedCard;
}

export function generateFlashcardsFromNotes(notesText, deck = 'AI Study Notes') {
  const lines = String(notesText || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 10);

  const generated = [];
  for (const line of lines.slice(0, 8)) {
    const sepMatch = line.match(/^([^:–-]+)[:–-]\s*(.+)$/);
    if (sepMatch) {
      generated.push(
        createFlashcard({
          deck,
          front: `Define / Explain: ${sepMatch[1].trim()}`,
          back: sepMatch[2].trim(),
        })
      );
    } else {
      const words = line.split(/\s+/);
      if (words.length >= 5) {
        const keyTerm = words.slice(0, 3).join(' ');
        generated.push(
          createFlashcard({
            deck,
            front: `What is the key concept regarding "${keyTerm}..."?`,
            back: line,
          })
        );
      }
    }
  }
  return generated;
}

export function getVaultSummary(todayStr = getToday()) {
  const cards = loadFlashcards();
  const dueCards = cards.filter((c) => !c.nextReviewDate || c.nextReviewDate <= todayStr);
  const masteredCards = cards.filter((c) => (c.intervalDays || 1) >= 14);
  let stats = { totalReviewed: 0, correctCount: 0, byDate: {} };
  try {
    const raw = localStorage.getItem(VAULT_STATS_KEY);
    if (raw) stats = { ...stats, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  const retentionRate =
    stats.totalReviewed > 0 ? Math.round((stats.correctCount / stats.totalReviewed) * 100) : 100;

  return {
    totalCards: cards.length,
    dueCount: dueCards.length,
    dueCards,
    masteredCount: masteredCards.length,
    reviewedToday: stats.byDate[todayStr] || 0,
    retentionRate,
  };
}
