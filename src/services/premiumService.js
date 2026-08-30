export const PREMIUM_PLANS = [
  { id: 'monthly', amountLabel: '₹79', period: 'per month' },
  { id: 'yearly', amountLabel: '₹499', period: 'per year' },
];

export const PREMIUM_BENEFITS = [
  'Remove all ads',
  'Premium themes',
  'Advanced statistics',
  'Streak protection',
  'Extra Daily Duel modes',
  'Exclusive achievements',
  'More customization',
];

export function isPremium(data) {
  return !!data?.settings?.premium;
}

export function getUpgradeMessage() {
  return 'Premium payments will be connected in a future version.';
}

export const premiumService = {
  isPremium,
  plans: PREMIUM_PLANS,
  benefits: PREMIUM_BENEFITS,
  getUpgradeMessage,
};
