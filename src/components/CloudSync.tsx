'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { showToast } from '@/lib/toast';

const HABITS_KEY = 'vitalyzer-habits-v1';
const TRANSFER_KEY = 'vitalyzer-guest-transfer-v1';
const OWNER_KEY = 'vitalyzer-local-owner-v1';
const PHOTO_OWNER_KEY = 'vitalyzer-progress-photos-owner-v1';
const PHOTO_TRANSFER_FROM_KEY = 'vitalyzer-progress-photos-transfer-from-v1';
const PHOTO_IGNORE_LEGACY_KEY = 'vitalyzer-progress-photos-ignore-legacy-v1';

function readHabits(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem(HABITS_KEY) || '{}') as Record<string, string[]>;
  } catch {
    return {};
  }
}

function mergeHabits(a: Record<string, string[]>, b: Record<string, string[]>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return Object.fromEntries(Array.from(keys).map((key) => [key, Array.from(new Set([...(a[key] || []), ...(b[key] || [])])).sort()]));
}

async function syncHabits() {
  const response = await fetch('/api/sync/state', { cache: 'no-store' });
  if (!response.ok) return;
  const cloud = await response.json() as { habits?: Record<string, string[]> };
  const merged = mergeHabits(readHabits(), cloud.habits || {});
  localStorage.setItem(HABITS_KEY, JSON.stringify(merged));
  await fetch('/api/sync/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habits: merged }),
  });
  window.dispatchEvent(new CustomEvent('vitalyzer:habits-synced', { detail: merged }));
}

async function pushHabits() {
  await fetch('/api/sync/state', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ habits: readHabits() }),
  });
}

export default function CloudSync() {
  const { data: session, status } = useSession();
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (status !== 'authenticated' || !userId) return;
    const currentUserId = userId;
    let cancelled = false;

    async function run() {
      try {
        if (isGuest) {
          const previousOwner = localStorage.getItem(OWNER_KEY);
          if (previousOwner && previousOwner !== currentUserId) {
            localStorage.setItem(HABITS_KEY, '{}');
            localStorage.setItem(PHOTO_IGNORE_LEGACY_KEY, 'true');
          }
          localStorage.setItem(OWNER_KEY, currentUserId);
          localStorage.setItem(PHOTO_OWNER_KEY, currentUserId);
          const response = await fetch('/api/sync/guest-token', { method: 'POST' });
          if (response.ok) {
            const data = await response.json() as { token: string };
            localStorage.setItem(TRANSFER_KEY, data.token);
          }
        } else {
          const token = localStorage.getItem(TRANSFER_KEY);
          const previousOwner = localStorage.getItem(OWNER_KEY);
          if (token) {
            const response = await fetch('/api/sync/claim', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            if (!response.ok) throw new Error('Guest transfer failed');
            if (response.ok) {
              const result = await response.json() as { transferred?: boolean };
              localStorage.removeItem(TRANSFER_KEY);
              if (previousOwner && previousOwner !== currentUserId) {
                localStorage.setItem(PHOTO_TRANSFER_FROM_KEY, previousOwner);
                localStorage.removeItem(PHOTO_IGNORE_LEGACY_KEY);
              }
              if (!cancelled && result.transferred) showToast('Гостьові дані безпечно перенесено до вашого акаунта');
            }
          }
          if (!token && previousOwner && previousOwner !== currentUserId) {
            localStorage.setItem(PHOTO_IGNORE_LEGACY_KEY, 'true');
            const response = await fetch('/api/sync/state', { cache: 'no-store' });
            if (response.ok) {
              const cloud = await response.json() as { habits?: Record<string, string[]> };
              localStorage.setItem(HABITS_KEY, JSON.stringify(cloud.habits || {}));
            }
          }
          localStorage.setItem(OWNER_KEY, currentUserId);
          localStorage.setItem(PHOTO_OWNER_KEY, currentUserId);
        }
        await syncHabits();
      } catch {
        // Sync retries on the next page load; local data remains untouched.
      }
    }

    run();
    const onLocalChange = () => pushHabits().catch(() => undefined);
    window.addEventListener('vitalyzer:habits-changed', onLocalChange);
    return () => {
      cancelled = true;
      window.removeEventListener('vitalyzer:habits-changed', onLocalChange);
    };
  }, [isGuest, status, userId]);

  return null;
}
