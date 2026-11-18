import { useState } from 'react';
import { getToday } from '../utils/date';
import {
  calculateHabitMetrics,
  createHabit,
  deleteHabit,
  getWeeklyHabitSummary,
  HABIT_CATEGORIES,
  HABIT_DIFFICULTIES,
  ROUTINE_SLOTS,
  toggleHabitDate,
} from '../services/habitService';

const EMPTY_HABIT = {
  title: '',
  category: 'Focus',
  frequency: 'daily',
  targetDaysPerWeek: 7,
  difficulty: 'medium',
  routineSlot: 'morning',
};

export default function HabitForge({ onAdjustGold, showToast }) {
  const [summary, setSummary] = useState(() => getWeeklyHabitSummary());
  const [routineFilter, setRoutineFilter] = useState('all');
  const [form, setForm] = useState(EMPTY_HABIT);
  const [showAdd, setShowAdd] = useState(false);

  const today = getToday();

  const refresh = () => setSummary(getWeeklyHabitSummary(today));

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    createHabit(form);
    setForm(EMPTY_HABIT);
    setShowAdd(false);
    refresh();
    showToast?.('New habit forged!');
  };

  const handleToggle = (habitId, mode = 'completed') => {
    const res = toggleHabitDate(habitId, today, mode);
    refresh();
    if (res.toggledOn && mode === 'completed') {
      onAdjustGold?.(res.goldDelta, `Habit Check-In`);
      showToast?.(`✓ Habit logged! +${res.xpDelta} XP & +${res.goldDelta} 🪙`);
    } else if (res.toggledOn && mode === 'recovery') {
      showToast?.('🛡️ Recovery Day logged — streak preserved without guilt!');
    }
  };

  const handleDelete = (habitId) => {
    deleteHabit(habitId);
    refresh();
    showToast?.('Habit removed.');
  };

  const filteredItems = summary.items.filter(({ habit }) => {
    if (routineFilter === 'all') return true;
    return habit.routineSlot === routineFilter;
  });

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="page-title" style={{ marginBottom: 2 }}>Habit Forge</div>
          <div className="page-subtitle" style={{ marginBottom: 0 }}>
            Routines, 28-Day Heatmaps, Recovery Days & Consistency
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? 'Close' : '+ Habit'}
        </button>
      </div>

      <div className="stat-row mt-16">
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.completedToday}/{summary.totalHabits}</div>
          <div className="stat-pill-label">Today</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">{summary.avgConsistency}%</div>
          <div className="stat-pill-label">Consistency</div>
        </div>
        <div className="stat-pill">
          <div className="stat-pill-value">🔥 {summary.bestStreak}d</div>
          <div className="stat-pill-label">Best Streak</div>
        </div>
      </div>

      {showAdd && (
        <form className="card mb-16" onSubmit={handleCreate}>
          <div className="section-title mb-16">Forge a New Habit</div>
          <input
            className="input-field mb-16"
            placeholder="Habit title (e.g. 30m Morning LeetCode)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="inline-edit-row mb-16">
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {HABIT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              className="input-field"
              value={form.routineSlot}
              onChange={(e) => setForm({ ...form, routineSlot: e.target.value })}
            >
              {ROUTINE_SLOTS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <div className="inline-edit-row mb-16">
            <select
              className="input-field"
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
            >
              {HABIT_DIFFICULTIES.map((d) => (
                <option key={d.id} value={d.id}>{d.label} (+{d.gold} 🪙)</option>
              ))}
            </select>
            <select
              className="input-field"
              value={form.targetDaysPerWeek}
              onChange={(e) => setForm({ ...form, targetDaysPerWeek: Number(e.target.value) })}
            >
              {[3, 4, 5, 6, 7].map((n) => (
                <option key={n} value={n}>{n} days / week</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-full" type="submit">Save Habit</button>
        </form>
      )}

      <div className="chip-scroll mb-16">
        <button
          className={`chip-btn ${routineFilter === 'all' ? 'active' : ''}`}
          onClick={() => setRoutineFilter('all')}
        >
          All ({summary.totalHabits})
        </button>
        {ROUTINE_SLOTS.map((r) => (
          <button
            key={r.id}
            className={`chip-btn ${routineFilter === r.id ? 'active' : ''}`}
            onClick={() => setRoutineFilter(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filteredItems.map(({ habit, currentStreak, longestStreak, consistencyScore, heatmap28, completedToday, recoveredToday }) => {
        const diff = HABIT_DIFFICULTIES.find((d) => d.id === habit.difficulty) || HABIT_DIFFICULTIES[1];
        return (
          <div key={habit.id} className={`card mb-16 ${completedToday ? 'completed' : ''}`}>
            <div className="inline-edit-row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{habit.title}</div>
                <div className="duel-sub">
                  {habit.category} · {habit.targetDaysPerWeek}d/wk · 🔥 {currentStreak}d (Best {longestStreak}d) · {consistencyScore}% consistency
                </div>
              </div>
              <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => handleDelete(habit.id)}>
                ✕
              </button>
            </div>

            {/* 28-DAY GITHUB-STYLE CONTRIBUTION HEATMAP */}
            <div className="habit-heatmap mt-16 mb-16" title="Last 28 Days Contribution Heatmap">
              {heatmap28.map((cell) => (
                <div
                  key={cell.date}
                  className={`heatmap-cell ${cell.status === 'completed' ? 'done' : cell.status === 'recovery' ? 'recovery' : ''}`}
                  title={`${cell.date}: ${cell.status || 'missed'}`}
                />
              ))}
            </div>

            <div className="inline-edit-row">
              <button
                className={`btn ${completedToday ? 'btn-secondary' : 'btn-primary'}`}
                style={{ flex: 1 }}
                onClick={() => handleToggle(habit.id, 'completed')}
              >
                {completedToday ? '✓ Completed Today' : `Check In (+${diff.gold} 🪙)`}
              </button>
              {!completedToday && (
                <button
                  className="btn btn-secondary"
                  title="Log a Recovery Day to protect your streak when sick or resting"
                  onClick={() => handleToggle(habit.id, 'recovery')}
                >
                  {recoveredToday ? '🛡️ Recovered' : '🛡️ Rest Day'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
