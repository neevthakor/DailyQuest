/**
 * Configuration for the Premium + Productivity + Social feature set.
 * No payment SDK is wired here. `paymentsEnabled` in lib/config.js stays
 * false until a real provider is integrated (see INTEGRATION.md).
 */
export const PREMIUM_PLAN_DEFS = [
  { id: 'monthly', amountLabel: '₹79', period: 'per month', months: 1 },
  { id: 'yearly', amountLabel: '₹499', period: 'per year', months: 12, bestValue: true },
];

export const PREMIUM_BENEFITS = [
  'No ads, ever',
  '2 Streak Saves every month',
  'Extra Daily Duel retry after a loss',
  'Personalized improvement tasks',
  'Advanced analytics & weekly reports',
  'Create community groups & challenges',
  'Premium themes & profile badge',
];

export const IMPROVEMENT_CATEGORIES = [
  'Focus',
  'Study',
  'Fitness',
  'Memory',
  'Reading',
  'Discipline',
  'Communication',
  'Creativity',
  'Digital Habits',
  'General Productivity',
];

export const TODO_PRIORITIES = ['low', 'medium', 'high'];
export const GOAL_FREQUENCIES = ['daily', 'weekly', 'monthly'];
export const GOAL_STATUSES = ['active', 'paused', 'completed', 'abandoned'];
export const POST_VISIBILITIES = ['public', 'group', 'private'];
