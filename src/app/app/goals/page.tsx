'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, CalendarDays, Dumbbell, Flame, Moon, Scale, Settings, Target, Trophy, Utensils, Zap, type LucideIcon } from 'lucide-react';
import { showToast } from '@/lib/toast';
import type { Settings as UserSettings } from '@/lib/types';

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

function recent<T extends { date: string }>(rows: T[], days = 14): T[] {
  const from = addDays(todayISO(), -(days - 1));
  return rows.filter((entry) => entry.date >= from);
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

function streak(dates: Set<string>): number {
  let cursor = dates.has(todayISO()) ? todayISO() : addDays(todayISO(), -1);
  let count = 0;
  while (dates.has(cursor)) {
    count++;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function goalLabel(goal: UserSettings['goal']) {
  if (goal === 'lose') return 'Схуднення';
  if (goal === 'gain') return 'Набір маси';
  if (goal === 'perform') return 'Спортивний результат';
  return 'Підтримка форми';
}

export default function GoalsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [settingsRes, sleepRes, workoutsRes, nutritionRes, weightRes, moodRes] = await Promise.all([
          fetch('/api/settings').then((response) => response.json()),
          fetch('/api/sleep').then((response) => response.json()),
          fetch('/api/workouts').then((response) => response.json()),
          fetch('/api/nutrition').then((response) => response.json()),
          fetch('/api/weight').then((response) => response.json()),
          fetch('/api/mood').then((response) => response.json()),
        ]);
        setSettings(settingsRes);
        setSleep(sleepRes);
        setWorkouts(workoutsRes);
        setNutrition(nutritionRes);
        setWeight(weightRes);
        setMood(moodRes);
      } catch (e) {
        showToast('Не вдалося завантажити цілі: ' + (e instanceof Error ? e.message : String(e)), true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    if (!settings) return null;
    const recentSleep = recent(sleep);
    const recentWorkouts = recent(workouts);
    const recentNutrition = recent(nutrition);
    const recentWeight = recent(weight).sort((a, b) => a.date.localeCompare(b.date));
    const recentMood = recent(mood);

    const avgSleep = round(average(recentSleep.map((entry) => entry.hours)));
    const avgCalories = round(average(recentNutrition.map((entry) => entry.calories)), 0);
    const avgProtein = round(average(recentNutrition.map((entry) => entry.proteinG)), 0);
    const avgWater = round(average(recentNutrition.map((entry) => entry.waterMl || 0).filter(Boolean)), 0);
    const proteinTarget = Math.round(settings.weightKg * settings.proteinTarget);
    const firstWeight = recentWeight[0]?.weightKg ?? null;
    const latestWeight = recentWeight[recentWeight.length - 1]?.weightKg ?? null;
    const weightDelta = firstWeight !== null && latestWeight !== null ? round(latestWeight - firstWeight) : null;
    const trackingDates = new Set([...sleep.map((entry) => entry.date), ...workouts.map((entry) => entry.date), ...nutrition.map((entry) => entry.date), ...mood.map((entry) => entry.date)]);
    const sleepGoalDates = new Set(sleep.filter((entry) => entry.hours >= settings.sleepTarget - 0.5).map((entry) => entry.date));
    const workoutDates = new Set(workouts.map((entry) => entry.date));
    const bestDay = Array.from(trackingDates)
      .map((date) => ({
        date,
        score:
          (sleep.some((entry) => entry.date === date) ? 1 : 0) +
          (workouts.some((entry) => entry.date === date) ? 1 : 0) +
          (nutrition.some((entry) => entry.date === date) ? 1 : 0) +
          (mood.find((entry) => entry.date === date)?.mood ?? 0) / 5,
      }))
      .sort((a, b) => b.score - a.score)[0]?.date ?? '-';

    const sleepProgress = avgSleep === null ? 0 : clamp((avgSleep / Math.max(1, settings.sleepTarget)) * 100);
    const workoutProgress = clamp((recentWorkouts.length / Math.max(1, settings.workoutsTarget * 2)) * 100);
    const proteinProgress = avgProtein === null ? 0 : clamp((avgProtein / Math.max(1, proteinTarget)) * 100);
    const calorieProgress = avgCalories === null ? 0 : clamp(100 - (Math.abs(avgCalories - settings.calTarget) / Math.max(1, settings.calTarget)) * 220);
    const waterProgress = avgWater === null ? 0 : clamp((avgWater / 2000) * 100);
    const overall = Math.round(average([sleepProgress, workoutProgress, proteinProgress, calorieProgress, waterProgress]) ?? 0);

    return {
      avgSleep,
      avgCalories,
      avgProtein,
      avgWater,
      proteinTarget,
      latestWeight: round(latestWeight),
      weightDelta,
      sleepProgress,
      workoutProgress,
      proteinProgress,
      calorieProgress,
      waterProgress,
      overall,
      activeStreak: streak(trackingDates),
      sleepStreak: streak(sleepGoalDates),
      workoutStreak: streak(workoutDates),
      bestDay,
      avgMood: round(average(recentMood.map((entry) => entry.mood))),
    };
  }, [mood, nutrition, settings, sleep, weight, workouts]);

  if (loading || !settings || !metrics) {
    return (
      <section>
        <h1 className="text-[22px] text-text">Цілі</h1>
        <p className="text-text-muted">Завантаження...</p>
      </section>
    );
  }

  const badges = [
    { title: '5 днів активності', unlocked: metrics.activeStreak >= 5, hint: `${metrics.activeStreak} дн. зараз` },
    { title: 'Сон у ціль', unlocked: metrics.sleepStreak >= 3, hint: `${metrics.sleepStreak} дн. поспіль` },
    { title: 'Рух без пауз', unlocked: metrics.workoutStreak >= 2, hint: `${metrics.workoutStreak} тренув. днів` },
    { title: 'Білок під контролем', unlocked: metrics.proteinProgress >= 90, hint: `${Math.round(metrics.proteinProgress)}%` },
  ];

  return (
    <section className="pb-8">
      <header className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(12,24,26,0.98))] shadow-xl shadow-black/20">
        <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
              <Target size={13} />
              {goalLabel(settings.goal)}
            </span>
            <h1 className="m-0 text-2xl font-bold text-text">Цілі й прогрес</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
              Сон, тренування, білок, вода, калорії й мотивація в одному місці. Тут видно, що вже рухається, а що треба підтягнути.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-bg/30 p-4">
            <div className="text-xs text-text-muted">Загальний прогрес</div>
            <div className="mt-1 text-4xl font-bold text-accent-strong">{metrics.overall}%</div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
              <div className="h-full rounded-full bg-accent-strong" style={{ width: `${metrics.overall}%` }} />
            </div>
            <Link href="/app/settings" className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent underline">
              <Settings size={13} />
              налаштувати цілі
            </Link>
          </div>
        </div>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        <GoalCard icon={Moon} title="Сон" value={`${metrics.avgSleep ?? '-'} год`} progress={metrics.sleepProgress} hint={`ціль ${settings.sleepTarget} год`} />
        <GoalCard icon={Dumbbell} title="Тренування" value={`${recent(workouts).length}/${settings.workoutsTarget * 2}`} progress={metrics.workoutProgress} hint="за 14 днів" />
        <GoalCard icon={Utensils} title="Білок" value={`${metrics.avgProtein ?? '-'} г`} progress={metrics.proteinProgress} hint={`ціль ${metrics.proteinTarget} г`} />
        <GoalCard icon={Flame} title="Калорії" value={`${metrics.avgCalories ?? '-'} ккал`} progress={metrics.calorieProgress} hint={`ціль ${settings.calTarget} ккал`} />
        <GoalCard icon={Zap} title="Вода" value={`${metrics.avgWater ?? '-'} мл`} progress={metrics.waterProgress} hint="орієнтир 2000 мл" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-3xl border border-border bg-bg-card p-4 shadow-xl shadow-black/10">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text">
            <Trophy size={16} className="text-accent" />
            Мотивація
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <MiniStat icon={CalendarDays} label="Активна серія" value={`${metrics.activeStreak} дн.`} />
            <MiniStat icon={Award} label="Найкращий день" value={metrics.bestDay} compact />
            <MiniStat icon={Scale} label="Вага" value={`${metrics.latestWeight ?? '-'} кг`} hint={metrics.weightDelta === null ? 'без тренду' : `${metrics.weightDelta > 0 ? '+' : ''}${metrics.weightDelta} кг`} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {badges.map((badge) => (
              <div key={badge.title} className={`rounded-2xl border p-3 ${badge.unlocked ? 'border-accent/30 bg-accent/10' : 'border-border bg-bg-elevated/60 opacity-75'}`}>
                <div className="flex items-center gap-2 text-sm font-semibold text-text">
                  <Award size={15} className={badge.unlocked ? 'text-accent' : 'text-text-muted'} />
                  {badge.title}
                </div>
                <div className="mt-1 text-xs text-text-muted">{badge.unlocked ? 'відкрито' : badge.hint}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-bg-card p-4 shadow-xl shadow-black/10">
          <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-text">
            <Flame size={16} className="text-warn" />
            Тижневий звіт
          </h2>
          <div className="space-y-3">
            <ReportLine label="Сон" text={metrics.sleepProgress >= 90 ? 'Сон близько до цілі. Тримайте ритм.' : 'Сон нижче цілі. Почніть із одного стабільного часу відбою.'} />
            <ReportLine label="Рух" text={metrics.workoutProgress >= 80 ? 'Активність виглядає стабільно.' : 'Додайте коротке тренування або прогулянку.'} />
            <ReportLine label="Харчування" text={metrics.proteinProgress >= 90 ? 'Білок майже в цілі.' : 'Білка не вистачає до цілі. Додайте білковий прийом їжі.'} />
            <ReportLine label="Настрій" text={metrics.avgMood ? `Середній настрій ${metrics.avgMood}/5.` : 'Додайте кілька записів настрою, щоб бачити зв’язки.'} />
          </div>
        </section>
      </div>
    </section>
  );
}

function GoalCard({ icon: Icon, title, value, progress, hint }: { icon: LucideIcon; title: string; value: string; progress: number; hint: string }) {
  return (
    <div className="rounded-3xl border border-border bg-bg-card p-4 shadow-sm shadow-black/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon size={17} />
        </span>
        <span className="text-xs text-text-muted">{Math.round(progress)}%</span>
      </div>
      <div className="text-xs text-text-muted">{title}</div>
      <div className="mt-1 text-xl font-bold text-text">{value}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-elevated">
        <div className="h-full rounded-full bg-accent-strong" style={{ width: `${clamp(progress)}%` }} />
      </div>
      <div className="mt-2 text-[11px] text-text-muted">{hint}</div>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, hint, compact }: { icon: LucideIcon; label: string; value: string; hint?: string; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-3">
      <Icon size={15} className="mb-2 text-accent" />
      <div className="text-[11px] text-text-muted">{label}</div>
      <div className={`mt-0.5 font-bold text-text ${compact ? 'truncate text-sm' : 'text-lg'}`}>{value}</div>
      {hint && <div className="text-[11px] text-text-muted">{hint}</div>}
    </div>
  );
}

function ReportLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-bg-elevated p-3">
      <div className="text-xs font-semibold text-accent">{label}</div>
      <p className="mt-1 text-sm leading-6 text-text-muted">{text}</p>
    </div>
  );
}
