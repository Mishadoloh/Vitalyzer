'use client';

import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lastNDates, shortLabel } from '@/lib/chartUtils';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function NutritionChart({
  nutritionAll,
  days = 14,
}: {
  nutritionAll: { date: string; calories: number; proteinG: number }[];
  days?: number;
}) {
  const range = lastNDates(days);
  const byDate = Object.fromEntries(nutritionAll.map((r) => [r.date, r]));
  const data = range.map((d) => ({
    label: shortLabel(d),
    calories: byDate[d] ? byDate[d].calories : null,
    protein: byDate[d] ? byDate[d].proteinG : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} interval={Math.floor(days / 8)} />
        <YAxis yAxisId="left" tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" tick={{ fill: TEXT, fontSize: 10 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }} />
        <Bar yAxisId="left" dataKey="calories" fill="rgba(251,191,36,0.55)" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="protein" stroke="rgba(110,231,183,0.9)" strokeWidth={2} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
