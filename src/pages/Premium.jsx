import { useState } from 'react';
import AdPlaceholder from '../components/AdPlaceholder';
import { PREMIUM_BENEFITS, PREMIUM_PLANS, getUpgradeMessage } from '../services/premiumService';

export default function Premium() {
  const [selected, setSelected] = useState('monthly');
  const [showMsg, setShowMsg] = useState(false);

  const handleUpgrade = () => {
    setShowMsg(true);
    setTimeout(() => setShowMsg(false), 4000);
  };

  return (
    <div>
      <div className="page-title">DailyQuest Pro</div>
      <div className="page-subtitle">Unlock the full experience</div>

      <div className="premium-hero">
        <div className="premium-badge">DAILYQUEST PRO</div>
        <div className="duel-sub">Level up your daily adventure</div>
      </div>

      <div className="premium-price">
        {PREMIUM_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`price-card ${selected === plan.id ? 'selected' : ''}`}
            onClick={() => setSelected(plan.id)}
          >
            <div className="price-amount">{plan.amountLabel}</div>
            <div className="price-period">{plan.period}</div>
          </div>
        ))}
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Benefits</div>
        <ul className="benefit-list">
          {PREMIUM_BENEFITS.map((b) => (
            <li key={b} className="benefit-item">
              <span className="benefit-check">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <button className="btn btn-accent btn-full mb-16" onClick={handleUpgrade}>
        Upgrade to PRO
      </button>

      {showMsg && (
        <div className="card text-center" style={{ borderColor: 'var(--accent)' }}>
          <div style={{ color: 'var(--accent)', fontWeight: '600', marginBottom: '4px' }}>
            {getUpgradeMessage()}
          </div>
          <div className="duel-sub">No payment was processed — this is a demo only.</div>
        </div>
      )}

      <AdPlaceholder label="Sponsored" />
    </div>
  );
}
