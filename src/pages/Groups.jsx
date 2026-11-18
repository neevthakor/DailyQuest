import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { groupsService } from '../services/groupsService';

const LOCAL_SQUADS_KEY = 'dailyquest_squad_missions_v4';

const DEFAULT_SQUAD_MISSIONS = [
  {
    id: 'sq_1',
    name: 'Algorithms & Deep Work Vanguard',
    description: 'Weekly Goal: 1,500 Squad XP + 300 Focused Minutes across members',
    weeklyXpGoal: 1500,
    currentXp: 1120,
    membersCount: 14,
    activeFocusRoom: 3,
    joined: true,
  },
  {
    id: 'sq_2',
    name: 'Morning 6AM Habit Titans',
    description: 'Zero missed morning routines · Daily 3/3 Brain Duel Trifecta',
    weeklyXpGoal: 2000,
    currentXp: 1480,
    membersCount: 22,
    activeFocusRoom: 5,
    joined: false,
  },
];

function loadLocalSquads() {
  try {
    const raw = localStorage.getItem(LOCAL_SQUADS_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_SQUAD_MISSIONS;
  } catch {
    return DEFAULT_SQUAD_MISSIONS;
  }
}

function saveLocalSquads(list) {
  try {
    localStorage.setItem(LOCAL_SQUADS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
  return list;
}

export default function Groups({ onOpenGroup, onNavigate, onAdjustGold, showToast }) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [myGroups, setMyGroups] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [squads, setSquads] = useState(() => loadLocalSquads());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [mine, found] = await Promise.all([
        groupsService.fetchMyGroups(user.id),
        groupsService.discoverGroups({}),
      ]);
      setMyGroups(mine);
      setDiscover(found);
    } catch (e) {
      setError(e.message || 'Could not load cloud groups.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleContributeSquad = (squadId) => {
    const next = squads.map((sq) => {
      if (sq.id !== squadId) return sq;
      return { ...sq, currentXp: Math.min(sq.weeklyXpGoal, sq.currentXp + 75), joined: true };
    });
    setSquads(saveLocalSquads(next));
    onAdjustGold?.(25, 'Squad Mission Co-Op Contribution');
    showToast?.('🤝 +75 Squad XP contributed! Earned +25 🪙');
  };

  async function handleJoin(group) {
    try {
      await groupsService.joinGroup(user.id, group.id);
      load();
    } catch (e) {
      setError(e.message || 'Could not join the group.');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    if (!user) {
      const created = {
        id: `sq_${Date.now()}`,
        name: newGroupName.trim(),
        description: newGroupDesc.trim() || 'Weekly Co-Op Squad Mission',
        weeklyXpGoal: 1500,
        currentXp: 100,
        membersCount: 1,
        activeFocusRoom: 1,
        joined: true,
      };
      setSquads(saveLocalSquads([created, ...squads]));
      setNewGroupName('');
      setNewGroupDesc('');
      showToast?.('Squad created!');
      return;
    }
    try {
      const result = await groupsService.createGroup({ name: newGroupName, description: newGroupDesc });
      if (!result.success) {
        setError(result.reason === 'premium_required' ? 'Creating cloud groups is a Pro feature.' : 'Could not create the group.');
        return;
      }
      setNewGroupName('');
      setNewGroupDesc('');
      load();
    } catch (e) {
      setError(e.message || 'Could not create the group.');
    }
  }

  const myGroupIds = new Set(myGroups.map((g) => g.id));

  return (
    <div>
      <div className="page-title">Squad Missions & Groups</div>
      <div className="page-subtitle">Co-op weekly XP targets, shared focus rooms & accountability</div>

      {/* ACTIVE SQUAD MISSIONS */}
      <div className="section-title mb-16">🛡️ Active Weekly Squad Missions</div>
      {squads.map((sq) => {
        const pct = Math.min(100, Math.round((sq.currentXp / sq.weeklyXpGoal) * 100));
        return (
          <div key={sq.id} className="card mb-16">
            <div className="inline-edit-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>{sq.name}</span>
              <span className="tag tag-reward">👥 {sq.membersCount} · 🟢 {sq.activeFocusRoom} focusing</span>
            </div>
            <div className="duel-sub mb-16">{sq.description}</div>
            <div className="progress-bar mb-16">
              <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="inline-edit-row" style={{ justifyContent: 'space-between' }}>
              <span className="duel-sub">Team XP: <strong>{sq.currentXp}</strong> / {sq.weeklyXpGoal} ({pct}%)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => onNavigate?.('deep-work')}>
                  Join Focus Room
                </button>
                <button className="btn btn-primary" onClick={() => handleContributeSquad(sq.id)}>
                  +Boost Squad
                </button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="card mb-16">
        <div className="section-title mb-16">Start a New Squad / Group</div>
        {!isPremium && user ? (
          <div>
            <div className="duel-sub mb-16">Cloud group creation is a Pro feature. Free users can join any existing squad.</div>
            <button className="btn btn-accent" onClick={() => onNavigate && onNavigate('premium')}>See Pro plans</button>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            <input
              className="input-field mb-16"
              placeholder="Squad name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <input
              className="input-field mb-16"
              placeholder="Weekly mission goal (optional)"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
            />
            <button className="btn btn-primary btn-full" type="submit">Create Squad</button>
          </form>
        )}
      </div>

      {error && <div className="form-error mb-16">{error}</div>}
      {loading && <div className="page-subtitle">Loading cloud groups...</div>}

      {myGroups.length > 0 && (
        <>
          <div className="section-title mb-16">My Cloud Groups</div>
          {myGroups.map((g) => (
            <div key={g.id} className="card mb-16" onClick={() => onOpenGroup && onOpenGroup(g)} style={{ cursor: 'pointer' }}>
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div className="duel-sub">{g.description}</div>
            </div>
          ))}
        </>
      )}

      {discover.filter((g) => !myGroupIds.has(g.id)).length > 0 && (
        <>
          <div className="section-title mb-16">Discover Cloud Groups</div>
          {discover.filter((g) => !myGroupIds.has(g.id)).map((g) => (
            <div key={g.id} className="card mb-16">
              <div style={{ fontWeight: 600 }}>{g.name}</div>
              <div className="duel-sub mb-16">{g.description}</div>
              <button className="btn btn-secondary" onClick={() => handleJoin(g)}>Join (1k 🪙)</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
