'use client';

import { Bar, CartesianGrid, Cell, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lastNDates, shortLabel } from '@/lib/chartUtils';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function SleepChart({ sleepAll, target, days = 14 }: { sleepAll: { date: string; hours: number }[]; target: number; days?: number }) {
  const range = lastNDates(days);
  const byDate = Object.fromEntries(sleepAll.map((r) => [r.date, r]));
  const data = range.map((d) => ({
    label: shortLabel(d),
    hours: byDate[d] ? byDate[d].hours : null,
    target,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} interval={Math.floor(days / 8)} />
        <YAxis tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }} />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.hours !== null && d.hours < target - 0.75 ? 'rgba(248,113,113,0.65)' : 'rgba(110,231,183,0.65)'} />
          ))}
        </Bar>
        <Line type="monotone" dataKey="target" stroke="rgba(96,165,250,0.8)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
