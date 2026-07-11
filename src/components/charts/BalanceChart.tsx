'use client';

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const GRID = 'rgba(255,255,255,0.08)';
const TEXT = '#9ca3b8';

export default function BalanceChart({
  scores,
}: {
  scores: { sleep: number | null; workouts: number | null; nutrition: number | null };
}) {
  const hasAnyScore = [scores.sleep, scores.workouts, scores.nutrition].some((value) => value !== null);
  const data = [
    { subject: 'Сон', full: 'Сон', value: scores.sleep ?? 0 },
    { subject: 'Рух', full: 'Тренування', value: scores.workouts ?? 0 },
    { subject: 'Їжа', full: 'Харчування', value: scores.nutrition ?? 0 },
  ];

  if (!hasAnyScore) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed border-border bg-bg-elevated/40 px-5 text-center">
        <div>
          <div className="text-sm font-semibold text-text">Недостатньо даних для балансу</div>
          <p className="mt-1 max-w-xs text-xs leading-5 text-text-muted">
            Додайте сон, тренування і харчування за цей тиждень або заповніть демо-дані.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="66%" margin={{ top: 12, right: 28, bottom: 12, left: 28 }}>
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: TEXT, fontSize: 11 }} />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Tooltip
          formatter={(value) => [`${value}/100`, 'Оцінка']}
          labelFormatter={(label) => data.find((item) => item.subject === label)?.full ?? label}
          contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }}
        />
        <Radar dataKey="value" stroke="rgba(110,231,183,0.95)" fill="rgba(110,231,183,0.28)" fillOpacity={0.72} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
