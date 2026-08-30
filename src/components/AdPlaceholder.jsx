export default function AdPlaceholder({ label = 'Advertisement' }) {
  return (
    <div className="ad-placeholder" aria-label="advertisement area">
      <div className="ad-placeholder-label">{label}</div>
      <div className="ad-placeholder-text">Your ad could be here</div>
    </div>
  );
}
