'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Activity,
  BarChart3,
  CalendarClock,
  Database,
  Download,
  Flame,
  Moon,
  PlusCircle,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import InsightsCard from '@/components/InsightsCard';
import { showToast } from '@/lib/toast';
import type { AdviceResult, Settings } from '@/lib/types';

const SleepChart = dynamic(() => import('@/components/charts/SleepChart'), { ssr: false, loading: () => <ChartLoading /> });
const WorkoutChart = dynamic(() => import('@/components/charts/WorkoutChart'), { ssr: false, loading: () => <ChartLoading /> });
const NutritionChart = dynamic(() => import('@/components/charts/NutritionChart'), { ssr: false, loading: () => <ChartLoading /> });
const BalanceChart = dynamic(() => import('@/components/charts/BalanceChart'), { ssr: false, loading: () => <ChartLoading /> });
const WeightChart = dynamic(() => import('@/components/charts/WeightChart'), { ssr: false, loading: () => <ChartLoading /> });
const MoodChart = dynamic(() => import('@/components/charts/MoodChart'), { ssr: false, loading: () => <ChartLoading /> });

type RangeDays = 14 | 30 | 90;
type ActionTone = 'accent' | 'info' | 'warn' | 'danger';

interface SleepRow {
  date: string;
  hours: number;
}
interface WorkoutRow {
  date: string;
  durationMin: number;
}
interface NutritionRow {
  date: string;
  calories: number;
  proteinG: number;
}
interface WeightRow {
  date: string;
  weightKg: number;
}
interface MoodRow {
  date: string;
  mood: number;
  energy: number;
}

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function currentStreak(dates: Set<string>): number {
  const today = todayISO();
  let cursor = dates.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (dates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function longestStreak(dates: Set<string>): number {
  const sorted = Array.from(dates).sort();
  let best = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous && addDays(previous, 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  return best;
}

function inLastDays(date: string, days: number): boolean {
  return date >= addDays(todayISO(), -(days - 1));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null, digits = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatNumber(value: number | null, suffix = ''): string {
  if (value === null) return '-';
  return `${value}${suffix}`;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function DeltaBadge({ value, unit, invertGood }: { value: number | null; unit: string; invertGood?: boolean }) {
  if (value === null || Math.abs(value) < 0.05) return <span className="text-text-muted">без змін</span>;
  const positive = value > 0;
  const good = invertGood ? !positive : positive;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${good ? 'text-accent-strong' : 'text-danger'}`}>
      <Icon size={14} />
      {positive ? '+' : '-'}
      {Math.abs(Math.round(value * 10) / 10)}
      {unit ? ` ${unit}` : ''}
    </span>
  );
}

function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 transition-colors hover:border-accent/30">
      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${iconColor}1a`, color: iconColor }}>
        <Icon size={16} />
      </div>
      <div className="text-xs text-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold text-text">{value}</div>
      <div className="text-xs text-text-muted">{hint}</div>
    </div>
  );
}

function ChartPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[285px] overflow-hidden rounded-2xl border border-border bg-bg-card p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-text-muted">{title}</h3>
        {empty && (
          <Link href="/app/quick-add" className="inline-flex items-center gap-1 text-xs text-accent underline">
            <PlusCircle size={13} />
            додати
          </Link>
        )}
      </div>
      <div className={empty ? 'opacity-20' : ''}>{children}</div>
      {empty && (
        <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-bg-elevated/95 p-3 text-[13px] text-text-muted shadow-xl shadow-black/25">
          Поки немає даних для цього графіка. Додайте запис або заповніть демо-даними.
        </div>
      )}
    </div>
  );
}

function ChartLoading() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-border bg-bg-elevated/60">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-bg-card">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent/60" />
      </div>
    </div>
  );
}

