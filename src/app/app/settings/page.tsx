'use client';

import { useEffect, useMemo, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import {
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  KeyRound,
  LogOut,
  Mail,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  Trash2,
  TriangleAlert,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { Settings } from '@/lib/types';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DEFAULTS: Settings = {
  weightKg: 70,
  goal: 'maintain',
  sleepTarget: 8,
  calTarget: 2200,
  proteinTarget: 1.8,
  workoutsTarget: 4,
  emailDigestEnabled: false,
  emailDigestAddress: '',
  emailDigestFrequency: 'weekly',
};

const GOAL_LABELS: Record<Settings['goal'], string> = {
  lose: 'Схуднення',
  maintain: 'Підтримка форми',
  gain: 'Набір маси',
  perform: 'Спортивний результат',
};

const EXPORTS = [
  ['sleep', 'Сон'],
  ['workouts', 'Тренування'],
  ['nutrition', 'Харчування'],
  ['weight', 'Вага'],
  ['mood', 'Настрій'],
] as const;

function applyGoalPreset(settings: Settings, goal: Settings['goal']): Settings {
  const weight = settings.weightKg || DEFAULTS.weightKg;
  const baseCalories = Math.round(weight * 32);
  const presets: Record<Settings['goal'], Partial<Settings>> = {
    lose: {
      goal,
      calTarget: Math.max(1200, Math.round(baseCalories * 0.84)),
      proteinTarget: 2,
      workoutsTarget: 4,
      sleepTarget: Math.max(7.5, settings.sleepTarget),
    },
    maintain: {
      goal,
      calTarget: baseCalories,
      proteinTarget: 1.7,
      workoutsTarget: 3,
    },
    gain: {
      goal,
      calTarget: Math.round(baseCalories * 1.12),
      proteinTarget: 1.9,
      workoutsTarget: 4,
    },
    perform: {
      goal,
      calTarget: Math.round(baseCalories * 1.08),
      proteinTarget: 1.8,
      workoutsTarget: 5,
      sleepTarget: Math.max(8, settings.sleepTarget),
    },
  };
  return { ...settings, ...presets[goal] };
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);
  const userEmail = session?.user?.email || 'Гостьовий акаунт';
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [sendingDigest, setSendingDigest] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((response) => response.json())
      .then((nextSettings) => setSettings(nextSettings))
      .catch(() => showToast('Не вдалося завантажити налаштування', true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const win = window as Window & { __vitalyzerInstallPrompt?: InstallPromptEvent; navigator?: Navigator & { standalone?: boolean } };
    const detectStandalone = () => window.matchMedia('(display-mode: standalone)').matches || Boolean(win.navigator?.standalone);
    const refreshInstallState = () => {
      setInstallPrompt(win.__vitalyzerInstallPrompt ?? null);
      setIsStandalone(detectStandalone());
    };

    refreshInstallState();
    window.addEventListener('vitalyzer:pwa-ready', refreshInstallState);
    window.addEventListener('vitalyzer:pwa-installed', refreshInstallState);
    window.matchMedia('(display-mode: standalone)').addEventListener('change', refreshInstallState);
    return () => {
      window.removeEventListener('vitalyzer:pwa-ready', refreshInstallState);
      window.removeEventListener('vitalyzer:pwa-installed', refreshInstallState);
      window.matchMedia('(display-mode: standalone)').removeEventListener('change', refreshInstallState);
    };
  }, []);

  const dailyProtein = useMemo(() => Math.round((settings.weightKg || 0) * (settings.proteinTarget || 0)), [settings.proteinTarget, settings.weightKg]);
  const weeklyWorkoutMinutes = Math.round((settings.workoutsTarget || 0) * 45);
  const targetSummary = [
    { label: 'Вага', value: `${settings.weightKg || '-'} кг` },
    { label: 'Сон', value: `${settings.sleepTarget || '-'} год` },
    { label: 'Калорії', value: `${settings.calTarget || '-'} ккал` },
    { label: 'Білок', value: `${dailyProtein || '-'} г/день` },
  ];

  async function saveSettings(nextSettings = settings) {
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(nextSettings),
      });
      const updated = await response.json();
      if (!response.ok) throw new Error(updated.error || 'Не вдалося зберегти налаштування');
      setSettings(updated);
      showToast('Налаштування збережено');
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSaving(false);
    }
  }

  async function saveApiKey() {
    const response = await fetch('/api/settings/api-key', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ apiKey: apiKeyInput }),
    });
    const updated = await response.json();
    setSettings(updated);
    setApiKeyInput('');
    showToast(updated.hasApiKey ? 'Ключ збережено. Розширений аналіз увімкнено.' : 'Ключ порожній.');
  }

  async function clearApiKey() {
    const response = await fetch('/api/settings/api-key', { method: 'DELETE' });
    const updated = await response.json();
    setSettings(updated);
    showToast('Ключ видалено. Використовується локальний аналіз.');
  }

  async function sendTestDigest() {
    const email = (settings.emailDigestAddress || session?.user?.email || '').trim();
    if (!email) {
      showToast('Вкажіть email для розсилки', true);
      return;
    }
    setSendingDigest(true);
    try {
      const response = await fetch('/api/email-digest', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося сформувати лист');
      showToast(result.message || 'Тестовий лист готовий');
      if (!settings.emailDigestAddress) setSettings({ ...settings, emailDigestAddress: email });
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSendingDigest(false);
    }
  }

  async function seedDemoData() {
    setSeedingDemo(true);
    try {
      const response = await fetch('/api/demo-data', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося додати демо-дані');
      showToast(result.message || 'Демо-дані додано');
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSeedingDemo(false);
    }
  }

  async function wipeAll() {
    if (!confirm('Почати з нуля? Буде видалено всі записи, поради та налаштування. Дію не можна скасувати.')) return;
    setWiping(true);
    try {
      const response = await fetch('/api/wipe', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося очистити дані');
      setSettings(DEFAULTS);
      showToast('Дані очищено. Починаємо з чистого дашборда.');
      window.location.href = '/app';
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
      setWiping(false);
    }
  }

  async function openBillingPortal() {
    setPortalLoading(true);
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не вдалося відкрити керування підпискою');
      window.location.href = data.url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
      setPortalLoading(false);
    }
  }

  async function installApp() {
    if (isStandalone) {
      showToast('Vitalyzer вже відкритий як встановлений застосунок.');
      return;
    }
    if (!installPrompt) {
      showToast('Якщо кнопка недоступна, відкрийте меню браузера і виберіть “Встановити застосунок” або “Додати на головний екран”.');
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') {
      showToast('Vitalyzer встановлено на пристрій.');
    } else {
      showToast('Встановлення скасовано.');
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
      <header className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px]">Налаштування</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Керуйте цілями, аналізом, даними та акаунтом з одного місця.
          </p>
        </div>
        <button
          onClick={() => saveSettings()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-[13.5px] font-semibold text-[#06281c] disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? 'Зберігаю...' : 'Зберегти все'}
        </button>
      </header>

      {isGuest && (
        <div className="mb-4.5 flex items-start gap-2.5 rounded-2xl border border-warn/30 bg-warn/10 p-4 text-[13px] text-warn">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            Ви увійшли як гість. Цей акаунт не прив'язаний до email, тому дані можуть бути втрачені після очищення сесії.
            Перед важливими змінами завантажте резервну копію.
          </span>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {targetSummary.map((item) => (
          <div key={item.label} className="rounded-2xl border border-border bg-bg-card p-4">
            <div className="text-xs text-text-muted">{item.label}</div>
            <div className="mt-1 text-xl font-bold text-text">{item.value}</div>
          </div>
        ))}
      </div>

      <SettingsSection icon={UserRound} title="Акаунт і підписка" description="Статус входу, підписка та вихід з акаунта.">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-xl border border-border bg-bg-elevated p-3">
            <div className="text-sm font-semibold text-text">{isGuest ? 'Гостьовий режим' : userEmail}</div>
            <div className="mt-1 text-xs text-text-muted">
              {isGuest ? 'Можна тестувати застосунок без Google, але краще регулярно робити backup.' : 'Ваш акаунт прив’язаний до Google та може використовувати Stripe-підписку.'}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isGuest && (
              <button
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-accent hover:text-accent disabled:opacity-60"
              >
                <CreditCard size={14} />
                {portalLoading ? 'Відкриваю...' : 'Підписка'}
              </button>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] hover:border-accent hover:text-accent"
            >
              <LogOut size={14} />
              Вийти
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={Smartphone} title="Застосунок на телефоні" description="Встановіть Vitalyzer на головний екран і відкривайте його як окремий мобільний застосунок.">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="rounded-xl border border-border bg-bg-elevated p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-text">
              <Smartphone size={15} className="text-accent" />
              {isStandalone ? 'Встановлено' : installPrompt ? 'Готово до встановлення' : 'Можна додати вручну'}
            </div>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Після встановлення застосунок відкривається без зайвих вкладок браузера, має свою іконку та offline-екран при поганому інтернеті.
            </p>
          </div>
          <button
            onClick={installApp}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-strong px-4 py-3 text-[13px] font-semibold text-[#06281c]"
          >
            <Download size={14} />
            {isStandalone ? 'Вже встановлено' : 'Встановити'}
          </button>
        </div>
      </SettingsSection>

      <SettingsSection icon={Mail} title="Email-розсилка" description="Отримуйте короткий звіт про сон, активність, харчування, вагу й настрій прямо на пошту.">
        <div className="mb-4 rounded-xl border border-border bg-bg-elevated p-3 text-xs leading-5 text-text-muted">
          <div className="mb-1 flex items-center gap-2 font-semibold text-text">
            <Mail size={14} className="text-accent" />
            {settings.emailDigestEnabled ? 'Розсилку увімкнено' : 'Розсилку вимкнено'}
          </div>
          Листи надсилаються тільки після вашого увімкнення. Для реальної відправки на сервері потрібно задати <span className="font-mono text-text">RESEND_API_KEY</span> і <span className="font-mono text-text">EMAIL_FROM</span>.
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_auto] lg:items-end">
          <Field label="Email для звітів">
            <input
              type="email"
              placeholder={session?.user?.email || 'you@example.com'}
              value={settings.emailDigestAddress || ''}
              onChange={(e) => setSettings({ ...settings, emailDigestAddress: e.target.value })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            />
          </Field>
          <Field label="Частота">
            <select
              value={settings.emailDigestFrequency || 'weekly'}
              onChange={(e) => setSettings({ ...settings, emailDigestFrequency: e.target.value === 'daily' ? 'daily' : 'weekly' })}
              className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text"
            >
              <option value="weekly">Щотижня</option>
              <option value="daily">Щодня</option>
            </select>
          </Field>
          <label className="flex min-h-[38px] items-center gap-2 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-[13px] text-text-muted">
            <input
              type="checkbox"
              checked={Boolean(settings.emailDigestEnabled)}
              onChange={(e) => setSettings({ ...settings, emailDigestEnabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-400"
            />
            Увімкнути
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() => saveSettings()}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-[13px] font-semibold text-[#06281c] disabled:opacity-60"
          >
            <Save size={14} />
            Зберегти розсилку
          </button>
          <button
            onClick={sendTestDigest}
            disabled={sendingDigest}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-[13px] hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <Send size={14} />
            {sendingDigest ? 'Готую лист...' : 'Надіслати тест'}
          </button>
          <span className="text-xs text-text-muted">
            Останній лист: {settings.emailDigestLastSentAt ? new Date(settings.emailDigestLastSentAt).toLocaleString('uk-UA') : 'ще не надсилали'}
          </span>
        </div>
      </SettingsSection>

      <SettingsSection icon={Target} title="Цілі здоров'я" description="Налаштуйте особисті цілі або застосуйте готовий пресет.">
        <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(GOAL_LABELS) as Settings['goal'][]).map((goal) => (
            <button
              key={goal}
              onClick={() => setSettings(applyGoalPreset(settings, goal))}
              className={`rounded-xl border p-3 text-left transition-colors ${
                settings.goal === goal ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-bg-elevated text-text-muted hover:border-accent/50 hover:text-text'
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                {settings.goal === goal && <CheckCircle2 size={14} />}
                {GOAL_LABELS[goal]}
              </div>
              <div className="mt-1 text-[11.5px] opacity-80">Підібрати калорії, білок і тренування</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Вага, кг">
            <input type="number" min={20} max={300} step={0.1} value={settings.weightKg} onChange={(e) => setSettings({ ...settings, weightKg: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <Field label="Цільовий сон, год">
            <input type="number" min={4} max={12} step={0.5} value={settings.sleepTarget} onChange={(e) => setSettings({ ...settings, sleepTarget: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <Field label="Калорії на день">
            <input type="number" min={800} max={6000} step={10} value={settings.calTarget} onChange={(e) => setSettings({ ...settings, calTarget: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <Field label="Білок, г/кг">
            <input type="number" min={0.5} max={4} step={0.1} value={settings.proteinTarget} onChange={(e) => setSettings({ ...settings, proteinTarget: parseFloat(e.target.value) || 0 })} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <Field label="Тренувань на тиждень">
            <input type="number" min={0} max={14} step={1} value={settings.workoutsTarget} onChange={(e) => setSettings({ ...settings, workoutsTarget: parseInt(e.target.value, 10) || 0 })} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <div className="rounded-xl border border-border bg-bg-elevated p-3 text-xs text-text-muted">
            <div className="font-semibold text-text">Розрахунок</div>
            <div className="mt-1">Білок: {dailyProtein || '-'} г/день</div>
            <div>Активність: приблизно {weeklyWorkoutMinutes} хв/тиждень</div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={ShieldCheck} title="Аналіз порад" description="Поради можуть працювати локально або через ваш приватний ключ розширеного аналізу.">
        <div className="mb-3 rounded-xl border border-border bg-bg-elevated p-3 text-xs text-text-muted">
          <div className="flex items-center gap-2 font-semibold text-text">
            <ShieldCheck size={14} className="text-accent" />
            Поточний стан: {settings.hasApiKey ? <span className="text-accent-strong">ключ налаштовано</span> : <span>локальний аналіз без ключа</span>}
          </div>
          <p className="mt-1 leading-5">
            Ключ зберігається на сервері та не показується у браузері. Якщо ключ не задано, застосунок використовує вбудовані правила і тренди.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <Field label="Ключ розширеного аналізу">
            <input type="password" placeholder="sk-ant-..." value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} className="rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-text" />
          </Field>
          <button onClick={saveApiKey} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent-strong px-4 py-2 text-[13px] font-semibold text-[#06281c]">
            <KeyRound size={14} />
            Зберегти ключ
          </button>
          <button onClick={clearApiKey} className="rounded-lg border border-danger/40 px-4 py-2 text-[13px] text-danger">
            Видалити
          </button>
        </div>
      </SettingsSection>

      <SettingsSection icon={Database} title="Дані та розділи" description="Швидке наповнення, резервні копії та експорт окремих розділів.">
        <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <button onClick={seedDemoData} disabled={seedingDemo} className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-left transition-colors hover:border-accent/60 disabled:opacity-60">
            <Sparkles size={17} className="mb-2 text-accent" />
            <div className="text-sm font-semibold text-text">{seedingDemo ? 'Додаю демо...' : 'Заповнити демо-даними'}</div>
            <div className="mt-1 text-xs text-text-muted">Створює 14 днів прикладів для графіків.</div>
          </button>
          <a href="/api/backup" className="rounded-xl border border-border bg-bg-elevated p-3 transition-colors hover:border-accent/50">
            <Download size={17} className="mb-2 text-info" />
            <div className="text-sm font-semibold text-text">Резервна копія JSON</div>
            <div className="mt-1 text-xs text-text-muted">Повний backup усіх ваших даних.</div>
          </a>
          <button onClick={() => setSettings(DEFAULTS)} className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-accent/50">
            <RotateCcw size={17} className="mb-2 text-warn" />
            <div className="text-sm font-semibold text-text">Скинути форму</div>
            <div className="mt-1 text-xs text-text-muted">Повертає цілі до стандартних значень.</div>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {EXPORTS.map(([type, label]) => (
            <a key={type} href={`/api/export/${type}`} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent">
              <Download size={13} />
              {label}
            </a>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection icon={TriangleAlert} title="Небезпечна зона" description="Дії, які змінюють або видаляють багато даних.">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/30 bg-danger/10 p-4">
          <div>
            <div className="text-sm font-semibold text-text">Почати з нуля</div>
            <p className="mt-1 text-xs leading-5 text-text-muted">
              Видаляє всі записи, поради й налаштування. Перед цим краще завантажити резервну копію.
            </p>
          </div>
          <button onClick={wipeAll} disabled={wiping} className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-4 py-2 text-[13px] text-danger disabled:opacity-60">
            <Trash2 size={14} />
            {wiping ? 'Очищення...' : 'Почати з нуля'}
          </button>
        </div>
      </SettingsSection>
    </section>
  );
}

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-4.5 rounded-2xl border border-border bg-bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={17} />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
        </div>
      </div>
      {children}
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
