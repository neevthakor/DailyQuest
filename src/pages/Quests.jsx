import QuestCard from '../components/QuestCard';
import AdPlaceholder from '../components/AdPlaceholder';
import { formatDisplayDate } from '../utils/date';

export default function Quests({ data, onCompleteQuest }) {
  const completedCount = data.quests.items.filter((q) => q.completed).length;
  const total = data.quests.items.length;

  return (
    <div>
      <div className="page-title">Daily Quests</div>
      <div className="page-subtitle">{formatDisplayDate(data.quests.date)} • {completedCount}/{total} completed</div>

      <div className="progress-bar mb-16">
        <div className="progress-bar-fill" style={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }} />
      </div>

      {data.quests.items.map((q) => (
        <QuestCard key={q.id} quest={q} onComplete={onCompleteQuest} />
      ))}

      <AdPlaceholder />
    </div>
  );
}
