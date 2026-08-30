import { useCallback, useEffect, useState } from 'react';
import { DUEL_CHALLENGES } from '../data/duels';
import { supabaseConfigError } from '../lib/supabase';
import { LEADERBOARD_PERIODS, fetchLeaderboard, fetchMyRank } from '../services/leaderboardService';
import { getToday, isValidDateString } from '../utils/date';

const CHALLENGE_NAMES = Object.fromEntries(DUEL_CHALLENGES.map((c) => [c.id, c.name]));

function formatChallenge(id) {
  return CHALLENGE_NAMES[id] || 'Daily Duel';
}

function formatShortDate(dateStr) {
  if (!isValidDateString(dateStr)) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ auth }) {
  const [period, setPeriod] = useState('today');
  const [entries, setEntries] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [myRank, setMyRank] = useState(null);
  const [rankLoading, setRankLoading] = useState(false);
  const [rankError, setRankError] = useState('');

  const isAuthenticated = !!auth?.isAuthenticated;
  const userId = auth?.user?.id;

  // Loading the global leaderboard is independent from loading the
  // signed-in user's own rank, so a failure in one can never hide a
  // successful result from the other.
  const loadLeaderboard = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const list = await fetchLeaderboard(period, getToday());
      setEntries(list);
    } catch {
      setListError(supabaseConfigError || 'Could not load the leaderboard. Please try again.');
      setEntries([]);
    } finally {
      setListLoading(false);
    }
  }, [period]);

  const loadMyRank = useCallback(async () => {
    // Guests have no rank to fetch — don't call the RPC at all.
    if (!isAuthenticated) {
      setMyRank(null);
      setRankError('');
      setRankLoading(false);
      return;
    }
    setRankLoading(true);
    setRankError('');
    try {
      const mine = await fetchMyRank(period, getToday());
      setMyRank(mine);
    } catch {
      setRankError('Your rank is unavailable right now, but the leaderboard below is still up to date.');
      setMyRank(null);
    } finally {
      setRankLoading(false);
    }
  }, [period, isAuthenticated]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  useEffect(() => {
    loadMyRank();
  }, [loadMyRank]);

  const periodLabel = LEADERBOARD_PERIODS.find((p) => p.id === period)?.label || 'Today';

  return (
    <div>
      <div className="page-title">Leaderboard</div>
      <div className="page-subtitle">Top Daily Duel scores across all players</div>

      <div className="leaderboard-tabs mb-16">
        {LEADERBOARD_PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`leaderboard-tab ${period === p.id ? 'active' : ''}`}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isAuthenticated ? (
        <div className="card leaderboard-me-card mb-16">
          {rankLoading ? (
            <div className="leaderboard-me-empty">Checking your rank...</div>
          ) : rankError ? (
            <div className="leaderboard-me-empty">{rankError}</div>
          ) : myRank?.hasScore ? (
            <>
              <div className="leaderboard-me-rank">#{myRank.rank}</div>
              <div className="leaderboard-me-body">
                <div className="leaderboard-me-label">Your Rank</div>
                <div className="leaderboard-me-sub">
                  {myRank.score} pts • {formatChallenge(myRank.challengeId)} • {myRank.totalPlayers} player{myRank.totalPlayers === 1 ? '' : 's'}
                </div>
              </div>
            </>
          ) : (
            <div className="leaderboard-me-empty">
              {`Play the Daily Duel to enter the ${periodLabel.toLowerCase()} leaderboard.`}
            </div>
          )}
        </div>
      ) : (
        <div className="card leaderboard-me-card mb-16">
          <div className="leaderboard-me-empty">Sign in to see your rank and appear on the leaderboard.</div>
        </div>
      )}

      {listLoading && <div className="empty-state">Loading leaderboard...</div>}

      {!listLoading && listError && <div className="form-error mb-16">{listError}</div>}

      {!listLoading && !listError && entries.length === 0 && (
        <div className="empty-state">No scores yet for this period. Be the first to play today&apos;s Duel!</div>
      )}

      {!listLoading && !listError && entries.length > 0 && (
        <div className="leaderboard-list">
          {entries.map((entry) => (
            <div
              key={entry.userId}
              className={`leaderboard-row ${entry.userId === userId ? 'is-me' : ''}`}
            >
              <div className="leaderboard-rank">
                {entry.rank <= 3 ? MEDALS[entry.rank - 1] : `#${entry.rank}`}
              </div>
              <div className="leaderboard-avatar">
                {entry.avatar || entry.username.charAt(0).toUpperCase()}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-username">
                  {entry.username}
                  {entry.userId === userId && <span className="leaderboard-you-tag">You</span>}
                </div>
                <div className="leaderboard-meta">
                  {formatChallenge(entry.challengeId)}
                  {entry.duelDate ? ` • ${formatShortDate(entry.duelDate)}` : ''}
                </div>
              </div>
              <div className="leaderboard-score">{entry.score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
