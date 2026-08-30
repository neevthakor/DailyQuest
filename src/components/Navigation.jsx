const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'quests', label: 'Quests', icon: '📜' },
  { id: 'duel', label: 'Duel', icon: '⚔️' },
  { id: 'leaderboard', label: 'Ranks', icon: '📊' },
  { id: 'achievements', label: 'Awards', icon: '🏆' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function Navigation({ current, onNavigate, coins }) {
  return (
    <>
      <nav className="nav-top">
        <div className="app-brand">DAILYQUEST</div>
        <div className="nav-top-items">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`nav-top-item ${current === item.id ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
          <button className="nav-top-item" onClick={() => onNavigate('premium')}>
            ⭐ PRO
          </button>
        </div>
      </nav>

      <nav className="nav-bottom">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${current === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-item-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
