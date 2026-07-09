'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function DashboardPage() {
  const [advice, setAdvice] = useState<AdviceResult | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(true);
  const [sleep, setSleep] = useState<SleepRow[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [nutrition, setNutrition] = useState<NutritionRow[]>([]);
  const [weight, setWeight] = useState<WeightRow[]>([]);
  const [mood, setMood] = useState<MoodRow[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' })
    );
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

  return (
    <section>
      <header className="mb-4.5 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="m-0 text-[22px]">Щоденний дашборд</h1>
        <div className="flex items-center gap-3">
          <div className="text-sm text-text-muted">{today}</div>
          <Link href="/app/quick-add" className="rounded-lg bg-accent-strong px-3.5 py-1.5 text-[13px] font-semibold text-[#06281c]">
            + Швидкий запис
          </Link>
        </div>
      </header>

      <AdviceCard advice={advice} loading={loadingAdvice} onRefresh={() => loadAll(true)} />

      {advice && <ScoreRow advice={advice} />}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Сон, год (14 днів)</h3>
          <SleepChart sleepAll={sleep} target={settings?.sleepTarget ?? 8} />
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Тренувальне навантаження (14 днів)</h3>
          <WorkoutChart workoutsAll={workouts} />
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Калорії та білок (14 днів)</h3>
          <NutritionChart nutritionAll={nutrition} />
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Тижневий баланс</h3>
          {advice && <BalanceChart scores={advice.scores} />}
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Вага (14 днів)</h3>
          <WeightChart weightAll={weight} days={14} />
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4">
          <h3 className="mb-2.5 text-[13.5px] font-semibold text-text-muted">Настрій та енергія (14 днів)</h3>
          <MoodChart moodAll={mood} days={14} />
        </div>
      </div>
    </section>
  );
}
