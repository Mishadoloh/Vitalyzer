'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  CheckCircle2,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Route,
  Trophy,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { Settings as UserSettings } from '@/lib/types';

type HabitId = 'water' | 'steps' | 'protein' | 'sleepEarly' | 'stretch' | 'walk';

interface SleepRow {
  date: string;
  hours: number;
  bedtime?: string | null;
}

interface NutritionRow {
  date: string;
  proteinG: number;
  waterMl?: number | null;
}

interface HabitDefinition {
  id: HabitId;
  title: string;
  description: string;
  target: string;
  icon: LucideIcon;
  accent: 'accent' | 'info' | 'warn';
}

type HabitStorage = Record<HabitId, string[]>;

const STORAGE_KEY = 'vitalyzer-habits-v1';

const HABITS: HabitDefinition[] = [
  {
    id: 'water',
    title: 'Вода',
    description: 'Закрийте базову гідратацію за день.',
    target: '2 л',
    icon: Droplets,
    accent: 'info',
  },
  {
    id: 'steps',
    title: 'Кроки',
    description: 'Рух без тренування теж рахується.',
    target: '8 000',
    icon: Footprints,
    accent: 'accent',
  },
  {
    id: 'protein',
    title: 'Білок',
    description: 'Тримає ситість і відновлення.',
    target: 'ціль дня',
    icon: Utensils,
    accent: 'warn',
  },
  {
    id: 'sleepEarly',
    title: 'Сон до 23:30',
    description: 'Стабільний відбій сильніше за ідеальний графік.',
    target: '23:30',
    icon: Moon,
    accent: 'accent',
  },
  {
    id: 'stretch',
    title: 'Розтяжка',
    description: 'Коротка мобільність для спини й ніг.',
    target: '7 хв',
    icon: Dumbbell,
    accent: 'info',
  },
  {
    id: 'walk',
    title: 'Прогулянка',
    description: 'Спокійний вихід на повітря.',
    target: '20 хв',
    icon: Route,
    accent: 'accent',
  },
];

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function emptyStorage(): HabitStorage {
  return HABITS.reduce((acc, habit) => ({ ...acc, [habit.id]: [] }), {} as HabitStorage);
}

function uniqueDates(dates: string[]): string[] {
  return Array.from(new Set(dates)).sort();
}

function getAccentClasses(accent: HabitDefinition['accent']) {
  if (accent === 'info') return 'border-info/25 bg-info/10 text-info';
  if (accent === 'warn') return 'border-warn/25 bg-warn/10 text-warn';
  return 'border-accent/25 bg-accent/10 text-accent';
}

