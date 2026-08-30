export default function Achievements({ data }) {
  const unlocked = data.achievements.filter((a) => a.unlocked).length;
  const total = data.achievements.length;

  return (
    <div>
      <div className="page-title">Achievements</div>
      <div className="page-subtitle">{unlocked} / {total} unlocked</div>

      <div className="progress-bar mb-16">
        <div className="progress-bar-fill" style={{ width: `${(unlocked / total) * 100}%` }} />
      </div>

      <div className="ach-grid">
        {data.achievements.map((a) => (
          <div key={a.id} className={`ach-card ${a.unlocked ? 'unlocked' : ''}`}>
            <div className="ach-icon">{a.icon}</div>
            <div className="ach-name">{a.name}</div>
            <div className="ach-desc">{a.description}</div>
            <div className="ach-status">{a.unlocked ? 'Unlocked' : 'Locked'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
