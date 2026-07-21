'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {useLocale} from 'next-intl';
import {
  Activity,
  CheckCircle2,
  LogOut,
  Mail,
  Ruler,
  Save,
  Scale,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  UserRound,
} from 'lucide-react';
import GoogleLogo from '@/components/GoogleLogo';
import { showToast } from '@/lib/toast';
import type { Settings } from '@/lib/types';

const GOALS: Array<{ value: Settings['goal']; label: string; description: string }> = [
  { value: 'lose', label: 'Схуднення', description: 'Поступове зниження ваги' },
  { value: 'maintain', label: 'Підтримка', description: 'Зберігати поточну форму' },
  { value: 'gain', label: 'Набір маси', description: 'Рости без зайвого поспіху' },
  { value: 'perform', label: 'Результативність', description: 'Більше енергії для спорту' },
];

const ACTIVITY_LEVELS: Array<{ value: NonNullable<Settings['activityLevel']>; label: string }> = [
  { value: 'sedentary', label: 'Малорухливий день' },
  { value: 'light', label: 'Легка активність' },
  { value: 'moderate', label: 'Помірна активність' },
  { value: 'active', label: 'Активний режим' },
  { value: 'athlete', label: 'Інтенсивні тренування' },
];

export default function ProfilePage() {
  const locale = useLocale();
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);
  const isGoogle = status === 'authenticated' && !isGuest;
  const fallbackNames = {
    uk: isGuest ? 'Гостьовий профіль' : 'Користувач Metrivyn',
    en: isGuest ? 'Guest profile' : 'Metrivyn User',
    pl: isGuest ? 'Profil gościa' : 'Użytkownik Metrivyn',
    de: isGuest ? 'Gastprofil' : 'Metrivyn Nutzer'
  };
  const displayName = session?.user?.name || fallbackNames[locale as keyof typeof fallbackNames] || fallbackNames.uk;
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  useEffect(() => {
    fetch('/api/settings')
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Не вдалося завантажити профіль');
        return result as Settings;
      })
      .then(setSettings)
      .catch((error) => showToast(error instanceof Error ? error.message : String(error), true));
  }, []);

  const completeness = useMemo(() => {
    if (!settings) return 0;
    const values = [session?.user?.name, settings.age, settings.heightCm, settings.weightKg, settings.sex !== 'unknown', settings.activityLevel, settings.goal];
    return Math.round(values.filter(Boolean).length / values.length * 100);
  }, [session?.user?.name, settings]);

  async function saveProfile() {
    if (!settings) return;
    setSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося зберегти профіль');
      setSettings(result);
      showToast('Профіль збережено');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-accent">
            <UserRound size={14} /> Особистий простір
          </div>
          <h1 className="text-2xl font-bold text-text sm:text-3xl">Профіль користувача</h1>
          <p className="mt-1 text-sm text-text-muted">Дані профілю допомагають точніше розраховувати цілі харчування та активності.</p>
        </div>
        <button
          onClick={saveProfile}
          disabled={!settings || saving}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-strong px-5 py-2.5 text-sm font-semibold text-[#06281c] disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Зберігаю...' : 'Зберегти профіль'}
        </button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
        <div className="rounded-lg border border-border bg-bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-accent/30 bg-accent/10 text-xl font-bold text-accent">
              {session?.user?.image ? (
                <img src={session.user.image} alt={`Фото ${displayName}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : initials}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-text">{displayName}</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-text-muted">
                  <Mail size={12} /> {session?.user?.email || 'Без email'}
                </span>
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${isGoogle ? 'border-accent/30 bg-accent/10 text-accent' : 'border-warn/30 bg-warn/10 text-warn'}`}>
                  {isGoogle ? <GoogleLogo size={13} /> : <ShieldCheck size={12} />}
                  {isGoogle ? 'Підключено через Google' : 'Гостьовий режим'}
                </span>
              </div>
            </div>
            <div className="min-w-28">
              <div className="text-right text-2xl font-bold text-accent">{completeness}%</div>
              <div className="mt-1 text-right text-xs text-text-muted">профіль заповнено</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                <div className="h-full rounded-full bg-accent-strong transition-all" style={{ width: `${completeness}%` }} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileField icon={UserRound} label="Вік">
              <input type="number" min={10} max={100} value={settings?.age ?? ''} onChange={(event) => settings && setSettings({ ...settings, age: event.target.value ? Number(event.target.value) : null })} placeholder="Наприклад, 30" />
            </ProfileField>
            <ProfileField icon={Ruler} label="Зріст, см">
              <input type="number" min={100} max={240} value={settings?.heightCm ?? ''} onChange={(event) => settings && setSettings({ ...settings, heightCm: event.target.value ? Number(event.target.value) : null })} placeholder="Наприклад, 175" />
            </ProfileField>
            <ProfileField icon={Scale} label="Поточна вага, кг">
              <input type="number" min={20} max={300} step={0.1} value={settings?.weightKg ?? ''} onChange={(event) => settings && setSettings({ ...settings, weightKg: Number(event.target.value) })} placeholder="70" />
            </ProfileField>
            <ProfileField icon={UserRound} label="Стать">
              <select value={settings?.sex || 'unknown'} onChange={(event) => settings && setSettings({ ...settings, sex: event.target.value as Settings['sex'] })}>
                <option value="unknown">Не вказувати</option>
                <option value="female">Жіноча</option>
                <option value="male">Чоловіча</option>
              </select>
            </ProfileField>
            <ProfileField icon={Activity} label="Рівень активності" wide>
              <select value={settings?.activityLevel || 'moderate'} onChange={(event) => settings && setSettings({ ...settings, activityLevel: event.target.value as Settings['activityLevel'] })}>
                {ACTIVITY_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </ProfileField>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-bg-card p-5">
            <div className="flex items-center gap-2 font-semibold text-text"><Target size={17} className="text-accent" /> Основна мета</div>
            <div className="mt-4 space-y-2">
              {GOALS.map((goal) => (
                <button
                  key={goal.value}
                  onClick={() => settings && setSettings({ ...settings, goal: goal.value })}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${settings?.goal === goal.value ? 'border-accent/40 bg-accent/10' : 'border-border bg-bg-elevated hover:border-accent/30'}`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${settings?.goal === goal.value ? 'bg-accent text-[#06281c]' : 'bg-bg-card text-text-muted'}`}>
                    {settings?.goal === goal.value ? <CheckCircle2 size={15} /> : <Target size={14} />}
                  </span>
                  <span><span className="block text-sm font-semibold text-text">{goal.label}</span><span className="text-xs text-text-muted">{goal.description}</span></span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/app/settings" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-3 text-sm text-text-muted hover:border-accent hover:text-accent">
              <SettingsIcon size={15} /> Налаштування
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/' })} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-3 text-sm text-text-muted hover:border-danger/50 hover:text-danger">
              <LogOut size={15} /> Вийти
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ProfileField({ icon: Icon, label, wide = false, children }: { icon: typeof UserRound; label: string; wide?: boolean; children: React.ReactElement }) {
  return (
    <label className={`block ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-text-muted"><Icon size={13} /> {label}</span>
      <span className="[&_input]:h-11 [&_input]:w-full [&_input]:rounded-lg [&_input]:border [&_input]:border-border [&_input]:bg-bg-elevated [&_input]:px-3 [&_input]:text-sm [&_input]:text-text [&_input]:outline-none [&_input]:focus:border-accent [&_select]:h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-border [&_select]:bg-bg-elevated [&_select]:px-3 [&_select]:text-sm [&_select]:text-text [&_select]:outline-none [&_select]:focus:border-accent">
        {children}
      </span>
    </label>
  );
}