function streak(dates: string[]): number {
  const set = new Set(dates);
  let cursor = set.has(todayISO()) ? todayISO() : addDays(todayISO(), -1);
  let count = 0;
  while (set.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function lastNDays(days: number) {
  return Array.from({ length: days }, (_, index) => addDays(todayISO(), index - days + 1));
}

function isEarlyBedtime(value?: string | null) {
  if (!value) return false;
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false;
  return hours < 23 || (hours === 23 && minutes <= 30);
}

export default function HabitsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [storage, setStorage] = useState<HabitStorage>(emptyStorage);
  const [loading, setLoading] = useState(true);
  const today = todayISO();

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setStorage({ ...emptyStorage(), ...JSON.parse(raw) });
    } catch {
      setStorage(emptyStorage());
    }

    async function load() {
      try {
        const [settingsRes, sleepRes, nutritionRes] = await Promise.all([
          fetch('/api/settings').then((response) => response.json()),
          fetch('/api/sleep').then((response) => response.json()),
          fetch('/api/nutrition').then((response) => response.json()),
        ]);
        setSettings(settingsRes);
        setSleep(sleepRes);
        setNutrition(nutritionRes);
      } catch (e) {
        showToast('Не вдалося завантажити підказки звичок: ' + (e instanceof Error ? e.message : String(e)), true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const autoDone = useMemo(() => {
    const todayNutrition = nutrition.find((entry) => entry.date === today);
    const todaySleep = sleep.find((entry) => entry.date === today);
    const proteinTarget = settings ? Math.round(settings.weightKg * settings.proteinTarget) : 120;
    return {
      water: Boolean((todayNutrition?.waterMl || 0) >= 2000),
      protein: Boolean((todayNutrition?.proteinG || 0) >= proteinTarget),
      sleepEarly: isEarlyBedtime(todaySleep?.bedtime),
    };
  }, [nutrition, settings, sleep, today]);

  const hydratedStorage = useMemo(() => {
    const next = { ...storage };
    (Object.entries(autoDone) as [HabitId, boolean][]).forEach(([id, done]) => {
      if (done) next[id] = uniqueDates([...(next[id] || []), today]);
    });
    return next;
  }, [autoDone, storage, today]);

  const stats = useMemo(() => {
    const completedToday = HABITS.filter((habit) => hydratedStorage[habit.id]?.includes(today)).length;
    const totalCompletions = HABITS.reduce((sum, habit) => sum + (hydratedStorage[habit.id]?.length || 0), 0);
    const bestStreak = Math.max(...HABITS.map((habit) => streak(hydratedStorage[habit.id] || [])));
    const weekDays = lastNDays(7);
    const weekScore = weekDays.reduce((sum, date) => {
      const dayDone = HABITS.filter((habit) => hydratedStorage[habit.id]?.includes(date)).length;
      return sum + dayDone;
    }, 0);
    return {
      completedToday,
      totalCompletions,
      bestStreak,
      weekPercent: Math.round((weekScore / (HABITS.length * 7)) * 100),
    };
  }, [hydratedStorage, today]);

  function save(next: HabitStorage) {
    setStorage(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function toggleHabit(id: HabitId) {
    const current = hydratedStorage[id] || [];
    const done = current.includes(today);
    const next = {
      ...hydratedStorage,
      [id]: done ? current.filter((date) => date !== today) : uniqueDates([...current, today]),
    };
    save(next);
    showToast(done ? 'Звичку знято на сьогодні' : 'Звичку закрито на сьогодні');
  }

  function resetToday() {
    const next = HABITS.reduce(
      (acc, habit) => ({ ...acc, [habit.id]: (hydratedStorage[habit.id] || []).filter((date) => date !== today) }),
      {} as HabitStorage
    );
    save(next);
    showToast('Сьогоднішні ручні чекіни скинуто');
  }

  if (loading) {
    return (
      <section>
        <h1 className="text-[22px] text-text">Звички</h1>
        <p className="text-text-muted">Завантаження...</p>
      </section>
    );
  }

  return (
    <section className="pb-8">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(12,24,26,0.98))] p-5 shadow-xl shadow-black/20">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
          <Flame size={13} />
          streak-и й щоденні ритуали
        </span>
        <h1 className="m-0 text-2xl font-bold text-text">Звички</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Вода, кроки, білок, ранній сон, розтяжка і прогулянка. Закривайте день маленькими діями, а не тільки великими графіками.
        </p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CheckCircle2} label="Сьогодні" value={`${stats.completedToday}/${HABITS.length}`} />
        <StatCard icon={Flame} label="Найкращий streak" value={`${stats.bestStreak} дн.`} />
        <StatCard icon={CalendarDays} label="Тиждень" value={`${stats.weekPercent}%`} />
        <StatCard icon={Trophy} label="Усього чекінів" value={String(stats.totalCompletions)} />
      </div>

      <section className="mb-4 rounded-3xl border border-border bg-bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Сьогоднішні звички</h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">Натисніть картку, щоб закрити або зняти звичку за сьогодні.</p>
          </div>
          <button onClick={resetToday} className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent">
            Скинути сьогодні
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {HABITS.map((habit) => {
            const Icon = habit.icon;
            const dates = hydratedStorage[habit.id] || [];
            const done = dates.includes(today);
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  done ? 'border-accent/50 bg-accent/10 shadow-lg shadow-black/10' : 'border-border bg-bg-elevated hover:border-accent/40'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${getAccentClasses(habit.accent)}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${done ? 'bg-accent-strong text-[#06281c]' : 'bg-bg-card text-text-muted'}`}>
                    {done ? 'закрито' : 'відкрити'}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-text">{habit.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-text-muted">{habit.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-text-muted">ціль</div>
                    <div className="font-semibold text-text">{habit.target}</div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-text-muted">
                  <span>Streak</span>
                  <span className="font-semibold text-accent">{streak(dates)} дн.</span>
                </div>
                <WeekDots dates={dates} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-bg-card p-4">
          <h2 className="text-[15px] font-semibold text-text">Підказки з даних</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <HintCard title="Вода" done={autoDone.water} text={autoDone.water ? 'Сьогодні вода вже закрита з харчування.' : 'Додайте воду в швидкому записі або закрийте вручну.'} />
            <HintCard title="Білок" done={autoDone.protein} text={autoDone.protein ? 'Білкова ціль на сьогодні закрита.' : 'Перевірте білок у харчуванні за день.'} />
            <HintCard title="Сон" done={autoDone.sleepEarly} text={autoDone.sleepEarly ? 'Відбій до 23:30 зафіксовано.' : 'Коли додасте сон з відбоєм, звичка закриється сама.'} />
          </div>
        </div>

        <aside className="rounded-3xl border border-border bg-bg-card p-4">
          <h2 className="text-[15px] font-semibold text-text">Швидка дія</h2>
          <p className="mt-2 text-xs leading-5 text-text-muted">
            Якщо треба додати воду, білок або сон, відкрийте швидкий запис. Ручні звички залишаються приватно в цьому браузері.
          </p>
          <Link href="/app/quick-add" className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent-strong px-4 py-3 text-sm font-semibold text-[#06281c]">
            <CheckCircle2 size={15} />
            Додати запис
          </Link>
        </aside>
      </section>
    </section>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4">
      <Icon size={16} className="text-accent" />
      <div className="mt-3 text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-text">{value}</div>
    </div>
  );
}

function WeekDots({ dates }: { dates: string[] }) {
  return (
    <div className="mt-3 grid grid-cols-7 gap-1">
      {lastNDays(7).map((date) => {
        const done = dates.includes(date);
        return (
          <span
            key={date}
            title={new Date(`${date}T12:00:00`).toLocaleDateString('uk-UA')}
            className={`h-2 rounded-full ${done ? 'bg-accent-strong' : 'bg-bg-card'}`}
          />
        );
      })}
    </div>
  );
}

function HintCard({ title, text, done }: { title: string; text: string; done: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${done ? 'border-accent/30 bg-accent/10' : 'border-border bg-bg-elevated'}`}>
      <div className="flex items-center gap-2 text-sm font-semibold text-text">
        <CheckCircle2 size={14} className={done ? 'text-accent' : 'text-text-muted'} />
        {title}
      </div>
      <p className="mt-1 text-xs leading-5 text-text-muted">{text}</p>
    </div>
  );
}
