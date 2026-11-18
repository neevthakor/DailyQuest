import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { groupsService } from '../services/groupsService';
import { challengesService } from '../services/challengesService';

export default function GroupDetail({ group, onLeave, onOpenChallenge }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', goal: '', startDate: '', endDate: '' });

  const load = useCallback(async () => {
    if (!group) return;
    setLoading(true);
    setError(null);
    try {
      const [m, c] = await Promise.all([
        groupsService.fetchGroupMembers(group.id),
        challengesService.fetchGroupChallenges(group.id),
      ]);
      setMembers(m);
      setChallenges(c);
    } catch (e) {
      setError(e.message || 'Could not load this group.');
    } finally {
      setLoading(false);
    }
  }, [group]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLeave() {
    try {
      await groupsService.leaveGroup(user.id, group.id);
      onLeave && onLeave();
    } catch (e) {
      setError(e.message || 'Could not leave the group.');
    }
  }

  async function handleCreateChallenge(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    try {
      const created = await challengesService.createChallenge(user.id, group.id, form);
      setChallenges((prev) => [created, ...prev]);
      setForm({ title: '', description: '', goal: '', startDate: '', endDate: '' });
    } catch (e) {
      setError(e.message || 'Could not create the challenge.');
    }
  }

  if (!group) return <div className="empty-state">No group selected.</div>;

  return (
    <div>
      <div className="page-title">{group.name}</div>
      <div className="page-subtitle">{group.description}</div>

      {error && <div className="form-error mb-16">{error}</div>}
      {loading && <div className="page-subtitle">Loading...</div>}

      <div className="card mb-16">
        <div className="section-title mb-16">Members ({members.length})</div>
        {members.map((m) => (
          <div key={m.userId} className="leaderboard-row">
            <div className="leaderboard-username">{m.username}</div>
            {m.role === 'owner' && <div className="duel-sub">Owner</div>}
          </div>
        ))}
        <button className="btn btn-danger mt-16" onClick={handleLeave}>Leave group</button>
      </div>

      <div className="card mb-16">
        <div className="section-title mb-16">Start a challenge</div>
        <form onSubmit={handleCreateChallenge}>
          <input
            className="input-field mb-16"
            placeholder='e.g. "30 Day Study Challenge"'
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="input-field mb-16"
            placeholder="Goal (optional)"
            value={form.goal}
            onChange={(e) => setForm({ ...form, goal: e.target.value })}
          />
          <div className="inline-edit-row mb-16">
            <input
              className="input-field"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
            <input
              className="input-field"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit">Create challenge</button>
        </form>
      </div>

      <div className="section-title mb-16">Challenges</div>
      {challenges.length === 0 && <div className="empty-state">No challenges yet.</div>}
      {challenges.map((c) => (
        <div key={c.id} className="card mb-16" onClick={() => onOpenChallenge && onOpenChallenge(c)} style={{ cursor: 'pointer' }}>
          <div style={{ fontWeight: 600 }}>{c.title}</div>
          <div className="duel-sub">{c.startDate} → {c.endDate} · {c.status}</div>
        </div>
      ))}
    </div>
  );
}
