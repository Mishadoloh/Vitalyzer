'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Dumbbell,
  Flame,
  Moon,
  PlusCircle,
  Scale,
  Settings,
  Smile,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import AdviceCard from '@/components/AdviceCard';
import ScoreRow from '@/components/ScoreRow';
import { showToast } from '@/lib/toast';
import type { AdviceResult, Settings as UserSettings } from '@/lib/types';

const SleepChart = dynamic(() => import('@/components/charts/SleepChart'), { ssr: false, loading: () => <ChartLoading /> });
const WorkoutChart = dynamic(() => import('@/components/charts/WorkoutChart'), { ssr: false, loading: () => <ChartLoading /> });
const NutritionChart = dynamic(() => import('@/components/charts/NutritionChart'), { ssr: false, loading: () => <ChartLoading /> });
const BalanceChart = dynamic(() => import('@/components/charts/BalanceChart'), { ssr: false, loading: () => <ChartLoading /> });
const WeightChart = dynamic(() => import('@/components/charts/WeightChart'), { ssr: false, loading: () => <ChartLoading /> });
const MoodChart = dynamic(() => import('@/components/charts/MoodChart'), { ssr: false, loading: () => <ChartLoading /> });

interface SleepRow {
  date: string;
  hours: number;
  quality?: number | null;
}
interface WorkoutRow {
  date: string;
  durationMin: number;
}
interface NutritionRow {
  date: string;
  calories: number;
  proteinG: number;
  waterMl?: number | null;
}
interface WeightRow {
  date: string;
  weightKg: number;
}
interface MoodRow {
  date: string;
  mood: number;
  energy: number;
  stress?: number | null;
}

