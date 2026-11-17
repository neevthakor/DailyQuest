const QUEUE_KEY = 'dailyquest_offline_sync_queue_v3';

export function loadSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function enqueueOfflineAction(type, payload) {
  const q = loadSyncQueue();
  q.push({ id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, type, payload, queuedAt: new Date().toISOString() });
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-100)));
  } catch {
    // ignore
  }
  return q.length;
}

export function clearSyncQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function getSyncStatus() {
  return {
    online: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingCount: loadSyncQueue().length,
  };
}
