export default function ProgressBar({ value, max, label, sublabel }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      {label && (
        <div className="progress-label">
          <span>{label}</span>
          {sublabel && <span>{sublabel}</span>}
        </div>
      )}
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