interface SmartInsight {
  title: string;
  text: string;
  tone: 'accent' | 'info' | 'warn' | 'danger';
  href: string;
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
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function round(value: number | null, digits = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value: number | null, suffix = ''): string {
  return value === null ? '-' : `${value}${suffix}`;
}

function recent<T extends { date: string }>(rows: T[], days = 14): T[] {
  const from = addDays(todayISO(), -(days - 1));
  return Array.isArray(rows) ? rows.filter((entry) => entry.date >= from) : [];
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'error' in body
      ? String(body.error)
      : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function rowsOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
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
  settings: UserSettings | null;
}) {
  if (!settings) return { sleep: null, workouts: null, nutrition: null };
  const recentSleep = recent(sleep);
  const recentWorkouts = recent(workouts);
  const recentNutrition = recent(nutrition);

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

function buildSmartInsights({
  sleep,
  workouts,
  nutrition,
  weight,
  mood,
  settings,
}: {
  sleep: SleepRow[];
  workouts: WorkoutRow[];
  nutrition: NutritionRow[];
  weight: WeightRow[];
  mood: MoodRow[];
  settings: UserSettings | null;
}): SmartInsight[] {
  const insights: SmartInsight[] = [];
  const recentSleep = recent(sleep);
  const recentNutrition = recent(nutrition);
  const recentWeight = recent(weight).sort((a, b) => a.date.localeCompare(b.date));
  const recentMood = recent(mood);
  const lastThreeDays = [todayISO(), addDays(todayISO(), -1), addDays(todayISO(), -2)];
  const sleepByDate = new Map(sleep.map((entry) => [entry.date, entry.hours]));

  if (lastThreeDays.every((date) => {
    const hours = sleepByDate.get(date);
    return typeof hours === 'number' && hours < 7;
  })) {
    insights.push({
      title: 'Сон просів',
      text: 'Сон менше 7 годин три дні поспіль. Сьогодні краще зробити легший вечір і стабільний час відбою.',
      tone: 'warn',
      href: '/app/quick-add',
    });
  }

  const workoutDates = new Set(workouts.map((entry) => entry.date));
  const moodAfterWorkouts = recentMood.filter((entry) => workoutDates.has(entry.date));
  const moodWithoutWorkouts = recentMood.filter((entry) => !workoutDates.has(entry.date));
  const workoutMoodAvg = average(moodAfterWorkouts.map((entry) => entry.mood));
  const restMoodAvg = average(moodWithoutWorkouts.map((entry) => entry.mood));
  if (workoutMoodAvg !== null && restMoodAvg !== null && moodAfterWorkouts.length >= 2 && workoutMoodAvg - restMoodAvg >= 0.6) {
    insights.push({
      title: 'Тренування допомагають настрою',
      text: `У дні з тренуванням середній настрій вищий: ${round(workoutMoodAvg)}/5 проти ${round(restMoodAvg)}/5.`,
      tone: 'accent',
      href: '/app/trends',
    });
  }

  if (settings && recentNutrition.length >= 3) {
    const avgProtein = average(recentNutrition.map((entry) => entry.proteinG));
    const proteinTarget = settings.weightKg * settings.proteinTarget;
    if (avgProtein !== null && avgProtein < proteinTarget * 0.85) {
      insights.push({
        title: 'Білка не вистачає',
        text: `Середньо ${round(avgProtein, 0)} г білка при цілі близько ${Math.round(proteinTarget)} г. Додайте білковий прийом їжі.`,
        tone: 'warn',
        href: '/app/quick-add',
      });
    }
  }

  if (recentWeight.length >= 7) {
    const delta = recentWeight[recentWeight.length - 1].weightKg - recentWeight[0].weightKg;
    if (delta <= -1.2) {
      insights.push({
        title: 'Вага падає швидко',
        text: `За останні записи зміна ${round(delta)} кг. Перевірте калорії, білок і відновлення.`,
        tone: 'danger',
        href: '/app/trends',
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      title: 'Ритм формується',
      text: 'Додайте сон, вагу, харчування або тренування сьогодні, і тут з’являться точні персональні висновки.',
      tone: 'info',
      href: '/app/quick-add',
    });
  }

  return insights.slice(0, 4);
}

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(true);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [today, setToday] = useState('');
  const [todayKey, setTodayKey] = useState('');

  const dashboardMetrics = useMemo(() => {
    const recentSleep = recent(sleep);
    const recentWorkouts = recent(workouts);
    const recentNutrition = recent(nutrition);
    const recentMood = recent(mood);
    const recentWeight = recent(weight).sort((a, b) => a.date.localeCompare(b.date));

    const avgSleep = round(average(recentSleep.map((entry) => entry.hours)));
    const avgQuality = round(average(recentSleep.map((entry) => entry.quality ?? 0).filter(Boolean)));
    const workoutMinutes = recentWorkouts.reduce((sum, entry) => sum + (entry.durationMin || 0), 0);
    const avgCalories = round(average(recentNutrition.map((entry) => entry.calories)), 0);
    const avgProtein = round(average(recentNutrition.map((entry) => entry.proteinG)), 0);
    const avgWater = round(average(recentNutrition.map((entry) => entry.waterMl || 0).filter(Boolean)), 0);
    const avgMood = round(average(recentMood.map((entry) => entry.mood)));
    const avgEnergy = round(average(recentMood.map((entry) => entry.energy)));
    const avgStress = round(average(recentMood.map((entry) => entry.stress ?? 0).filter(Boolean)));
    const firstWeight = recentWeight[0]?.weightKg ?? null;
    const latestWeight = recentWeight[recentWeight.length - 1]?.weightKg ?? null;
    const weightDelta = firstWeight !== null && latestWeight !== null ? round(latestWeight - firstWeight) : null;
    const loggedDays = new Set([
      ...recentSleep.map((entry) => entry.date),
      ...recentWorkouts.map((entry) => entry.date),
      ...recentNutrition.map((entry) => entry.date),
      ...recentMood.map((entry) => entry.date),
    ]).size;

    return {
      avgSleep,
      avgQuality,
      workoutCount: recentWorkouts.length,
      workoutMinutes,
      avgCalories,
      avgProtein,
      avgWater,
      avgMood,
      avgEnergy,
      avgStress,
      latestWeight: round(latestWeight),
      weightDelta,
      loggedDays,
    };
  }, [mood, nutrition, sleep, weight, workouts]);

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
    { label: 'Настрій', count: mood.length, icon: Smile, tone: 'text-info', href: '/app/quick-add' },
  ];
  const fallbackBalanceScores = buildFallbackBalanceScores({ sleep, workouts, nutrition, settings });
  const balanceScores = {
    sleep: advice?.scores.sleep ?? fallbackBalanceScores.sleep,
    workouts: advice?.scores.workouts ?? fallbackBalanceScores.workouts,
    nutrition: advice?.scores.nutrition ?? fallbackBalanceScores.nutrition,
  };
  const hasBalanceScore = [balanceScores.sleep, balanceScores.workouts, balanceScores.nutrition].some((value) => value !== null);
  const scoreParts = [balanceScores.sleep, balanceScores.workouts, balanceScores.nutrition].filter((value): value is number => value !== null && value !== undefined);
  const heroScore = advice?.overallScore ?? (scoreParts.length ? Math.round(average(scoreParts) ?? 0) : null);
  const heroScoreText = heroScore === null ? '-' : String(heroScore);
  const completionPct = Math.round((doneToday / Math.max(1, todayItems.length)) * 100);
  const smartInsights = buildSmartInsights({ sleep, workouts, nutrition, weight, mood, settings });

  useEffect(() => {
    setToday(new Date().toLocaleDateString(locale, { day: 'numeric', month: 'long', weekday: 'long' }));
    setTodayKey(todayISO());
    loadAll(false);
  }, [locale]);

  async function loadAll(force: boolean) {
    setLoadingAdvice(true);
    try {
      const [adviceRes, dashboardRes] = await Promise.all([
        fetchJson(`/api/advice${force ? '?force=true' : ''}`),
        fetchJson('/api/dashboard-data'),
      ]);
      const dashboard = dashboardRes && typeof dashboardRes === 'object'
        ? dashboardRes as Record<string, unknown>
        : {};
      const nextAdvice = adviceRes && typeof adviceRes === 'object' && 'scores' in adviceRes
        ? adviceRes as AdviceResult
        : null;
      const warning = adviceRes && typeof adviceRes === 'object' && 'warning' in adviceRes
        ? String(adviceRes.warning)
        : null;
      if (warning) showToast(warning, true);
      setAdvice(nextAdvice);
      setSleep(rowsOrEmpty<SleepRow>(dashboard.sleep));
      setWorkouts(rowsOrEmpty<WorkoutRow>(dashboard.workouts));
      setNutrition(rowsOrEmpty<NutritionRow>(dashboard.nutrition));
      setWeight(rowsOrEmpty<WeightRow>(dashboard.weight));
      setMood(rowsOrEmpty<MoodRow>(dashboard.mood));
      setSettings(dashboard.settings && typeof dashboard.settings === 'object' && !Array.isArray(dashboard.settings) ? dashboard.settings as UserSettings : null);
    } catch (e) {
      showToast('Не вдалося завантажити дашборд: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoadingAdvice(false);
    }
  }

  async function seedDemoData() {
    setSeedingDemo(true);
    try {
      const response = await fetch('/api/demo-data', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося додати демо-дані');
      showToast(result.message || 'Демо-дані додано');
      await loadAll(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setSeedingDemo(false);
    }
  }

  async function resetAllData() {
    const ok = window.confirm(
      'Почати з нуля? Буде видалено всі записи: сон, тренування, харчування, вагу, настрій, поради та налаштування. Дію не можна скасувати.'
    );
    if (!ok) return;

    setResetting(true);
    try {
      const response = await fetch('/api/wipe', { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Не вдалося скинути дані');
      setAdvice(null);
      setSleep([]);
      setWorkouts([]);
      setNutrition([]);
      setWeight([]);
      setMood([]);
      setSettings(null);
      showToast('Готово. Дані очищено, можна починати з нуля.');
      await loadAll(true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
    } finally {
      setResetting(false);
    }
  }

  return (
    <section className="pb-10">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(30,35,47,0.96),rgba(19,22,31,0.98)_45%,rgba(11,24,27,0.96))] shadow-2xl shadow-black/25">
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_320px] lg:p-6">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-[12px] font-medium text-accent">
                <Activity size={13} />
                {today || 'сьогодні'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-info/25 bg-info/10 px-3 py-1 text-[12px] text-info">
                <BarChart3 size={13} />
                {t('daysLogged', { count: dashboardMetrics.loggedDays })}
              </span>
            </div>
            <h1 className="m-0 max-w-2xl text-2xl font-bold leading-tight text-text sm:text-3xl">
              {t('title')}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              {t('subtitle')}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <HeroMetric icon={CheckCircle2} label={t('plan')} value={`${doneToday}/${todayItems.length}`} tone="accent" />
              <HeroMetric icon={Flame} label={t('readiness')} value={heroScore === null ? '-' : `${heroScore}/100`} tone="warn" />
              <HeroMetric icon={TrendingDown} label={t('weight')} value={formatNumber(dashboardMetrics.weightDelta, ' кг')} tone="info" />
              <HeroMetric icon={Smile} label={t('mood')} value={formatNumber(dashboardMetrics.avgMood, '/5')} tone="neutral" />
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-bg/35 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-text-muted">стан зараз</div>
                <div className="mt-1 text-sm font-semibold text-text">{heroScore === null ? 'Потрібні дані' : heroScore >= 75 ? 'Стабільний ритм' : heroScore >= 55 ? 'Є що підтягнути' : 'Почніть з малого'}</div>
              </div>
              <div
                className="grid h-24 w-24 place-items-center rounded-full"
                style={{ background: `conic-gradient(#34d399 ${heroScore ?? completionPct}%, rgba(255,255,255,0.08) 0)` }}
              >
                <div className="grid h-[76px] w-[76px] place-items-center rounded-full border border-border bg-bg-card text-center">
                  <div>
                    <div className="text-2xl font-bold text-text">{heroScoreText}</div>
                    <div className="text-[10px] text-text-muted">/100</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/app/quick-add" className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent-strong px-3 py-3 text-[13px] font-semibold text-[#06281c]">
                <PlusCircle size={15} />
                {t('record')}
              </Link>
              <Link href="/app/trends" className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-bg-elevated px-3 py-3 text-[13px] text-text-muted hover:border-accent hover:text-accent">
                <BarChart3 size={15} />
                {t('trends')}
              </Link>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full rounded-full bg-accent-strong transition-[width]" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="mt-2 text-[11px] text-text-muted">Сьогодні закрито {completionPct}% базового плану.</div>
          </div>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {categoryProgress.map((item) => (
          <Link key={item.label} href={item.href} className="group rounded-2xl border border-border bg-bg-card p-3.5 shadow-sm shadow-black/10 transition-colors hover:border-accent/40 hover:bg-bg-elevated">
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 ${item.tone}`}>
                <item.icon size={16} />
              </span>
              {item.count > 0 ? <CheckCircle2 size={15} className="text-accent-strong" /> : <PlusCircle size={15} className="text-text-muted" />}
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div>
                <div className="text-xl font-bold text-text">{item.count}</div>
                <div className="text-xs text-text-muted">{item.label}</div>
              </div>
              <span className="text-[11px] text-text-muted opacity-0 transition-opacity group-hover:opacity-100">відкрити</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_240px]">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-text">План на сьогодні</h2>
              <p className="mt-1 text-xs text-text-muted">
                Заповнено {doneToday} з {todayItems.length}. Додайте відсутні показники, щоб порада була точнішою.
              </p>
            </div>
            <Link href="/app/quick-add" className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[13px] text-text-muted hover:border-accent hover:text-accent">
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
        <button onClick={seedDemoData} disabled={seedingDemo} className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-left transition-colors hover:border-accent/60 disabled:opacity-60">
          <Activity size={18} className="mb-3 text-accent" />
          <span className="block text-sm font-semibold text-text">{seedingDemo ? 'Додаємо демо...' : 'Заповнити демо-даними'}</span>
          <span className="mt-1 block text-xs leading-5 text-text-muted">14 днів сну, харчування, ваги, настрою і тренувань.</span>
        </button>
      </div>

      <div className="mb-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-semibold text-text">Міні-дашборди</h2>
            <p className="mt-1 text-xs text-text-muted">Окремі панелі для швидкого контролю відновлення, активності, харчування й тіла.</p>
          </div>
          <Link href="/app/trends" className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent">
            Детальні тренди
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MiniDashboard
            icon={Moon}
            title="Відновлення"
            subtitle="сон, енергія, стрес"
            score={balanceScores.sleep}
            tone="accent"
            rows={[
              ['Сон', formatNumber(dashboardMetrics.avgSleep, ' год')],
              ['Якість', formatNumber(dashboardMetrics.avgQuality, '/5')],
              ['Енергія', formatNumber(dashboardMetrics.avgEnergy, '/5')],
            ]}
          />
          <MiniDashboard
            icon={Dumbbell}
            title="Активність"
            subtitle="тренування і навантаження"
            score={balanceScores.workouts}
            tone="info"
            rows={[
              ['Тренувань', String(dashboardMetrics.workoutCount)],
              ['Хвилин', `${dashboardMetrics.workoutMinutes}`],
              ['Ціль/тижд.', settings ? `${settings.workoutsTarget}` : '-'],
            ]}
          />
          <MiniDashboard
            icon={Utensils}
            title="Харчування"
            subtitle="ккал, білок, вода"
            score={balanceScores.nutrition}
            tone="warn"
            rows={[
              ['Калорії', formatNumber(dashboardMetrics.avgCalories, ' ккал')],
              ['Білок', formatNumber(dashboardMetrics.avgProtein, ' г')],
              ['Вода', formatNumber(dashboardMetrics.avgWater, ' мл')],
            ]}
          />
          <MiniDashboard
            icon={Scale}
            title="Тіло"
            subtitle="вага і динаміка"
            score={null}
            tone="neutral"
            rows={[
              ['Вага', formatNumber(dashboardMetrics.latestWeight, ' кг')],
              ['Зміна', formatNumber(dashboardMetrics.weightDelta, ' кг')],
              ['Настрій', formatNumber(dashboardMetrics.avgMood, '/5')],
            ]}
          />
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <DashboardShortcut icon={PlusCircle} title="Операційний дашборд" text="Швидко закрийте сьогоднішній план." href="/app/quick-add" />
        <DashboardShortcut icon={UploadCloud} title="Дашборд даних" text="Імпорт, демо-дані та резервні копії." href="/app/import" />
        <DashboardShortcut icon={Target} title="Дашборд цілей" text="Сон, калорії, білок і тренування." href="/app/goals" />
        <DashboardAction
          icon={Trash2}
          title="Почати з нуля"
          text="Очистити всі записи й повернути чистий дашборд."
          onClick={resetAllData}
          disabled={resetting}
          danger
        />
      </div>

      {!loadingAdvice && !hasAnyData && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-accent/25 bg-bg-card">
          <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
                <Activity size={13} />
                Старт за 2 хвилини
              </span>
              <h2 className="mt-4 text-xl font-semibold text-text">Додайте перші дані, і дашборд оживе</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                Можна внести один запис вручну, імпортувати файл або завантажити демо-дані. Після цього Metrivyn побудує графіки, баланс тижня й щоденну пораду.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:w-[430px]">
              <Link href="/app/quick-add" className="rounded-xl border border-border bg-bg-elevated p-3 text-sm hover:border-accent/50">
                <PlusCircle size={17} className="mb-2 text-accent" />
                Швидкий запис
              </Link>
              <Link href="/app/import" className="rounded-xl border border-border bg-bg-elevated p-3 text-sm hover:border-accent/50">
                <UploadCloud size={17} className="mb-2 text-info" />
                Імпорт файлу
              </Link>
              <button onClick={seedDemoData} disabled={seedingDemo} className="rounded-xl border border-border bg-bg-elevated p-3 text-left text-sm hover:border-accent/50 disabled:opacity-60">
                <Activity size={17} className="mb-2 text-warn" />
                {seedingDemo ? 'Додаємо...' : 'Демо-дані'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 rounded-2xl border border-border bg-bg-card p-4 shadow-sm shadow-black/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-semibold text-text">Розумні висновки</h2>
            <p className="mt-1 text-xs text-text-muted">Короткі сигнали по даних, які можна одразу перетворити на дію.</p>
          </div>
          <Link href="/app/goals" className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent">
            Цілі й прогрес
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          {smartInsights.map((insight) => (
            <SmartInsightCard key={insight.title} insight={insight} />
          ))}
        </div>
      </div>

      <AdviceCard advice={advice} loading={loadingAdvice} onRefresh={() => loadAll(true)} />

      {advice && <ScoreRow advice={advice} />}

      <div className="mb-3 mt-5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[16px] font-semibold text-text">Аналітика за 14 днів</h2>
          <p className="mt-1 text-xs text-text-muted">Графіки показують не окремі цифри, а ритм: сон, навантаження, харчування, вагу й настрій.</p>
        </div>
        <Link href="/app/trends" className="rounded-lg border border-border px-3 py-2 text-xs text-text-muted hover:border-accent hover:text-accent">
          Відкрити тренди
        </Link>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Сон, год (14 днів)" empty={!loadingAdvice && sleep.length === 0} actionHref="/app/quick-add">
          <LazyChart><SleepChart sleepAll={sleep} target={settings?.sleepTarget ?? 8} /></LazyChart>
        </ChartCard>
        <ChartCard title="Тренувальне навантаження (14 днів)" empty={!loadingAdvice && workouts.length === 0} actionHref="/app/quick-add">
          <LazyChart><WorkoutChart workoutsAll={workouts} /></LazyChart>
        </ChartCard>
        <ChartCard title="Калорії та білок (14 днів)" empty={!loadingAdvice && nutrition.length === 0} actionHref="/app/quick-add">
          <LazyChart><NutritionChart nutritionAll={nutrition} /></LazyChart>
        </ChartCard>
        <ChartCard title="Тижневий баланс" empty={!loadingAdvice && !hasBalanceScore} actionHref="/app/quick-add">
          <LazyChart><BalanceChart scores={balanceScores} /></LazyChart>
        </ChartCard>
        <ChartCard title="Вага (14 днів)" empty={!loadingAdvice && weight.length === 0} actionHref="/app/quick-add">
          <LazyChart><WeightChart weightAll={weight} days={14} /></LazyChart>
        </ChartCard>
        <ChartCard title="Настрій та енергія (14 днів)" empty={!loadingAdvice && mood.length === 0} actionHref="/app/quick-add">
          <LazyChart><MoodChart moodAll={mood} days={14} /></LazyChart>
        </ChartCard>
      </div>
    </section>
  );
}

function MiniDashboard({
  icon: Icon,
  title,
  subtitle,
  score,
  rows,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  score: number | null | undefined;
  rows: [string, string][];
  tone: 'accent' | 'info' | 'warn' | 'neutral';
}) {
  const toneClass = tone === 'info' ? 'text-info bg-info/10' : tone === 'warn' ? 'text-warn bg-warn/10' : tone === 'neutral' ? 'text-text-muted bg-white/5' : 'text-accent bg-accent/10';
  const progress = score === null || score === undefined ? null : clamp(score);

  return (
    <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm shadow-black/10 transition-colors hover:border-accent/30 hover:bg-bg-elevated">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneClass}`}>
            <Icon size={17} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            <p className="text-[11.5px] text-text-muted">{subtitle}</p>
          </div>
        </div>
        {progress !== null && <span className="rounded-full bg-bg-elevated px-2 py-1 text-xs text-text-muted">{Math.round(progress)}/100</span>}
      </div>
      {progress !== null && (
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg-elevated">
          <div className="h-full rounded-full bg-accent-strong" style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-text-muted">{label}</span>
            <span className="font-semibold text-text">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: 'accent' | 'info' | 'warn' | 'neutral';
}) {
  const toneClass = tone === 'info' ? 'text-info bg-info/10' : tone === 'warn' ? 'text-warn bg-warn/10' : tone === 'neutral' ? 'text-text-muted bg-white/5' : 'text-accent bg-accent/10';
  return (
    <div className="rounded-2xl border border-white/10 bg-bg/25 p-3">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon size={15} />
      </div>
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-text">{value}</div>
    </div>
  );
}

function DashboardShortcut({ icon: Icon, title, text, href }: { icon: LucideIcon; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-border bg-bg-card p-4 shadow-sm shadow-black/10 transition-colors hover:border-accent/40 hover:bg-bg-elevated">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={18} />
        </span>
        <span className="text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">перейти</span>
      </div>
      <div className="text-sm font-semibold text-text">{title}</div>
      <p className="mt-1 text-xs leading-5 text-text-muted">{text}</p>
    </Link>
  );
}

function SmartInsightCard({ insight }: { insight: SmartInsight }) {
  const toneClass =
    insight.tone === 'danger'
      ? 'border-danger/30 bg-danger/10 text-danger'
      : insight.tone === 'warn'
        ? 'border-warn/30 bg-warn/10 text-warn'
        : insight.tone === 'info'
          ? 'border-info/30 bg-info/10 text-info'
          : 'border-accent/30 bg-accent/10 text-accent';

  return (
    <Link href={insight.href} className={`rounded-2xl border p-3.5 transition-colors hover:bg-bg-elevated ${toneClass}`}>
      <Activity size={16} className="mb-2" />
      <div className="text-sm font-semibold text-text">{insight.title}</div>
      <p className="mt-1 text-xs leading-5 text-text-muted">{insight.text}</p>
    </Link>
  );
}

function DashboardAction({
  icon: Icon,
  title,
  text,
  onClick,
  disabled,
  danger,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-2xl border bg-bg-card p-4 text-left shadow-sm shadow-black/10 transition-colors disabled:opacity-60 ${
        danger ? 'border-danger/30 hover:border-danger/60' : 'border-border hover:border-accent/40 hover:bg-bg-elevated'
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${danger ? 'bg-danger/10 text-danger' : 'bg-accent/10 text-accent'}`}>
          <Icon size={18} />
        </span>
        <span className="text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100">{disabled ? 'очищення...' : 'скинути'}</span>
      </div>
      <div className="text-sm font-semibold text-text">{title}</div>
      <p className="mt-1 text-xs leading-5 text-text-muted">{text}</p>
    </button>
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
    <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-border bg-bg-card p-4 shadow-sm shadow-black/10 transition-colors hover:border-accent/25">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[13.5px] font-semibold text-text">{title}</h3>
        {empty && (
          <Link href={actionHref} className="inline-flex items-center gap-1 rounded-lg border border-accent/20 bg-accent/10 px-2 py-1 text-xs text-accent">
            <PlusCircle size={13} />
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

function ChartLoading() {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-xl border border-border bg-bg-elevated/60">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-bg-card">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-accent/60" />
      </div>
    </div>
  );
}

function LazyChart({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || visible) return;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '240px 0px' }
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, [visible]);

  return <div ref={rootRef}>{visible ? children : <ChartLoading />}</div>;
}
