import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchGoldTransactions } from '../services/economyService';

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function GoldHistory() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await fetchGoldTransactions(user.id);
        setTransactions(data);
      } catch (err) {
        setError('Could not load history.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  return (
    <div className="card">
      <div className="section-title mb-16">Gold History</div>
      
      {loading && <div className="empty-state">Loading transactions...</div>}
      {error && <div className="form-error mb-16">{error}</div>}
      
      {!loading && !error && transactions.length === 0 && (
        <div className="empty-state">No gold transactions yet. Complete quests to earn gold!</div>
      )}
      
      {!loading && !error && transactions.length > 0 && (
        <div className="tx-list">
          {transactions.map(tx => (
            <div key={tx.id} className="tx-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{tx.reason}</div>
                <div className="duel-sub" style={{ fontSize: '0.8rem' }}>{formatDateTime(tx.created_at)}</div>
              </div>
              <div style={{ fontWeight: 'bold', color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                {tx.amount > 0 ? '+' : ''}{tx.amount} 🪙
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
