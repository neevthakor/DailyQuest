import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { todosService } from '../services/todosService';
import { TODO_PRIORITIES } from '../lib/premiumConfig';

const EMPTY_FORM = { title: '', description: '', priority: 'medium', category: '', dueDate: '' };

export default function Todos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('open'); // open | all | done

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const items = await todosService.fetchTodos(user.id, { sort: 'due_date', order: 'asc' });
      setTodos(items);
    } catch (e) {
      setError(e.message || 'Could not load your tasks.');
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
      const created = await todosService.createTodo(user.id, form);
      setTodos((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
    } catch (e) {
      setError(e.message || 'Could not create the task.');
    }
  }

  async function toggleComplete(todo) {
    try {
      const updated = await todosService.updateTodo(user.id, todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setError(e.message || 'Could not update the task.');
    }
  }

  async function remove(todo) {
    try {
      await todosService.deleteTodo(user.id, todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (e) {
      setError(e.message || 'Could not delete the task.');
    }
  }

  const visible = todos.filter((t) => {
    if (filter === 'open') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  return (
    <div>
      <div className="page-title">My Tasks</div>
      <div className="page-subtitle">Personal to-dos, separate from your DailyQuests</div>

      <form className="card mb-16" onSubmit={handleCreate}>
        <div className="section-title mb-16">New task</div>
        <input
          className="input-field mb-16"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <input
          className="input-field mb-16"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <div className="inline-edit-row mb-16">
          <select
            className="input-field"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {TODO_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            className="input-field"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </div>
        <button className="btn btn-primary btn-full" type="submit">Add task</button>
      </form>

      {error && <div className="form-error mb-16">{error}</div>}

      <div className="leaderboard-tabs mb-16">
        {['open', 'all', 'done'].map((f) => (
          <button
            key={f}
            className={`leaderboard-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div className="page-subtitle">Loading your tasks...</div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state">No tasks here yet.</div>
      )}

      {visible.map((todo) => (
        <div key={todo.id} className={`card mb-16 ${todo.completed ? 'completed' : ''}`}>
          <div className="inline-edit-row">
            <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{todo.title}</div>
              {todo.description && <div className="duel-sub">{todo.description}</div>}
              <div className="duel-sub">
                {todo.priority} priority{todo.dueDate ? ` · due ${todo.dueDate}` : ''}
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => remove(todo)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
