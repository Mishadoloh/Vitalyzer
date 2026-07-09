'use client';

import { AlarmClock, Dumbbell, Egg, Flame, Moon, Scale, Smile, Target, type LucideIcon } from 'lucide-react';
import type { AdviceResult } from '@/lib/types';

function scoreClass(score: number | null | undefined): string {
  if (score === null || score === undefined) return 'text-text';
  if (score >= 75) return 'text-accent-strong';
  if (score >= 50) return 'text-warn';
  return 'text-danger';
}

export default function ScoreRow({ advice }: { advice: AdviceResult }) {
  const s = advice.stats.sleep;
  const w = advice.stats.workouts;
  const n = advice.stats.nutrition;
  const wt = advice.stats.weight;
  const md = advice.stats.mood;

  const items: { label: string; value: string | number; cls: string; icon: LucideIcon }[] = [
    { label: 'Загальна оцінка', value: advice.overallScore ?? '—', cls: scoreClass(advice.overallScore), icon: Target },
    { label: 'Сон, середнє', value: s.avgHours !== null ? `${s.avgHours} год` : '—', cls: scoreClass(s.score), icon: Moon },
    { label: 'Тренування/тижд.', value: `${w.count}/${w.target}`, cls: scoreClass(w.score), icon: Dumbbell },
    { label: 'Калорії/добу', value: n.avgCalories ?? '—', cls: scoreClass(n.score), icon: Flame },
    { label: 'Білок, г/кг', value: n.proteinPerKg ?? '—', cls: 'text-text', icon: Egg },
    { label: 'Вага', value: wt.latestKg !== null ? `${wt.latestKg} кг` : '—', cls: 'text-text', icon: Scale },
    { label: 'Настрій/Енергія', value: md.avgMood !== null ? `${md.avgMood}/${md.avgEnergy ?? '—'}` : '—', cls: 'text-text', icon: Smile },
    { label: 'Дефіцит сну', value: s.debtHours !== null ? `${s.debtHours} год` : '—', cls: 'text-text', icon: AlarmClock },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-border bg-bg-card px-4 py-3.5 transition-colors hover:border-accent/30"
        >
          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-text-muted">
            <item.icon size={13} className="shrink-0 opacity-70" />
            <span>{item.label}</span>
          </div>
          <div className={`text-2xl font-bold ${item.cls}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
