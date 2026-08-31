import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { goalsService } from '../services/goalsService';
import { IMPROVEMENT_CATEGORIES, GOAL_FREQUENCIES } from '../lib/premiumConfig';

const EMPTY_FORM = { title: '', category: IMPROVEMENT_CATEGORIES[0], target: '', frequency: 'daily', endDate: '' };

export default function Goals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      setGoals(await goalsService.fetchGoals(user.id));
    } catch (e) {
      setError(e.message || 'Could not load your goals.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      const created = await goalsService.createGoal(user.id, form);
      setGoals((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e.message || 'Could not create the goal.');
    }
  }

  async function bump(goal, delta) {
    try {
      const updated = await goalsService.updateGoalProgress(user.id, goal.id, goal.progress + delta);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? updated : g)));
    } catch (e) {
      setError(e.message || 'Could not update progress.');
    }
  }

  async function remove(goal) {
    try {
      await goalsService.deleteGoal(user.id, goal.id);
      setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    } catch (e) {
      setError(e.message || 'Could not delete the goal.');
    }
  }

  return (
    <div>
      <div className="page-title">Goals</div>
      <div className="page-subtitle">Longer-running improvement targets, alongside your DailyQuests</div>

      <form className="card mb-16" onSubmit={handleCreate}>
        <div className="section-title mb-16">New goal</div>
        <input
          className="input-field mb-16"
          placeholder='e.g. "Study consistently"'
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="inline-edit-row mb-16">
          <select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {IMPROVEMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input-field" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            {GOAL_FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <input
          className="input-field mb-16"
          placeholder="Target (optional, e.g. '20 min/day')"
          value={form.target}
          onChange={(e) => setForm({ ...form, target: e.target.value })}
        />
        <button className="btn btn-primary btn-full" type="submit">Add goal</button>
      </form>

      {error && <div className="form-error mb-16">{error}</div>}
      {loading && <div className="page-subtitle">Loading your goals...</div>}
      {!loading && goals.length === 0 && <div className="empty-state">No goals yet — add one above.</div>}

      {goals.map((goal) => (
        <div key={goal.id} className="card mb-16">
          <div style={{ fontWeight: 600 }}>{goal.title}</div>
          <div className="duel-sub mb-16">
            {goal.category} · {goal.frequency}{goal.target ? ` · ${goal.target}` : ''} · {goal.status}
          </div>
          <div className="progress-bar mb-16">
            <div className="progress-bar-fill" style={{ width: `${goal.progress}%` }} />
          </div>
          <div className="inline-edit-row">
            <button className="btn btn-secondary" onClick={() => bump(goal, -10)}>-10%</button>
            <button className="btn btn-secondary" onClick={() => bump(goal, 10)}>+10%</button>
            <button className="btn btn-danger" onClick={() => remove(goal)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
