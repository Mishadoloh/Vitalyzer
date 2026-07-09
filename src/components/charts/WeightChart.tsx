'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lastNDates, shortLabel } from '@/lib/chartUtils';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function WeightChart({ weightAll, days = 30 }: { weightAll: { date: string; weightKg: number }[]; days?: number }) {
  const range = lastNDates(days);
  const byDate = Object.fromEntries(weightAll.map((r) => [r.date, r]));
  const data = range.map((d) => ({
    label: shortLabel(d),
    weightKg: byDate[d] ? byDate[d].weightKg : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} interval={Math.floor(days / 8)} />
        <YAxis domain={['auto', 'auto']} tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }} />
        <Line type="monotone" dataKey="weightKg" stroke="rgba(96,165,250,0.9)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
