export default function LevelUpNotification({ level, onClose }) {
  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="levelup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="levelup-icon">🎉</div>
        <div className="levelup-title">LEVEL UP!</div>
        <div className="levelup-sub">You reached Level {level}</div>
        <button className="btn btn-primary" onClick={onClose}>Awesome!</button>
      </div>
    </div>
  );
}
