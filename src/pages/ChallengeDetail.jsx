import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { challengesService } from '../services/challengesService';

export default function ChallengeDetail({ challenge }) {
  const { user } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [myProgress, setMyProgress] = useState(0);
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!challenge) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await challengesService.fetchChallengeParticipants(challenge.id);
      setParticipants(rows);
      const mine = rows.find((r) => r.user_id === user.id);
      setJoined(!!mine);
      setMyProgress(mine?.progress || 0);
    } catch (e) {
      setError(e.message || 'Could not load this challenge.');
    } finally {
      setLoading(false);
    }
  }, [challenge, user]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleJoin() {
    try {
      await challengesService.joinChallenge(user.id, challenge.id);
      load();
    } catch (e) {
      setError(e.message || 'Could not join the challenge.');
    }
  }

  async function updateProgress(delta) {
    const next = Math.max(0, Math.min(100, myProgress + delta));
    try {
      await challengesService.updateMyChallengeProgress(user.id, challenge.id, next);
      setMyProgress(next);
      load();
    } catch (e) {
      setError(e.message || 'Could not update your progress.');
    }
  }

  if (!challenge) return <div className="empty-state">No challenge selected.</div>;

  return (
    <div>
      <div className="page-title">{challenge.title}</div>
      <div className="page-subtitle">{challenge.startDate} → {challenge.endDate}</div>

      {error && <div className="form-error mb-16">{error}</div>}
      {challenge.goal && <div className="card mb-16">Goal: {challenge.goal}</div>}

      {!joined ? (
        <button className="btn btn-primary btn-full mb-16" onClick={handleJoin}>Join challenge</button>
      ) : (
        <div className="card mb-16">
          <div className="section-title mb-16">Your progress</div>
          <div className="progress-bar mb-16">
            <div className="progress-bar-fill" style={{ width: `${myProgress}%` }} />
          </div>
          <div className="inline-edit-row">
            <button className="btn btn-secondary" onClick={() => updateProgress(-10)}>-10%</button>
            <button className="btn btn-secondary" onClick={() => updateProgress(10)}>+10%</button>
          </div>
        </div>
      )}

      {loading && <div className="page-subtitle">Loading...</div>}

      <div className="section-title mb-16">Leaderboard</div>
      {participants
        .slice()
        .sort((a, b) => b.progress - a.progress)
        .map((p, idx) => (
          <div key={p.user_id} className={`leaderboard-row ${p.user_id === user.id ? 'is-me' : ''}`}>
            <div className="leaderboard-rank">{idx + 1}</div>
            <div className="leaderboard-score">{p.progress}%{p.completed ? ' ✓' : ''}</div>
          </div>
        ))}
    </div>
  );
}
