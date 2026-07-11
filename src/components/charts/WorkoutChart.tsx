'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lastNDates, shortLabel } from '@/lib/chartUtils';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function WorkoutChart({ workoutsAll, days = 14 }: { workoutsAll: { date: string; durationMin: number }[]; days?: number }) {
  const range = lastNDates(days);
  const byDate: Record<string, number> = {};
  workoutsAll.forEach((w) => {
    byDate[w.date] = (byDate[w.date] || 0) + (w.durationMin || 0);
  });
  const data = range.map((d) => ({ label: shortLabel(d), minutes: byDate[d] || 0 }));
  const xInterval = Math.max(1, Math.ceil(days / 6) - 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 9 }} axisLine={{ stroke: GRID }} tickLine={false} interval={xInterval} minTickGap={8} />
        <YAxis width={34} tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="minutes" fill="rgba(96,165,250,0.65)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
