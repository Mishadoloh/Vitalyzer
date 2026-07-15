'use client';

import { useEffect } from 'react';

type ReminderKey = 'sleep' | 'weight' | 'evening';

interface ReminderSettings {
  enabled: boolean;
  sleep: boolean;
  weight: boolean;
  evening: boolean;
  sleepTime: string;
  weightTime: string;
  eveningTime: string;
}

const REMINDER_STORAGE_KEY = 'vitalyzer-reminders-v1';

const DEFAULT_REMINDERS: ReminderSettings = {
  enabled: false,
  sleep: true,
  weight: true,
  evening: true,
  sleepTime: '21:30',
  weightTime: '08:00',
  eveningTime: '20:30',
};

const REMINDER_COPY: Record<ReminderKey, { title: string; body: string; url: string; timeKey: keyof ReminderSettings }> = {
  sleep: {
    title: 'Додайте сон',
    body: 'Запишіть години сну, щоб порада на завтра була точнішою.',
    url: '/app/quick-add',
    timeKey: 'sleepTime',
  },
  weight: {
    title: 'Запишіть вагу',
    body: 'Один ранковий запис допоможе бачити тренд без зайвого шуму.',
    url: '/app/quick-add',
    timeKey: 'weightTime',
  },
  evening: {
    title: 'Час вечірнього підсумку',
    body: 'Додайте настрій, харчування або тренування за день.',
    url: '/app',
    timeKey: 'eveningTime',
  },
};

function readReminderSettings(): ReminderSettings {
  try {
    const raw = window.localStorage.getItem(REMINDER_STORAGE_KEY);
    return raw ? { ...DEFAULT_REMINDERS, ...JSON.parse(raw) } : DEFAULT_REMINDERS;
  } catch {
    return DEFAULT_REMINDERS;
  }
}

function msUntilNext(time: string): number {
  const [hours = '9', minutes = '0'] = time.split(':');
  const now = new Date();
  const next = new Date(now);
  next.setHours(Number(hours), Number(minutes), 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

async function showReminder(key: ReminderKey, copy: (typeof REMINDER_COPY)[ReminderKey]) {
  const options: NotificationOptions = {
    body: copy.body,
    tag: `vitalyzer-${key}`,
    icon: '/icon.svg',
    badge: '/icon.svg',
    data: { url: copy.url },
  };

  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(copy.title, options);
    return;
  }

  new Notification(copy.title, options);
}

export default function ReminderScheduler() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    let timers: number[] = [];
    let cancelled = false;

    const clearTimers = () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      timers = [];
    };

    const schedule = () => {
      clearTimers();
      const settings = readReminderSettings();
      if (!settings.enabled || Notification.permission !== 'granted') return;

      (Object.keys(REMINDER_COPY) as ReminderKey[]).forEach((key) => {
        if (!settings[key]) return;
        const copy = REMINDER_COPY[key];
        const time = String(settings[copy.timeKey] || DEFAULT_REMINDERS[copy.timeKey]);
        const timer = window.setTimeout(async () => {
          if (cancelled) return;
          try {
            await showReminder(key, copy);
          } finally {
            schedule();
          }
        }, msUntilNext(time));
        timers.push(timer);
      });
    };

    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === REMINDER_STORAGE_KEY) schedule();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('vitalyzer:reminders-updated', schedule);
    schedule();

    return () => {
      cancelled = true;
      clearTimers();
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('vitalyzer:reminders-updated', schedule);
    };
  }, []);

  return null;
}