function GoalProgress({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-text">{label}</span>
        <span className="text-text-muted">{Math.round(value)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
        <div className="h-full rounded-full bg-accent-strong transition-all" style={{ width: `${clamp(value)}%` }} />
      </div>
      <div className="mt-1 text-[11.5px] text-text-muted">{hint}</div>
    </div>
  );
}

function ActionItem({ tone, title, text }: { tone: ActionTone; title: string; text: string }) {
  const toneClass =
    tone === 'danger'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : tone === 'warn'
        ? 'border-warn/30 bg-warn/10 text-warn'
        : tone === 'info'
          ? 'border-info/30 bg-info/10 text-info'
          : 'border-accent/30 bg-accent/10 text-accent';

  return (
    <div className="rounded-xl border border-border bg-bg-elevated/60 p-3">
      <div className={`mb-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneClass}`}>наступний крок</div>
      <div className="text-sm font-semibold text-text">{title}</div>
      <p className="mt-1 text-xs leading-5 text-text-muted">{text}</p>
    </div>
  );
}

export default function TrendsPage() {
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [rangeDays, setRangeDays] = useState<RangeDays>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);

  useEffect(() => {
    load(false);
  }, []);

  async function load(force: boolean) {
    if (force) setRefreshing(true);
    else setLoading(true);
    try {
      const [adviceRes, settingsRes, sleepRes, workoutsRes, nutritionRes, weightRes, moodRes] = await Promise.all([
        fetch(`/api/advice${force ? '?force=true' : ''}`).then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/sleep').then((r) => r.json()),
        fetch('/api/workouts').then((r) => r.json()),
        fetch('/api/nutrition').then((r) => r.json()),
        fetch('/api/weight').then((r) => r.json()),
        fetch('/api/mood').then((r) => r.json()),
      ]);
      if (adviceRes.warning) showToast(adviceRes.warning, true);
      setAdvice(adviceRes);
      setSettings(settingsRes);
      setSleep(sleepRes);
      setWorkouts(workoutsRes);
      setNutrition(nutritionRes);
      setWeight(weightRes);
      setMood(moodRes);
    } catch (e) {
      showToast('Не вдалося завантажити тренди: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function seedDemoData() {
    setSeedingDemo(true);
    try {
      const res = await fetch('/api/demo-data', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Не вдалося додати демо-дані');
      showToast(result.message || 'Демо-дані додано');
      await load(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSeedingDemo(false);
    }
  }

  const metrics = useMemo(() => {
    const currentSleep = sleep.filter((entry) => inLastDays(entry.date, rangeDays));
    const previousSleep = sleep.filter((entry) => entry.date < addDays(todayISO(), -(rangeDays - 1)) && entry.date >= addDays(todayISO(), -(rangeDays * 2 - 1)));
    const currentWorkouts = workouts.filter((entry) => inLastDays(entry.date, rangeDays));
    const previousWorkouts = workouts.filter((entry) => entry.date < addDays(todayISO(), -(rangeDays - 1)) && entry.date >= addDays(todayISO(), -(rangeDays * 2 - 1)));
    const currentNutrition = nutrition.filter((entry) => inLastDays(entry.date, rangeDays));
    const previousNutrition = nutrition.filter((entry) => entry.date < addDays(todayISO(), -(rangeDays - 1)) && entry.date >= addDays(todayISO(), -(rangeDays * 2 - 1)));
    const currentMood = mood.filter((entry) => inLastDays(entry.date, rangeDays));
    const previousMood = mood.filter((entry) => entry.date < addDays(todayISO(), -(rangeDays - 1)) && entry.date >= addDays(todayISO(), -(rangeDays * 2 - 1)));
    const currentWeight = weight.filter((entry) => inLastDays(entry.date, rangeDays)).sort((a, b) => a.date.localeCompare(b.date));

    const avgSleep = round(average(currentSleep.map((entry) => entry.hours)));
    const prevAvgSleep = round(average(previousSleep.map((entry) => entry.hours)));
    const avgCalories = round(average(currentNutrition.map((entry) => entry.calories)), 0);
    const prevAvgCalories = round(average(previousNutrition.map((entry) => entry.calories)), 0);
    const avgProtein = round(average(currentNutrition.map((entry) => entry.proteinG)), 0);
    const avgMood = round(average(currentMood.map((entry) => entry.mood)));
    const prevAvgMood = round(average(previousMood.map((entry) => entry.mood)));
    const workoutMinutes = currentWorkouts.reduce((sum, entry) => sum + (entry.durationMin || 0), 0);
    const prevWorkoutMinutes = previousWorkouts.reduce((sum, entry) => sum + (entry.durationMin || 0), 0);
    const firstWeight = currentWeight[0]?.weightKg ?? null;
    const latestWeight = currentWeight[currentWeight.length - 1]?.weightKg ?? null;
    const loggedDays = new Set([
      ...currentSleep.map((entry) => entry.date),
      ...currentWorkouts.map((entry) => entry.date),
      ...currentNutrition.map((entry) => entry.date),
      ...currentMood.map((entry) => entry.date),
    ]).size;

    return {
      avgSleep,
      sleepDelta: avgSleep !== null && prevAvgSleep !== null ? round(avgSleep - prevAvgSleep) : null,
      workoutCount: currentWorkouts.length,
      workoutDelta: currentWorkouts.length - previousWorkouts.length,
      workoutMinutes,
      workoutMinutesDelta: workoutMinutes - prevWorkoutMinutes,
      avgCalories,
      avgProtein,
      caloriesDelta: avgCalories !== null && prevAvgCalories !== null ? round(avgCalories - prevAvgCalories, 0) : null,
      avgMood,
      moodDelta: avgMood !== null && prevAvgMood !== null ? round(avgMood - prevAvgMood) : null,
      latestWeight: round(latestWeight),
      weightDelta: latestWeight !== null && firstWeight !== null ? round(latestWeight - firstWeight) : null,
      loggedDays,
      coveragePct: Math.round((loggedDays / rangeDays) * 100),
    };
  }, [mood, nutrition, rangeDays, sleep, weight, workouts]);

  if (loading || !settings) {
    return (
      <section>
        <header className="mb-4.5">
          <h1 className="m-0 text-[22px]">Тренди</h1>
        </header>
        <p className="text-text-muted">Завантаження...</p>
      </section>
    );
  }

  const sleepGoalDates = new Set(sleep.filter((entry) => entry.hours >= settings.sleepTarget - 0.5).map((entry) => entry.date));
  const trackingDates = new Set([...sleep.map((entry) => entry.date), ...workouts.map((entry) => entry.date), ...nutrition.map((entry) => entry.date), ...mood.map((entry) => entry.date)]);
  const workoutDates = new Set(workouts.map((entry) => entry.date));
  const sleepProgress = metrics.avgSleep === null ? 0 : clamp(100 - Math.abs(metrics.avgSleep - settings.sleepTarget) * 18);
  const workoutTarget = Math.max(1, settings.workoutsTarget * (rangeDays / 7));
  const workoutProgress = clamp((metrics.workoutCount / workoutTarget) * 100);
  const nutritionProgress = metrics.avgCalories === null ? 0 : clamp(100 - (Math.abs(metrics.avgCalories - settings.calTarget) / Math.max(1, settings.calTarget)) * 220);
  const trendBalanceScores = {
    sleep: advice?.scores.sleep ?? (metrics.avgSleep === null ? null : Math.round(sleepProgress)),
    workouts: advice?.scores.workouts ?? (metrics.workoutCount ? Math.round(workoutProgress) : null),
    nutrition: advice?.scores.nutrition ?? (metrics.avgCalories === null ? null : Math.round(nutritionProgress)),
  };
  const nextActions = [
    metrics.coveragePct < 60
      ? {
          tone: 'info' as const,
          title: 'Додайте більше днів',
          text: `Заповнено ${metrics.loggedDays} з ${rangeDays} днів. Для точних трендів варто мати хоча б 60-70% покриття.`,
        }
      : {
          tone: 'accent' as const,
          title: 'Дані вже корисні',
          text: `Покриття ${metrics.coveragePct}%. Можна дивитися не тільки окремі графіки, а й зв'язки між сном, тренуваннями та харчуванням.`,
        },
    metrics.avgSleep === null || metrics.avgSleep < settings.sleepTarget - 0.4
      ? {
          tone: 'warn' as const,
          title: 'Підтягніть сон',
          text: `Ціль сну ${settings.sleepTarget} год. Додайте 20-30 хвилин до середнього сну або зафіксуйте реальний режим кілька днів поспіль.`,
        }
      : {
          tone: 'accent' as const,
          title: 'Сон близько до цілі',
          text: `Середній сон ${formatNumber(metrics.avgSleep, ' год')}. Спробуйте зберегти цей режим і подивіться, як зміниться енергія.`,
        },
    metrics.workoutCount < workoutTarget
      ? {
          tone: 'info' as const,
          title: 'Заплануйте наступне тренування',
          text: `За цей період є ${metrics.workoutCount} тренувань із цілі приблизно ${Math.round(workoutTarget)}. Додайте легкий день, якщо відчуваєте втому.`,
        }
      : {
          tone: 'accent' as const,
          title: 'Ритм тренувань тримається',
          text: `Тренувань достатньо для обраної цілі. Тепер важливі відновлення, сон і білок.`,
        },
  ];

  return (
    <section>
      <header className="mb-4.5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px]">Тренди та серії</h1>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Дивіться, що реально змінюється з часом: сон, тренування, харчування, вага, настрій і зв'язки між ними.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={seedDemoData}
            disabled={seedingDemo}
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-[13px] font-semibold text-accent hover:border-accent/60 disabled:opacity-60"
          >
            <Database size={14} />
            {seedingDemo ? 'Додаю...' : 'Демо-дані'}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-text-muted hover:border-accent hover:text-accent disabled:opacity-60"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Оновити
          </button>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-text-muted">Період:</span>
          {[14, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setRangeDays(days as RangeDays)}
              className={`rounded-lg border px-3 py-1.5 text-[12.5px] ${
                rangeDays === days ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted hover:border-accent/50'
              }`}
            >
              {days} днів
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ['sleep', 'Сон'],
            ['workouts', 'Тренування'],
            ['nutrition', 'Харчування'],
            ['weight', 'Вага'],
            ['mood', 'Настрій'],
          ].map(([type, label]) => (
            <a
              key={type}
              href={`/api/export/${type}`}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent hover:text-accent"
            >
              <Download size={12} />
              {label}
            </a>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Flame} iconColor="#fbbf24" label="Серія цілі сну" value={`${currentStreak(sleepGoalDates)} дн.`} hint={`рекорд ${longestStreak(sleepGoalDates)} дн.`} />
        <StatCard icon={Zap} iconColor="#6ee7b7" label="Активний трекінг" value={`${currentStreak(trackingDates)} дн.`} hint={`рекорд ${longestStreak(trackingDates)} дн.`} />
        <StatCard icon={CalendarClock} iconColor="#60a5fa" label="Серія тренувань" value={`${currentStreak(workoutDates)} дн.`} hint={`рекорд ${longestStreak(workoutDates)} дн.`} />
        <StatCard icon={Trophy} iconColor="#34d399" label="Загальна оцінка" value={`${advice?.overallScore ?? '-'}/100`} hint={advice?.tag ?? 'потрібно більше даних'} />
      </div>

      <h2 className="mb-2.5 mt-6 text-[15px] font-semibold">Ключові зміни за {rangeDays} днів</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-text-muted"><Moon size={14} className="text-accent" />Середній сон</div>
          <div className="mt-2 text-2xl font-bold">{formatNumber(metrics.avgSleep, ' год')}</div>
          <div className="mt-1 text-xs"><DeltaBadge value={metrics.sleepDelta} unit="год" /></div>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-text-muted"><Activity size={14} className="text-info" />Тренування</div>
          <div className="mt-2 text-2xl font-bold">{metrics.workoutCount}</div>
          <div className="mt-1 text-xs"><DeltaBadge value={metrics.workoutDelta} unit="" /> <span className="text-text-muted">/ {metrics.workoutMinutes} хв</span></div>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-text-muted"><Utensils size={14} className="text-warn" />Калорії</div>
          <div className="mt-2 text-2xl font-bold">{formatNumber(metrics.avgCalories, ' ккал')}</div>
          <div className="mt-1 text-xs"><DeltaBadge value={metrics.caloriesDelta} unit="ккал" /></div>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-text-muted"><Target size={14} className="text-accent" />Вага і настрій</div>
          <div className="mt-2 text-2xl font-bold">{formatNumber(metrics.latestWeight, ' кг')}</div>
          <div className="mt-1 text-xs">
            <DeltaBadge value={metrics.weightDelta} unit="кг" invertGood={settings.goal === 'lose'} />
            <span className="ml-2 text-text-muted">настрій {metrics.avgMood ?? '-'}/5</span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Прогрес до цілей</h2>
            <span className="text-xs text-text-muted">{metrics.loggedDays} з {rangeDays} днів мають записи</span>
          </div>
          <div className="space-y-4">
            <GoalProgress label="Покриття даних" value={metrics.coveragePct} hint="Більше заповнених днів дає точніші тренди." />
            <GoalProgress label="Сон відносно цілі" value={sleepProgress} hint={`Ціль: ${settings.sleepTarget} год. Середнє: ${formatNumber(metrics.avgSleep, ' год')}.`} />
            <GoalProgress label="Тренування" value={workoutProgress} hint={`${metrics.workoutCount} з приблизно ${Math.round(workoutTarget)} тренувань за період.`} />
            <GoalProgress label="Харчування" value={nutritionProgress} hint={`Ціль: ${settings.calTarget} ккал. Середнє: ${formatNumber(metrics.avgCalories, ' ккал')}.`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Що зробити далі</h2>
            <Link href="/app/quick-add" className="inline-flex items-center gap-1 text-xs text-accent underline">
              <PlusCircle size={13} />
              додати запис
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {nextActions.map((action) => (
              <ActionItem key={action.title} {...action} />
            ))}
          </div>
        </div>
      </div>

      <h2 className="mb-2.5 mt-6 flex items-center gap-2 text-[15px] font-semibold">
        <BarChart3 size={16} className="text-accent" />
        Графіки
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartPanel title="Тижневий баланс" empty={[trendBalanceScores.sleep, trendBalanceScores.workouts, trendBalanceScores.nutrition].every((value) => value === null)}>
          <BalanceChart scores={trendBalanceScores} />
        </ChartPanel>
        <ChartPanel title={`Сон (${rangeDays} днів)`} empty={sleep.length === 0}>
          <SleepChart sleepAll={sleep} target={settings.sleepTarget} days={rangeDays} />
        </ChartPanel>
        <ChartPanel title={`Тренування (${rangeDays} днів)`} empty={workouts.length === 0}>
          <WorkoutChart workoutsAll={workouts} days={rangeDays} />
        </ChartPanel>
        <ChartPanel title={`Калорії та білок (${rangeDays} днів)`} empty={nutrition.length === 0}>
          <NutritionChart nutritionAll={nutrition} days={rangeDays} />
        </ChartPanel>
        <ChartPanel title={`Вага (${rangeDays} днів)`} empty={weight.length === 0}>
          <WeightChart weightAll={weight} days={rangeDays} />
        </ChartPanel>
        <div className="md:col-span-2">
          <ChartPanel title={`Настрій та енергія (${rangeDays} днів)`} empty={mood.length === 0}>
            <MoodChart moodAll={mood} days={rangeDays} />
          </ChartPanel>
        </div>
      </div>

      <InsightsCard />
    </section>
  );
}
