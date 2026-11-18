import { useEffect, useState } from 'react';
import { getSyncStatus, processSyncQueue } from '../services/offlineSyncService';

const NAV_ITEMS = [
  { id: 'home', label: 'OS Home', icon: '🏠' },
  { id: 'hub-activities', label: 'Brain & RPG', icon: '🧠' },
  { id: 'hub-productivity', label: 'Growth & Focus', icon: '🔥' },
  { id: 'hub-rewards', label: 'Shop & Pro', icon: '🎁' },
  { id: 'leaderboard', label: 'Leader', icon: '🏆' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function Navigation({ current, onNavigate, coins }) {
  const [syncInfo, setSyncInfo] = useState(() => getSyncStatus());
  const [lightMode, setLightMode] = useState(() => {
    try {
      return localStorage.getItem('dailyquest_theme_mode_v4') === 'light';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('light-mode', lightMode);
    }
    try {
      localStorage.setItem('dailyquest_theme_mode_v4', lightMode ? 'light' : 'dark');
    } catch {
      // ignore
    }
  }, [lightMode]);

  useEffect(() => {
    const refresh = () => setSyncInfo(getSyncStatus());
    const onOnline = () => {
      processSyncQueue().finally(refresh);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', refresh);
    const id = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', refresh);
      clearInterval(id);
    };
  }, []);

  return (
    <>
      <nav className="nav-top" aria-label="Primary Navigation">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="app-brand" onClick={() => onNavigate('home')} style={{ cursor: 'pointer' }}>
            DAILYQUEST <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>v4</span>
          </div>
          <span
            className="sync-pill"
            title={`${syncInfo.state} (${syncInfo.pendingCount} queued)`}
            onClick={() => processSyncQueue().then(() => setSyncInfo(getSyncStatus()))}
          >
            {syncInfo.online ? '🟢' : '🟠'} {syncInfo.pendingCount > 0 ? `${syncInfo.pendingCount} sync` : syncInfo.state}
          </span>
        </div>

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
          <button
            className="nav-top-item"
            title="Toggle Light / Dark Mode"
            onClick={() => setLightMode((m) => !m)}
          >
            {lightMode ? '🌙' : '☀️'}
          </button>
          <button className="nav-top-item" onClick={() => onNavigate('premium')}>
            ⭐ PRO
          </button>
          {coins !== undefined && (
            <button
              className="nav-top-item"
              style={{ color: '#f59e0b', fontWeight: 'bold' }}
              onClick={() => onNavigate('shop')}
            >
              🪙 {coins}
            </button>
          )}
        </div>
      </nav>

      <nav className="nav-bottom" aria-label="Mobile Bottom Navigation">
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
