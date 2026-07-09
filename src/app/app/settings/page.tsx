'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { TriangleAlert } from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { Settings } from '@/lib/types';

const DEFAULTS: Settings = {
  weightKg: 70,
  goal: 'maintain',
  sleepTarget: 8,
  calTarget: 2200,
  proteinTarget: 1.8,
  workoutsTarget: 4,
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => setSettings(s))
      .catch(() => showToast('Не вдалося завантажити налаштування', true))
      .finally(() => setLoading(false));
  }, []);

  async function saveSettings() {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const updated = await res.json();
    setSettings(updated);
    showToast('Налаштування збережено');
  }

  async function saveApiKey() {
    const res = await fetch('/api/settings/api-key', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKeyInput }),
    });
    const updated = await res.json();
    setSettings(updated);
    setApiKeyInput('');
    showToast(updated.hasApiKey ? 'Ключ збережено. AI-аналіз увімкнено.' : 'Ключ порожній.');
  }

  async function clearApiKey() {
    const res = await fetch('/api/settings/api-key', { method: 'DELETE' });
    const updated = await res.json();
    setSettings(updated);
    showToast('Ключ видалено. Використовується локальний аналіз.');
  }

  async function wipeAll() {
    if (!confirm('Видалити ВСІ дані застосунку (сон, тренування, харчування, налаштування)? Дію не можна скасувати.')) return;
    await fetch('/api/wipe', { method: 'POST' });
    setSettings(DEFAULTS);
    showToast('Усі дані видалено');
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не вдалося відкрити керування підпискою');
      window.location.href = data.url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <section>
        <header className="mb-4.5">
          <h1 className="m-0 text-[22px]">Налаштування</h1>
        </header>
        <p className="text-text-muted">Завантаження...</p>
      </section>
    );
  }

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Налаштування</h1>
      </header>

      {isGuest && (
        <div className="mb-4.5 flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-[13px] text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Ви увійшли як гість — цей акаунт не привʼязаний до email і його не можна відновити при втраті сесії.
            Завантажте резервну копію нижче, якщо хочете зберегти дані.
          </span>
        </div>
      )}

      <div className="mb-4.5 rounded-2xl border border-border bg-bg-card p-5">
        <h3 className="mb-1.5 text-[15px]">Акаунт і підписка</h3>
        {isGuest ? (
          <p className="text-xs text-text-muted">
            Гостьовий акаунт не має підписки й не привʼязаний до Stripe. Для постійного акаунта вийдіть і увійдіть через Google.
          </p>
        ) : (
          <>
            <p className="text-xs text-text-muted">
              Керуйте способом оплати, дивіться рахунки або скасуйте підписку через захищений портал Stripe.
            </p>
            <button
              onClick={openBillingPortal}
              disabled={portalLoading}
              className="mr-2 mt-3 rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c] disabled:opacity-50"
            >
              {portalLoading ? 'Відкриваємо...' : 'Керування підпискою'}
            </button>
          </>
        )}
        <button onClick={() => signOut({ callbackUrl: '/' })} className="mt-3 rounded-lg border border-border px-4 py-2 text-[13.5px]">
          Вийти з акаунту
        </button>
      </div>

      <div className="mb-4.5 rounded-2xl border border-border bg-bg-card p-5">
        <h3 className="mb-1.5 text-[15px]">Особисті цілі</h3>
        <div className="my-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Вага, кг">
            <input
              type="number"
              min={20}
              max={300}
              step={0.1}
              value={settings.weightKg}
              onChange={(e) => setSettings({ ...settings, weightKg: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
          <Field label="Ціль">
            <select
              value={settings.goal}
              onChange={(e) => setSettings({ ...settings, goal: e.target.value as Settings['goal'] })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            >
              <option value="lose">Схуднення</option>
              <option value="maintain">Підтримка форми</option>
              <option value="gain">Набір маси</option>
              <option value="perform">Спортивні результати</option>
            </select>
          </Field>
          <Field label="Цільовий сон, год">
            <input
              type="number"
              min={4}
              max={12}
              step={0.5}
              value={settings.sleepTarget}
              onChange={(e) => setSettings({ ...settings, sleepTarget: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
          <Field label="Цільові калорії/день">
            <input
              type="number"
              min={800}
              max={6000}
              step={10}
              value={settings.calTarget}
              onChange={(e) => setSettings({ ...settings, calTarget: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
          <Field label="Цільовий білок, г/кг">
            <input
              type="number"
              min={0.5}
              max={4}
              step={0.1}
              value={settings.proteinTarget}
              onChange={(e) => setSettings({ ...settings, proteinTarget: parseFloat(e.target.value) || 0 })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
          <Field label="Тренувань на тиждень">
            <input
              type="number"
              min={0}
              max={14}
              step={1}
              value={settings.workoutsTarget}
              onChange={(e) => setSettings({ ...settings, workoutsTarget: parseInt(e.target.value, 10) || 0 })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
        </div>
        <button onClick={saveSettings} className="mt-2 rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c]">
          Зберегти
        </button>
      </div>

      <div className="mb-4.5 rounded-2xl border border-border bg-bg-card p-5">
        <h3 className="mb-1.5 text-[15px]">AI-аналіз (опційно)</h3>
        <p className="text-xs text-text-muted">
          Без ключа застосунок використовує вбудований аналітичний рушій (правила + тренди) на сервері. Якщо додати
          власний ключ Anthropic API, поради генеруватимуться моделлю Claude. Ключ зберігається в базі даних вашого
          застосунку і використовується лише сервером — у браузер він не потрапляє.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Поточний стан: {settings.hasApiKey ? <span className="text-accent-strong">ключ налаштовано</span> : <span>ключ не задано</span>}
        </p>
        <div className="my-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Anthropic API ключ">
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
        </div>
        <button onClick={saveApiKey} className="mr-2 mt-2 rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c]">
          Зберегти ключ
        </button>
        <button onClick={clearApiKey} className="mt-2 rounded-lg border border-danger/40 px-4 py-2 text-[13.5px] text-danger">
          Видалити ключ
        </button>
      </div>

      <div className="mb-4.5 rounded-2xl border border-border bg-bg-card p-5">
        <h3 className="mb-1.5 text-[15px]">Дані</h3>
        <p className="text-xs text-text-muted">
          Усі дані зберігаються у вашій PostgreSQL базі даних. Ви можете завантажити резервну копію або повністю очистити застосунок.
        </p>
        <a
          href="/api/backup"
          className="mr-2 mt-2 inline-block rounded-lg border border-border bg-bg-elevated px-4 py-2 text-[13.5px]"
        >
          Завантажити резервну копію (JSON)
        </a>
        <button onClick={wipeAll} className="mt-2 rounded-lg border border-danger/40 px-4 py-2 text-[13.5px] text-danger">
          Видалити всі дані
        </button>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-text-muted">
      {label}
      {children}
    </label>
  );
}
