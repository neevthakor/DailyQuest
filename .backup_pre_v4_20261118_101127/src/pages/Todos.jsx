import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { todosService } from '../services/todosService';
import { TODO_PRIORITIES } from '../lib/premiumConfig';
import { recordTaskSession } from '../services/deviceBehaviorService';
import { generateAICoachPlan } from '../services/aiCoachService';
import { addCBTEntry, CBT_TRIGGERS, getCBTJournal } from '../services/psychologyService';

const LOCAL_TODOS_KEY = 'dailyquest_local_todos_v2';
const EMPTY_FORM = { title: '', description: '', priority: 'medium', category: 'Focus', dueDate: '', targetMinutes: 25 };

function loadLocalTodos() {
  try {
    const raw = localStorage.getItem(LOCAL_TODOS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTodos(list) {
  try {
    localStorage.setItem(LOCAL_TODOS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function formatClock(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Todos({ onAdjustGold, showToast }) {
  const { user } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('open');

  // Live Task Tracking State
  const [activeTask, setActiveTask] = useState(null);
  const [isMicroStart, setIsMicroStart] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const timerRef = useRef(null);

  // CBT Thought-Reframing State
  const [cbtPromptTask, setCbtPromptTask] = useState(null);
  const [cbtTrigger, setCbtTrigger] = useState(CBT_TRIGGERS[0]);
  const [cbtReframe, setCbtReframe] = useState('');
  const [journal, setJournal] = useState(() => getCBTJournal());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user) {
      setTodos(loadLocalTodos());
      setLoading(false);
      return;
    }
    try {
      const items = await todosService.fetchTodos(user.id, { sort: 'due_date', order: 'asc' });
      setTodos(items);
    } catch {
      setTodos(loadLocalTodos());
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!activeTask || isPaused) return;
    timerRef.current = setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);

    const onVisChange = () => {
      if (document.hidden) setDistractions((d) => d + 1);
    };
    document.addEventListener('visibilitychange', onVisChange);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisChange);
    };
  }, [activeTask, isPaused]);

  const startLiveTracking = (todo, micro = false) => {
    setActiveTask(todo);
    setIsMicroStart(micro);
    setElapsedSec(0);
    setDistractions(0);
    setIsPaused(false);
    showToast?.(micro ? `⚡ 2-Minute Micro-Start: ${todo.title}` : `Live tracking started: ${todo.title}`);
  };

  const stopLiveTracking = async (markDone = false) => {
    if (!activeTask) return;
    clearInterval(timerRef.current);
    const targetSec = isMicroStart ? 120 : (Number(activeTask.targetMinutes) || 25) * 60;
    const focusedMins = Math.max(1, Math.floor(elapsedSec / 60));

    recordTaskSession({
      id: activeTask.id,
      title: activeTask.title,
      category: activeTask.category || 'Focus',
      durationSec: elapsedSec,
      targetSec,
      distractions,
      completed: markDone,
    });

    if (isMicroStart && elapsedSec >= 120) {
      onAdjustGold?.(15 + focusedMins * 2, `2-Min Micro-Start Ignited: ${activeTask.title}`);
      showToast?.(`🔥 Momentum unlocked! +${15 + focusedMins * 2} 🪙`);
    } else if (markDone) {
      const goldEarned = Math.max(10, focusedMins * 2 + 25 + (distractions === 0 ? 15 : 0));
      onAdjustGold?.(goldEarned, `Live focus session: ${activeTask.title}`);
      showToast?.(`Focus logged (${formatClock(elapsedSec)})! +${goldEarned} 🪙`);
    } else if (elapsedSec < 120) {
      setCbtPromptTask(activeTask);
    }

    if (markDone && !activeTask.completed) {
      await toggleComplete(activeTask);
    }
    setActiveTask(null);
    setIsMicroStart(false);
    setElapsedSec(0);
    setDistractions(0);
  };

  const handleSaveCBT = (e) => {
    e.preventDefault();
    if (!cbtReframe.trim()) return;
    addCBTEntry({ trigger: cbtTrigger, reframe: cbtReframe, context: cbtPromptTask?.title || 'Task Pause' });
    setJournal(getCBTJournal());
    onAdjustGold?.(20, 'CBT Self-Awareness Reflection (+20 Gold)');
    showToast?.('Reframe saved! +20 🪙 for honest self-awareness.');
    setCbtPromptTask(null);
    setCbtReframe('');
  };

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (!user) {
      const localItem = { id: `local_${Date.now()}`, ...form, completed: false };
      const next = [localItem, ...todos];
      setTodos(next);
      saveLocalTodos(next);
      setForm(EMPTY_FORM);
      return;
    }
    try {
      const created = await todosService.createTodo(user.id, form);
      setTodos((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message || 'Could not create the task.');
    }
  }

  async function handleImportAITasks() {
    const plan = generateAICoachPlan();
    const newItems = plan.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.reason,
      priority: 'high',
      category: t.category,
      targetMinutes: t.targetMinutes,
      completed: false,
    }));
    const existingIds = new Set(todos.map((x) => x.id));
    const unique = newItems.filter((x) => !existingIds.has(x.id));
    if (unique.length === 0) {
      showToast?.('Today’s AI tasks are already in your list!');
      return;
    }
    const next = [...unique, ...todos];
    setTodos(next);
    saveLocalTodos(next);
    showToast?.(`Imported ${unique.length} AI-tailored tasks!`);
  }

  async function toggleComplete(todo) {
    if (!user || String(todo.id).startsWith('local_') || String(todo.id).startsWith('ai_')) {
      const next = todos.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t));
      setTodos(next);
      saveLocalTodos(next);
      return;
    }
    try {
      const updated = await todosService.updateTodo(user.id, todo.id, { completed: !todo.completed });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (err) {
      setError(err.message || 'Could not update the task.');
    }
  }

  async function remove(todo) {
    if (!user || String(todo.id).startsWith('local_') || String(todo.id).startsWith('ai_')) {
      const next = todos.filter((t) => t.id !== todo.id);
      setTodos(next);
      saveLocalTodos(next);
      return;
    }
    try {
      await todosService.deleteTodo(user.id, todo.id);
      setTodos((prev) => prev.filter((t) => t.id !== todo.id));
    } catch (err) {
      setError(err.message || 'Could not delete the task.');
    }
  }

  const visible = todos.filter((t) => {
    if (filter === 'open') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const targetSec = isMicroStart ? 120 : (Number(activeTask?.targetMinutes) || 25) * 60;
  const pct = activeTask ? Math.min(100, Math.round((elapsedSec / targetSec) * 100)) : 0;

  return (
    <div>
      <div className="page-title">Live Tasks & Therapist Focus</div>
      <div className="page-subtitle">Track focus in real time · 2-Min Micro-Starts · +2 Gold/min</div>

      {cbtPromptTask && (
        <form className="card mb-16" style={{ borderColor: 'var(--primary)' }} onSubmit={handleSaveCBT}>
          <div className="section-title mb-16">🫂 Therapist Check-In: Stopped Early?</div>
          <div className="duel-sub mb-16">
            No guilt — what got in the way of "{cbtPromptTask.title}"? (+20 Gold for honest reflection)
          </div>
          <select className="input-field mb-16" value={cbtTrigger} onChange={(e) => setCbtTrigger(e.target.value)}>
            {CBT_TRIGGERS.map((tr) => <option key={tr} value={tr}>{tr}</option>)}
          </select>
          <input
            className="input-field mb-16"
            placeholder="1-line reframe (e.g. 'I will do just 2 mins next without my phone')"
            value={cbtReframe}
            onChange={(e) => setCbtReframe(e.target.value)}
          />
          <div className="inline-edit-row">
            <button className="btn btn-primary" type="submit">Save Reframe (+20 🪙)</button>
            <button className="btn btn-secondary" type="button" onClick={() => setCbtPromptTask(null)}>Skip</button>
          </div>
        </form>
      )}

      {activeTask && (
        <div className="card mb-16" style={{ borderColor: 'var(--accent)', background: 'rgba(245,158,11,0.08)' }}>
          <div className="section-header" style={{ marginBottom: 6 }}>
            <span className="section-title">
              {isMicroStart ? '⚡ 2-Min Micro-Start: ' : '⏱ Live Tracking: '}
              {activeTask.title}
            </span>
            <span className="tag tag-reward">{pct}%</span>
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, textAlign: 'center', margin: '8px 0', color: 'var(--text-bright)' }}>
            {formatClock(elapsedSec)}{' '}
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              / {isMicroStart ? '02:00' : `${activeTask.targetMinutes || 25}:00`}
            </span>
          </div>
          <div className="progress-bar mb-16">
            <div className="progress-bar-fill" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
          </div>
          <div className="duel-sub mb-16">
            Tab-switch distractions: <strong>{distractions}</strong> {distractions === 0 && '· +15 Gold Zero-Distraction Bonus active!'}
          </div>
          <div className="inline-edit-row">
            <button className="btn btn-secondary" onClick={() => setIsPaused((p) => !p)}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>
            <button className="btn btn-primary" onClick={() => stopLiveTracking(true)}>
              ✓ Finish & Claim Gold
            </button>
            <button className="btn btn-danger" onClick={() => stopLiveTracking(false)}>
              Stop
            </button>
          </div>
        </div>
      )}

      <div className="card mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700 }}>🤖 AI-Tailored Tasks</div>
          <div className="duel-sub">Generate tasks matched to your goal & behavior</div>
        </div>
        <button className="btn btn-accent" onClick={handleImportAITasks}>
          + Load AI Tasks
        </button>
      </div>

      <form className="card mb-16" onSubmit={handleCreate}>
        <div className="section-title mb-16">New tracked task</div>
        <input
          className="input-field mb-16"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <div className="inline-edit-row mb-16">
          <select
            className="input-field"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {TODO_PRIORITIES.map((p) => (
              <option key={p} value={p}>{p} priority</option>
            ))}
          </select>
          <select
            className="input-field"
            value={form.targetMinutes}
            onChange={(e) => setForm({ ...form, targetMinutes: Number(e.target.value) })}
          >
            <option value={15}>⏱ 15 min sprint</option>
            <option value={25}>⏱ 25 min Pomodoro</option>
            <option value={45}>⏱ 45 min deep work</option>
            <option value={60}>⏱ 60 min mastery</option>
          </select>
        </div>
        <button className="btn btn-primary btn-full" type="submit">Add Task</button>
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
      {!loading && visible.length === 0 && <div className="empty-state">No tasks here yet.</div>}

      {visible.map((todo) => (
        <div key={todo.id} className={`card mb-16 ${todo.completed ? 'completed' : ''}`}>
          <div className="inline-edit-row">
            <input type="checkbox" checked={todo.completed} onChange={() => toggleComplete(todo)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{todo.title}</div>
              {todo.description && <div className="duel-sub">{todo.description}</div>}
              <div className="duel-sub">
                {todo.priority} · ⏱ {todo.targetMinutes || 25}m{todo.dueDate ? ` · due ${todo.dueDate}` : ''}
              </div>
            </div>
            {!todo.completed && (
              <>
                <button
                  className="btn btn-secondary"
                  title="2-Minute Anti-Procrastination Ignition"
                  onClick={() => startLiveTracking(todo, true)}
                  disabled={activeTask?.id === todo.id}
                >
                  ⚡ 2m
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => startLiveTracking(todo, false)}
                  disabled={activeTask?.id === todo.id}
                >
                  {activeTask?.id === todo.id ? 'Live' : '▶'}
                </button>
              </>
            )}
            <button className="btn btn-danger" onClick={() => remove(todo)}>✕</button>
          </div>
        </div>
      ))}

      {journal.length > 0 && (
        <div className="card mt-16">
          <div className="section-title mb-16">📓 Recent CBT Reframes</div>
          {journal.slice(0, 3).map((j) => (
            <div key={j.id} className="duel-sub" style={{ marginBottom: 8 }}>
              <strong>{j.trigger}:</strong> "{j.reframe}"
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
