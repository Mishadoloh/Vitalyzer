'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { showToast } from '@/lib/toast';

type Plan = 'free' | 'trial' | 'pro';

type Props = {
  userId: string;
  isSuspended: boolean;
  isSelf: boolean;
  plan: Plan;
};

export default function AdminUserActions({ userId, isSuspended, isSelf, plan }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function request(method: 'PATCH' | 'DELETE', body?: object) {
    const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) throw new Error(result.error || 'Не вдалося виконати дію');
    router.refresh();
  }

  async function updatePlan(nextPlan: Plan) {
    setPending('plan');
    try {
      await request('PATCH', { action: 'setPlan', plan: nextPlan });
      showToast('План користувача оновлено');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не вдалося оновити план', true);
    } finally {
      setPending(null);
    }
  }

  async function toggleSuspension() {
    setPending('access');
    try {
      await request('PATCH', { action: isSuspended ? 'restore' : 'suspend' });
      showToast(isSuspended ? 'Доступ користувача відновлено' : 'Користувача заблоковано');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не вдалося змінити доступ', true);
    } finally {
      setPending(null);
    }
  }

  async function deleteUser() {
    const confirmed = window.confirm(
      'Назавжди видалити користувача та всі його записи, фото й налаштування? Цю дію неможливо скасувати.'
    );
    if (!confirmed) return;
    setPending('delete');
    try {
      await request('DELETE');
      showToast('Користувача та його дані видалено');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Не вдалося видалити користувача', true);
    } finally {
      setPending(null);
    }
  }

  const disabled = pending !== null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`plan-${userId}`}>План користувача</label>
      <select
        id={`plan-${userId}`}
        value={plan}
        disabled={disabled}
        onChange={(event) => updatePlan(event.target.value as Plan)}
        className="h-9 min-w-24 rounded-lg border border-border bg-bg-elevated px-2 text-xs text-text outline-none focus:border-accent/50 disabled:opacity-50"
      >
        <option value="free">Free</option>
        <option value="trial">Trial</option>
        <option value="pro">Pro</option>
      </select>
      <button
        type="button"
        disabled={disabled || isSelf}
        onClick={toggleSuspension}
        title={isSelf ? 'Власний адмін-акаунт захищено' : isSuspended ? 'Відновити доступ' : 'Заблокувати доступ'}
        className={`grid h-9 w-9 place-items-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
          isSuspended
            ? 'border-accent/25 bg-accent/10 text-accent hover:bg-accent/20'
            : 'border-warn/25 bg-warn/10 text-warn hover:bg-warn/20'
        }`}
      >
        {pending === 'access'
          ? <Loader2 size={15} className="animate-spin" />
          : isSuspended ? <RotateCcw size={15} /> : <Ban size={15} />}
      </button>
      <button
        type="button"
        disabled={disabled || isSelf}
        onClick={deleteUser}
        title={isSelf ? 'Власний адмін-акаунт захищено' : 'Видалити користувача'}
        className="grid h-9 w-9 place-items-center rounded-lg border border-danger/25 bg-danger/10 text-danger transition-colors hover:bg-danger/20 disabled:cursor-not-allowed disabled:opacity-35"
      >
        {pending === 'delete' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
      </button>
    </div>
  );
}
