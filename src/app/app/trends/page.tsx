'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Flame, TrendingDown, TrendingUp, Trophy, Zap, type LucideIcon } from 'lucide-react';
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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Streak counting backward from today (or yesterday if today has no entry yet).
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
  let prev: string | null = null;
  for (const d of sorted) {
    if (prev && addDays(prev, 1) === d) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

function DeltaBadge({ value, unit, invertGood }: { value: number | null; unit: string; invertGood?: boolean }) {
  if (value === null || Math.abs(value) < 0.05) return <span className="text-text-muted">без змін</span>;
  const positive = value > 0;
  const good = invertGood ? !positive : positive;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 ${good ? 'text-accent-strong' : 'text-danger'}`}>
      <Icon size={14} />
      {Math.abs(Math.round(value * 10) / 10)} {unit}
    </span>
  );
}

function StreakCard({
  icon: Icon,
  iconColor,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string | number;
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

export default function TrendsPage() {
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [adviceRes, settingsRes, sleepRes, workoutsRes, weightRes, moodRes] = await Promise.all([
        fetch('/api/advice').then((r) => r.json()),
        fetch('/api/settings').then((r) => r.json()),
        fetch('/api/sleep').then((r) => r.json()),
        fetch('/api/workouts').then((r) => r.json()),
        fetch('/api/weight').then((r) => r.json()),
        fetch('/api/mood').then((r) => r.json()),
      ]);
      setAdvice(adviceRes);
      setSettings(settingsRes);
      setSleep(sleepRes);
      setWorkouts(workoutsRes);
      setWeight(weightRes);
      setMood(moodRes);
    } catch (e) {
      showToast('Не вдалося завантажити тренди: ' + (e instanceof Error ? e.message : String(e)), true);
    } finally {
      setLoading(false);
    }
  }

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

  const sleepGoalDates = new Set(sleep.filter((r) => r.hours >= settings.sleepTarget - 0.5).map((r) => r.date));
  const trackingDates = new Set([...sleep.map((r) => r.date), ...workouts.map((r) => r.date)]);
  const workoutDates = new Set(workouts.map((r) => r.date));

  const s = advice?.stats.sleep;
  const w = advice?.stats.workouts;
  const n = advice?.stats.nutrition;
  const wt = advice?.stats.weight;
  const md = advice?.stats.mood;

  return (
    <section>
      <header className="mb-4.5">
        <h1 className="m-0 text-[22px]">Тренди та серії</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StreakCard
          icon={Flame}
          iconColor="#fbbf24"
          label="Серія: ціль сну"
          value={`${currentStreak(sleepGoalDates)} дн.`}
          hint={`рекорд ${longestStreak(sleepGoalDates)} дн.`}
        />
        <StreakCard
          icon={Zap}
          iconColor="#6ee7b7"
          label="Серія: активний трекінг"
          value={`${currentStreak(trackingDates)} дн.`}
          hint={`рекорд ${longestStreak(trackingDates)} дн.`}
        />
        <StreakCard
          icon={CalendarClock}
          iconColor="#60a5fa"
          label="Днів з останнього тренування"
          value={w?.daysSinceLast ?? '—'}
          hint={`рекорд серії тренувань ${longestStreak(workoutDates)} дн.`}
        />
        <StreakCard
          icon={Trophy}
          iconColor="#34d399"
          label="Загальна оцінка"
          value={`${advice?.overallScore ?? '—'}/100`}
          hint={advice?.tag ?? ''}
        />
      </div>

      <h2 className="mb-2.5 mt-6 text-[15px] font-semibold">Тиждень до тижня</h2>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="border-b border-border bg-bg-elevated px-3 py-2.5 text-left font-semibold text-text-muted">Показник</th>
              <th className="border-b border-border bg-bg-elevated px-3 py-2.5 text-left font-semibold text-text-muted">Цей тиждень</th>
              <th className="border-b border-border bg-bg-elevated px-3 py-2.5 text-left font-semibold text-text-muted">Минулий тиждень</th>
              <th className="border-b border-border bg-bg-elevated px-3 py-2.5 text-left font-semibold text-text-muted">Зміна</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-b border-border px-3 py-2.5">Сон, год/добу</td>
              <td className="border-b border-border px-3 py-2.5">{s?.avgHours ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">{s?.prevAvgHours ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">
                <DeltaBadge value={s?.avgHours != null && s?.prevAvgHours != null ? s.avgHours - s.prevAvgHours : null} unit="год" />
              </td>
            </tr>
            <tr>
              <td className="border-b border-border px-3 py-2.5">Тренувань</td>
              <td className="border-b border-border px-3 py-2.5">{w?.count ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">{w?.prevCount ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">
                <DeltaBadge value={w?.count != null && w?.prevCount != null ? w.count - w.prevCount : null} unit="" />
              </td>
            </tr>
            <tr>
              <td className="border-b border-border px-3 py-2.5">Калорії, ккал/добу</td>
              <td className="border-b border-border px-3 py-2.5">{n?.avgCalories ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">{n?.prevAvgCalories ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">
                <DeltaBadge value={n?.avgCalories != null && n?.prevAvgCalories != null ? n.avgCalories - n.prevAvgCalories : null} unit="ккал" />
              </td>
            </tr>
            <tr>
              <td className="border-b border-border px-3 py-2.5">Вага, кг</td>
              <td className="border-b border-border px-3 py-2.5">{wt?.latestKg ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">{wt?.weekAgoKg ?? '—'}</td>
              <td className="border-b border-border px-3 py-2.5">
                <DeltaBadge value={wt?.trendKgPerWeek ?? null} unit="кг" invertGood={settings.goal === 'lose'} />
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2.5">Настрій, /5</td>
              <td className="px-3 py-2.5">{md?.avgMood ?? '—'}</td>
              <td className="px-3 py-2.5">{md?.prevAvgMood ?? '—'}</td>
              <td className="px-3 py-2.5">
                <DeltaBadge value={md?.avgMood != null && md?.prevAvgMood != null ? md.avgMood - md.prevAvgMood : null} unit="" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Вага (30 днів)</h3>
          <WeightChart weightAll={weight} />
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Настрій та енергія (30 днів)</h3>
          <MoodChart moodAll={mood} />
        </div>
      </div>
    </section>
  );
}
