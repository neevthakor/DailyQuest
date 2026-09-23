import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePremium } from '../hooks/usePremium';
import { groupsService } from '../services/groupsService';

export default function Groups({ onOpenGroup, onNavigate }) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const [myGroups, setMyGroups] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setError(e.message || 'Could not load groups.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

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
    try {
      const result = await groupsService.createGroup({ name: newGroupName, description: newGroupDesc });
      if (!result.success) {
        setError(result.reason === 'premium_required'
          ? 'Creating groups is a Pro feature.'
          : 'Could not create the group.');
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
      <div className="page-title">Groups</div>
      <div className="page-subtitle">Find your people, or start your own</div>

      <div className="card mb-16">
        <div className="section-title mb-16">Create a group</div>
        {!isPremium ? (
          <div>
            <div className="duel-sub mb-16">Group creation is a Pro feature. Free users can join any existing group.</div>
            <button className="btn btn-accent" onClick={() => onNavigate && onNavigate('premium')}>See Pro plans</button>
          </div>
        ) : (
          <form onSubmit={handleCreate}>
            <input
              className="input-field mb-16"
              placeholder="Group name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <input
              className="input-field mb-16"
              placeholder="Description (optional)"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
            />
            <button className="btn btn-primary btn-full" type="submit">Create group</button>
          </form>
        )}
      </div>

      {error && <div className="form-error mb-16">{error}</div>}
      {loading && <div className="page-subtitle">Loading groups...</div>}

      <div className="section-title mb-16">My groups</div>
      {myGroups.length === 0 && <div className="empty-state mb-16">You haven&apos;t joined a group yet.</div>}
      {myGroups.map((g) => (
        <div key={g.id} className="card mb-16" onClick={() => onOpenGroup && onOpenGroup(g)} style={{ cursor: 'pointer' }}>
          <div style={{ fontWeight: 600 }}>{g.name}</div>
          <div className="duel-sub">{g.description}</div>
        </div>
      ))}

      <div className="section-title mb-16">Discover</div>
      {discover.filter((g) => !myGroupIds.has(g.id)).map((g) => (
        <div key={g.id} className="card mb-16">
          <div style={{ fontWeight: 600 }}>{g.name}</div>
          <div className="duel-sub mb-16">{g.description}</div>
          <button className="btn btn-secondary" onClick={() => handleJoin(g)}>
            Join (1k 🪙)
          </button>
        </div>
      ))}
    </div>
  );
}
