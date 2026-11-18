const NOTIF_KEY = 'dailyquest_notifications_v4';

const DEFAULT_PREFS = {
  questReminders: true,
  habitReminders: true,
  goalDeadlines: true,
  weeklySummary: true,
  preferredHour: 9,
  permissionStatus: typeof Notification !== 'undefined' ? Notification.permission : 'default',
};

export function loadNotificationPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveNotificationPrefs(prefs) {
  const next = { ...loadNotificationPrefs(), ...prefs };
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') {
    return 'unsupported';
  }
  const result = await Notification.requestPermission();
  saveNotificationPrefs({ permissionStatus: result });
  return result;
}

export function sendGentleReminder(title, body) {
  const prefs = loadNotificationPrefs();
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  if (!prefs.questReminders && !prefs.habitReminders) return false;
  try {
    new Notification(title, { body, icon: '/vite.svg' });
    return true;
  } catch {
    return false;
  }
}
