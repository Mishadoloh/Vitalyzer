'use client';

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function BalanceChart({
  scores,
}: {
  scores: { sleep: number | null; workouts: number | null; nutrition: number | null };
}) {
  const data = [
    { subject: 'Сон', value: scores.sleep ?? 0 },
    { subject: 'Тренування', value: scores.workouts ?? 0 },
    { subject: 'Харчування', value: scores.nutrition ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke={GRID} />
        <PolarAngleAxis dataKey="subject" tick={{ fill: TEXT, fontSize: 11 }} />
        <Radar dataKey="value" stroke="rgba(110,231,183,0.9)" fill="rgba(110,231,183,0.25)" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
