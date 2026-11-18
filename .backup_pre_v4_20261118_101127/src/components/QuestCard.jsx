import { DIFFICULTY_CONFIG, CATEGORY_ICONS } from '../data/quests';

export default function QuestCard({ quest, onComplete }) {
  const cfg = DIFFICULTY_CONFIG[quest.difficulty] || DIFFICULTY_CONFIG.Easy;
  const catIcon = CATEGORY_ICONS[quest.category] || '❓';
  const diffClass = (quest.difficulty || 'Easy').toLowerCase();

  return (
    <div className={`quest-card ${quest.completed ? 'completed' : ''}`}>
      <div className="quest-icon">{catIcon}</div>
      <div className="quest-body">
        <div className="quest-title">{quest.title}</div>
        <div className="quest-desc">{quest.description}</div>
        <div className="quest-meta">
          <span className={`tag tag-${diffClass}`}>{cfg.icon} {quest.difficulty}</span>
          <span className="tag tag-reward">+{quest.xpReward} XP</span>
          <span className="tag tag-reward">+{quest.coinReward} 🪙</span>
        </div>
      </div>
      {quest.completed ? (
        <div className="quest-check">✓</div>
      ) : (
        <button className="btn btn-primary quest-complete-btn" onClick={() => onComplete(quest.id)}>
          Complete
        </button>
      )}
    </div>
  );
}
