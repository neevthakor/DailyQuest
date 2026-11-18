import { useState } from 'react';

export default function RewardedAdPlaceholder({ onReward, rewardText = '+20 Coins' }) {
  const [watching, setWatching] = useState(false);
  const [claimed, setClaimed] = useState(false);

  const handleClick = () => {
    if (claimed || watching) return;
    setWatching(true);
    setTimeout(() => {
      setWatching(false);
      setClaimed(true);
      if (onReward) onReward();
      setTimeout(() => setClaimed(false), 2000);
    }, 2500);
  };

  return (
    <div className="rewarded-ad" onClick={handleClick}>
      <div className="rewarded-ad-icon">{claimed ? '✅' : '🎬'}</div>
      <div className="rewarded-ad-text">
        {watching ? 'Playing demo ad...' : claimed ? 'Reward claimed!' : 'Watch an ad for a reward'}
      </div>
      <div className="rewarded-ad-sub">
        {watching ? 'Demo only — no real ad' : `Reward: ${rewardText} (demo)`}
      </div>
    </div>
  );
}
