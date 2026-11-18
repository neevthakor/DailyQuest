import { useState } from 'react';
import { getToday, toDateString } from '../utils/date';
import { decomposeGoalIntoMilestones, generateAICoachPlan } from '../services/aiCoachService';
import {
  loadNotificationPrefs,
  requestNotificationPermission,
  saveNotificationPrefs,
} from '../services/notificationService';

export default function SmartPlanner({ data, onNavigate, showToast }) {
  const today = getToday();
  const [selectedDate, setSelectedDate] = useState(today);
  const [goalInput, setGoalInput] = useState('');
  const [milestones, setMilestones] = useState(() => decomposeGoalIntoMilestones());
  const [notifPrefs, setNotifPrefs] = useState(() => loadNotificationPrefs());

  const plan = generateAICoachPlan();

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 1 + i);
    return {
      iso: toDateString(d),
      short: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: d.getDate(),
    };
  });

  const handleDecompose = (e) => {
    e.preventDefault();
    setMilestones(decomposeGoalIntoMilestones(goalInput));
    showToast?.('Goal decomposed into 4 actionable milestones!');
  };

  const handleEnableNotifs = async () => {
    const status = await requestNotificationPermission();
    setNotifPrefs(loadNotificationPrefs());
    showToast?.(`Notification permission: ${status}`);
  };

  const toggleNotifPref = (key) => {
    const next = saveNotificationPrefs({ [key]: !notifPrefs[key] });
    setNotifPrefs(next);
  };

  return (
    <div>
      <div className="page-title">Smart Calendar & Planner</div>
      <div className="page-subtitle">Weekly timeline, Goal-to-Task breakdown & gentle reminders</div>

      {/* 7-DAY INTERACTIVE CALENDAR STRIP */}
      <div className="card mb-16">
        <div className="section-title mb-16">📅 7-Day Schedule Strip</div>
        <div className="calendar-strip">
          {weekDays.map((d) => (
            <button
              key={d.iso}
              className={`calendar-day-btn ${selectedDate === d.iso ? 'active' : ''}`}
              onClick={() => setSelectedDate(d.iso)}
            >
              <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>{d.short}</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{d.dayNum}</span>
            </button>
          ))}
        </div>
        <div className="duel-sub mt-16">
          Viewing schedule for <strong>{selectedDate}</strong> · {data?.quests?.items?.length || 5} Daily Quests + 3 Brain Duels scheduled
        </div>
      </div>

      {/* GOAL-TO-MILESTONE DECOMPOSER */}
      <div className="card mb-16">
        <div className="section-title mb-16">🎯 Goal-to-Task Breakdown</div>
        <form onSubmit={handleDecompose} style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          <input
            className="input-field"
            placeholder="Enter any big goal (e.g. Full-Stack Portfolio, GATE CS...)"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">Break Down</button>
        </form>
        {milestones.map((m) => (
          <div key={m.step} className="quest-card" style={{ padding: '10px 12px' }}>
            <div className="quest-body">
              <div className="quest-title" style={{ fontSize: '0.88rem' }}>{m.title}</div>
              <div className="duel-sub">Target window: Day {m.targetDays}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => onNavigate('todos')}>
              Schedule →
            </button>
          </div>
        ))}
      </div>

      {/* AI DAILY TIME-BLOCKED SCHEDULE */}
      <div className="card mb-16">
        <div className="section-title mb-16">⚡ Recommended Daily Time Blocks</div>
        {plan.tasks.map((t) => (
          <div key={t.id} className="quest-card" style={{ padding: '10px 12px' }}>
            <div className="quest-body">
              <div className="quest-title" style={{ fontSize: '0.88rem' }}>{t.title}</div>
              <div className="duel-sub">{t.reason}</div>
            </div>
            <span className="tag tag-reward">{t.targetMinutes}m</span>
          </div>
        ))}
      </div>

      {/* ETHICAL NOTIFICATION PREFERENCES */}
      <div className="card">
        <div className="section-header" style={{ marginBottom: 10 }}>
          <span className="section-title">🔔 Gentle Reminder Preferences</span>
          <button className="btn btn-secondary" onClick={handleEnableNotifs}>
            {notifPrefs.permissionStatus === 'granted' ? '✓ Permitted' : 'Allow Browser Alerts'}
          </button>
        </div>
        {[
          { key: 'questReminders', label: 'Daily Quest Reminders' },
          { key: 'habitReminders', label: 'Morning & Evening Habit Check-Ins' },
          { key: 'goalDeadlines', label: 'Upcoming Goal Deadlines' },
          { key: 'weeklySummary', label: 'Sunday Weekly Brain Report Ready' },
        ].map((item) => (
          <div key={item.key} className="inline-edit-row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <span className="duel-sub" style={{ color: 'var(--text)' }}>{item.label}</span>
            <input
              type="checkbox"
              checked={!!notifPrefs[item.key]}
              onChange={() => toggleNotifPref(item.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
