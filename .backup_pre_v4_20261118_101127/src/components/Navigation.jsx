const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: '🏠' },
  { id: 'hub-activities', label: 'Activities', icon: '🎯' },
  { id: 'hub-productivity', label: 'Productivity', icon: '✅' },
  { id: 'hub-rewards', label: 'Rewards', icon: '🎁' },
  { id: 'leaderboard', label: 'Leader', icon: '🏆' },
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
          {coins !== undefined && (
            <button className="nav-top-item" style={{ color: '#f59e0b', fontWeight: 'bold' }} onClick={() => onNavigate('shop')}>
              🪙 {coins}
            </button>
          )}
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
