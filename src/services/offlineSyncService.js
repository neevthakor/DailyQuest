const QUEUE_KEY = 'dailyquest_offline_sync_queue_v4';
const SYNC_META_KEY = 'dailyquest_offline_sync_meta_v4';

export function loadSyncQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSyncQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore
  }
  return queue;
}

/**
 * Enqueues an action with a unique idempotency key so duplicate actions are never queued twice.
 */
export function enqueueOfflineAction(type, payload, idempotencyKey = null) {
  const queue = loadSyncQueue();
  const key = idempotencyKey || `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const existingIdx = queue.findIndex((item) => item.idempotencyKey === key);
  const entry = {
    id: `q_${Date.now()}`,
    idempotencyKey: key,
    type,
    payload,
    attempts: 0,
    nextRetryAt: 0,
    status: 'pending',
    queuedAt: new Date().toISOString(),
  };

  if (existingIdx !== -1) {
    queue[existingIdx] = { ...queue[existingIdx], payload, updatedAt: new Date().toISOString() };
  } else {
    queue.push(entry);
  }

  saveSyncQueue(queue.slice(-150));
  return queue.length;
}

export function computeBackoffMs(attempts) {
  const safe = Math.max(0, Number(attempts) || 0);
  return Math.min(60000, Math.pow(2, safe) * 1000);
}

export async function processSyncQueue(customClient = null) {
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const queue = loadSyncQueue();
  if (!online || queue.length === 0) {
    return { synced: 0, pending: queue.length, failed: queue.filter((q) => q.status === 'failed').length };
  }

  let client = customClient;
  if (!client) {
    try {
      const mod = await import('../lib/supabase.js');
      client = mod.supabase;
    } catch {
      client = null;
    }
  }
  if (!client) {
    return { synced: 0, pending: queue.length, failed: queue.filter((q) => q.status === 'failed').length };
  }

  const now = Date.now();
  const remaining = [];
  let synced = 0;

  for (const item of queue) {
    if (item.nextRetryAt && item.nextRetryAt > now) {
      remaining.push(item);
      continue;
    }

    try {
      if (item.type === 'verified_reward') {
        await client.rpc('claim_verified_reward', {
          p_event_type: item.payload.eventType,
          p_reference_id: item.idempotencyKey,
          p_metadata: item.payload.metadata || {},
        });
      }
      synced += 1;
    } catch (err) {
      const attempts = (item.attempts || 0) + 1;
      remaining.push({
        ...item,
        attempts,
        status: attempts >= 5 ? 'failed' : 'pending',
        lastError: err?.message || 'Network error',
        nextRetryAt: now + computeBackoffMs(attempts),
      });
    }
  }

  saveSyncQueue(remaining);
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify({ lastSyncedAt: new Date().toISOString() }));
  } catch {
    // ignore
  }

  return {
    synced,
    pending: remaining.length,
    failed: remaining.filter((q) => q.status === 'failed').length,
  };
}

export function clearSyncQueue() {
  try {
    localStorage.removeItem(QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function getSyncStatus() {
  const queue = loadSyncQueue();
  const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const failedCount = queue.filter((q) => q.status === 'failed').length;
  let state = 'Online';
  if (!online) state = 'Offline';
  else if (failedCount > 0) state = 'Sync Retry Needed';
  else if (queue.length > 0) state = 'Pending Sync';

  return {
    online,
    state,
    pendingCount: queue.length,
    failedCount,
  };
}
