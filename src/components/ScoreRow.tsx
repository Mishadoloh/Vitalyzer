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
  const sleep = advice.stats.sleep;
  const workouts = advice.stats.workouts;
  const nutrition = advice.stats.nutrition;
  const weight = advice.stats.weight;
  const mood = advice.stats.mood;

  const items: { label: string; value: string | number; cls: string; icon: LucideIcon }[] = [
    { label: 'Загальна оцінка', value: advice.overallScore ?? '-', cls: scoreClass(advice.overallScore), icon: Target },
    { label: 'Сон, середнє', value: sleep.avgHours !== null ? `${sleep.avgHours} год` : '-', cls: scoreClass(sleep.score), icon: Moon },
    { label: 'Тренування/тижд.', value: `${workouts.count}/${workouts.target}`, cls: scoreClass(workouts.score), icon: Dumbbell },
    { label: 'Калорії/добу', value: nutrition.avgCalories ?? '-', cls: scoreClass(nutrition.score), icon: Flame },
    { label: 'Білок, г/кг', value: nutrition.proteinPerKg ?? '-', cls: 'text-text', icon: Egg },
    { label: 'Вага', value: weight.latestKg !== null ? `${weight.latestKg} кг` : '-', cls: 'text-text', icon: Scale },
    { label: 'Настрій/енергія', value: mood.avgMood !== null ? `${mood.avgMood}/${mood.avgEnergy ?? '-'}` : '-', cls: 'text-text', icon: Smile },
    { label: 'Дефіцит сну', value: sleep.debtHours !== null ? `${sleep.debtHours} год` : '-', cls: 'text-text', icon: AlarmClock },
  ];

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-border bg-bg-card px-4 py-3.5 transition-colors hover:border-accent/30">
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
