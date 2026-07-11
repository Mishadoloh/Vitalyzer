'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Dumbbell, Moon, PlusCircle, Sparkles, TrendingUp, UploadCloud, Utensils } from 'lucide-react';
import AdviceCard from '@/components/AdviceCard';
import ScoreRow from '@/components/ScoreRow';
import SleepChart from '@/components/charts/SleepChart';
import WorkoutChart from '@/components/charts/WorkoutChart';
import NutritionChart from '@/components/charts/NutritionChart';
import BalanceChart from '@/components/charts/BalanceChart';
import WeightChart from '@/components/charts/WeightChart';
import MoodChart from '@/components/charts/MoodChart';
import { showToast } from '@/lib/toast';
import type { AdviceResult, Settings } from '@/lib/types';

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

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function buildFallbackBalanceScores({
  sleep,
  workouts,
  nutrition,
  settings,
}: {
  sleep: SleepRow[];
  workouts: WorkoutRow[];
  nutrition: NutritionRow[];
  settings: Settings | null;
}) {
  if (!settings) return { sleep: null, workouts: null, nutrition: null };
  const from = addDays(todayISO(), -13);
  const recentSleep = sleep.filter((entry) => entry.date >= from);
  const recentWorkouts = workouts.filter((entry) => entry.date >= from);
  const recentNutrition = nutrition.filter((entry) => entry.date >= from);

  const avgSleep = average(recentSleep.map((entry) => entry.hours));
  const sleepScore = avgSleep === null ? null : clamp(Math.round(100 - Math.abs(avgSleep - settings.sleepTarget) * 18));

  const targetWorkouts = Math.max(1, settings.workoutsTarget || 4);
  const workoutScore = recentWorkouts.length ? clamp(Math.round(Math.min(recentWorkouts.length / (targetWorkouts * 2), 1) * 100)) : null;

  const avgCalories = average(recentNutrition.map((entry) => entry.calories));
  const avgProtein = average(recentNutrition.map((entry) => entry.proteinG));
  let nutritionScore: number | null = null;
  if (avgCalories !== null) {
    const calorieDiffPct = Math.abs(avgCalories - settings.calTarget) / Math.max(1, settings.calTarget);
    const proteinPerKg = avgProtein === null ? null : avgProtein / Math.max(1, settings.weightKg);
    const proteinPenalty = proteinPerKg === null ? 0 : Math.abs(proteinPerKg - settings.proteinTarget) * 12;
    nutritionScore = clamp(Math.round(100 - calorieDiffPct * 220 - proteinPenalty));
  }

  return { sleep: sleepScore, workouts: workoutScore, nutrition: nutritionScore };
}

