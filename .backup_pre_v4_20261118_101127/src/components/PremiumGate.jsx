import { usePremium } from '../hooks/usePremium';

/**
 * Wraps Premium-only UI. Shows `children` if the signed-in user is
 * currently Premium (server-verified), otherwise shows `fallback` (a short
 * upsell card by default). This is a UX convenience only — every action
 * this gates must ALSO be verified server-side by its own RPC, since a
 * user could always bypass client rendering.
 */
export default function PremiumGate({ children, fallback, onNavigate }) {
  const { isPremium, loading } = usePremium();

  if (loading) return null;
  if (isPremium) return children;

  if (fallback) return fallback;

  return (
    <div className="card text-center">
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>PRO feature</div>
      <div className="duel-sub mb-16">Upgrade to DailyQuest Pro to unlock this.</div>
      {onNavigate && (
        <button className="btn btn-accent" onClick={() => onNavigate('premium')}>
          See Pro plans
        </button>
      )}
    </div>
  );
}