export default function DashboardPage() {
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(true);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [today, setToday] = useState('');
  const [todayKey, setTodayKey] = useState('');
  const totalEntries = sleep.length + workouts.length + nutrition.length + weight.length + mood.length;
  const hasAnyData = totalEntries > 0;
  const todayItems = [
    { label: 'Сон', done: sleep.some((entry) => entry.date === todayKey), href: '/app/quick-add' },
    { label: 'Тренування', done: workouts.some((entry) => entry.date === todayKey), href: '/app/quick-add' },
    { label: 'Харчування', done: nutrition.some((entry) => entry.date === todayKey), href: '/app/quick-add' },
    { label: 'Вага', done: weight.some((entry) => entry.date === todayKey), href: '/app/quick-add' },
    { label: 'Настрій', done: mood.some((entry) => entry.date === todayKey), href: '/app/quick-add' },
  ];
  const doneToday = todayItems.filter((item) => item.done).length;
  const categoryProgress = [
    { label: 'Сон', count: sleep.length, icon: Moon, tone: 'text-accent', href: '/app/quick-add' },
    { label: 'Тренування', count: workouts.length, icon: Dumbbell, tone: 'text-info', href: '/app/quick-add' },
    { label: 'Харчування', count: nutrition.length, icon: Utensils, tone: 'text-warn', href: '/app/quick-add' },
    { label: 'Вага', count: weight.length, icon: TrendingUp, tone: 'text-accent', href: '/app/quick-add' },
    { label: 'Настрій', count: mood.length, icon: Sparkles, tone: 'text-info', href: '/app/quick-add' },
  ];
  const fallbackBalanceScores = buildFallbackBalanceScores({ sleep, workouts, nutrition, settings });
  const balanceScores = {
    sleep: advice?.scores.sleep ?? fallbackBalanceScores.sleep,
    workouts: advice?.scores.workouts ?? fallbackBalanceScores.workouts,
    nutrition: advice?.scores.nutrition ?? fallbackBalanceScores.nutrition,
  };
  const hasBalanceScore = [balanceScores.sleep, balanceScores.workouts, balanceScores.nutrition].some((value) => value !== null);

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })
    );
    setTodayKey(todayISO());
    loadAll(false);
  }, []);

  async function loadAll(force: boolean) {
    setLoadingAdvice(true);
    try {
      const [adviceRes, sleepRes, workoutsRes, nutritionRes, weightRes, moodRes, settingsRes] = await Promise.all([
        fetch(`/api/advice${force ? '?force=true' : ''}`).then((r) => r.json()),
        fetch('/api/sleep').then((r) => r.json()),
        fetch('/api/workouts').then((r) => r.json()),
        fetch('/api/nutrition').then((r) => r.json()),
        fetch('/api/weight').then((r) => r.json()),
        fetch('/api/mood').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
      ]);
      if (adviceRes.warning) showToast(adviceRes.warning, true);
      setAdvice(adviceRes);
      setSleep(sleepRes);
      setWorkouts(workoutsRes);
      setNutrition(nutritionRes);
      setWeight(weightRes);
      setMood(moodRes);
      setSettings(settingsRes);
    } catch (e) {
      showToast('Не вдалося завантажити дашборд: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoadingAdvice(false);
    }
  }

  async function seedDemoData() {
    setSeedingDemo(true);
    try {
      const res = await fetch('/api/demo-data', { method: 'POST' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Не вдалося додати демо-дані');
      showToast(result.message || 'Демо-дані додано');
      await loadAll(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSeedingDemo(false);
    }
  }

  return (
    <section>
      <header className="mb-4.5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="m-0 text-[22px]">Щоденний дашборд</h1>
          <p className="mt-1 text-sm text-text-muted">Один погляд на сон, активність, харчування, вагу й настрій.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-muted">{today}</div>
          <Link
            href="/app/quick-add"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-strong px-3.5 py-1.5 text-[13px] font-semibold text-[#06281c]"
          >
            <PlusCircle size={14} />
            Швидкий запис
          </Link>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {categoryProgress.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-border bg-bg-card p-3.5 transition-colors hover:border-accent/40 hover:bg-bg-elevated"
          >
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ${item.tone}`}>
                <item.icon size={16} />
              </span>
              {item.count > 0 ? <CheckCircle2 size={15} className="text-accent-strong" /> : <PlusCircle size={15} className="text-text-muted" />}
            </div>
            <div className="mt-3 text-lg font-semibold text-text">{item.count}</div>
            <div className="text-xs text-text-muted">{item.label}</div>
          </Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">План на сьогодні</h2>
              <p className="mt-1 text-xs text-text-muted">
                Заповнено {doneToday} з {todayItems.length}. Додайте відсутні показники, щоб порада була точнішою.
              </p>
            </div>
            <Link
              href="/app/quick-add"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-text-muted hover:border-accent hover:text-accent"
            >
              <PlusCircle size={14} />
              Додати запис
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {todayItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl border px-3 py-2 text-[12.5px] transition-colors ${
                  item.done ? 'border-accent/30 bg-accent/10 text-accent' : 'border-border bg-bg-elevated text-text-muted hover:border-accent/40'
                }`}
              >
                <span className="mb-1 flex items-center gap-1.5">
                  {item.done ? <CheckCircle2 size={14} /> : <PlusCircle size={14} />}
                  {item.label}
                </span>
                <span className="text-[11px] opacity-75">{item.done ? 'готово' : 'додати'}</span>
              </Link>
            ))}
          </div>
        </div>
        <button
          onClick={seedDemoData}
          disabled={seedingDemo}
          className="rounded-2xl border border-accent/30 bg-accent/10 px-5 py-4 text-left transition-colors hover:border-accent/60 disabled:opacity-60 lg:w-[220px]"
        >
          <Sparkles size={18} className="mb-3 text-accent" />
          <span className="block text-sm font-semibold text-text">{seedingDemo ? 'Додаємо демо...' : 'Заповнити демо-даними'}</span>
          <span className="mt-1 block text-xs leading-5 text-text-muted">14 днів сну, харчування, ваги, настрою і тренувань.</span>
        </button>
      </div>

      {!loadingAdvice && !hasAnyData && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-bg-card to-bg-elevated">
          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
                <Sparkles size={13} />
                Старт за 2 хвилини
              </span>
              <h2 className="mt-4 text-xl font-semibold">Додайте перші дані, і дашборд оживе</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Можна внести один запис вручну, імпортувати файл або завантажити демо-дані. Після цього Vitalyzer
                побудує графіки, баланс тижня й щоденну пораду.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[430px]">
              <Link href="/app/quick-add" className="rounded-xl border border-border bg-bg/50 p-3 text-sm hover:border-accent/50">
                <PlusCircle size={17} className="mb-2 text-accent" />
                Швидкий запис
              </Link>
              <Link href="/app/import" className="rounded-xl border border-border bg-bg/50 p-3 text-sm hover:border-accent/50">
                <UploadCloud size={17} className="mb-2 text-info" />
                Імпорт файлу
              </Link>
              <button onClick={seedDemoData} disabled={seedingDemo} className="rounded-xl border border-border bg-bg/50 p-3 text-left text-sm hover:border-accent/50 disabled:opacity-60">
                <Sparkles size={17} className="mb-2 text-warn" />
                {seedingDemo ? 'Додаємо...' : 'Демо-дані'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdviceCard advice={advice} loading={loadingAdvice} onRefresh={() => loadAll(true)} />

      {advice && <ScoreRow advice={advice} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="Сон, год (14 днів)" empty={!loadingAdvice && sleep.length === 0} actionHref="/app/quick-add">
          <SleepChart sleepAll={sleep} target={settings?.sleepTarget ?? 8} />
        </ChartCard>
        <ChartCard title="Тренувальне навантаження (14 днів)" empty={!loadingAdvice && workouts.length === 0} actionHref="/app/quick-add">
          <WorkoutChart workoutsAll={workouts} />
        </ChartCard>
        <ChartCard title="Калорії та білок (14 днів)" empty={!loadingAdvice && nutrition.length === 0} actionHref="/app/quick-add">
          <NutritionChart nutritionAll={nutrition} />
        </ChartCard>
        <ChartCard title="Тижневий баланс" empty={!loadingAdvice && !hasBalanceScore} actionHref="/app/quick-add">
          <BalanceChart scores={balanceScores} />
        </ChartCard>
        <ChartCard title="Вага (14 днів)" empty={!loadingAdvice && weight.length === 0} actionHref="/app/quick-add">
          <WeightChart weightAll={weight} days={14} />
        </ChartCard>
        <ChartCard title="Настрій та енергія (14 днів)" empty={!loadingAdvice && mood.length === 0} actionHref="/app/quick-add">
          <MoodChart moodAll={mood} days={14} />
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  empty,
  actionHref,
  children,
}: {
  title: string;
  empty: boolean;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-[260px] overflow-hidden rounded-2xl border border-border bg-bg-card p-4">
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-text-muted">{title}</h3>
        {empty && (
          <Link href={actionHref} className="text-xs text-accent underline">
            додати
          </Link>
        )}
      </div>
      <div className={empty ? 'opacity-25' : ''}>{children}</div>
      {empty && (
        <div className="absolute inset-x-4 bottom-4 rounded-xl border border-border bg-bg-elevated/95 p-3 text-[13px] text-text-muted shadow-xl shadow-black/25">
          Даних поки немає. Додайте запис або імпортуйте файл, щоб побачити тренд.
        </div>
      )}
    </div>
  );
}
