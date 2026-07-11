'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { lastNDates, shortLabel } from '@/lib/chartUtils';

const GRID = 'rgba(255,255,255,0.06)';
const TEXT = '#8a90a3';

export default function MoodChart({
  moodAll,
  days = 30,
}: {
  moodAll: { date: string; mood: number; energy: number }[];
  days?: number;
}) {
  const range = lastNDates(days);
  const byDate = Object.fromEntries(moodAll.map((r) => [r.date, r]));
  const data = range.map((d) => ({
    label: shortLabel(d),
    mood: byDate[d] ? byDate[d].mood : null,
    energy: byDate[d] ? byDate[d].energy : null,
  }));
  const xInterval = Math.max(1, Math.ceil(days / 6) - 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: TEXT, fontSize: 9 }} axisLine={{ stroke: GRID }} tickLine={false} interval={xInterval} minTickGap={8} />
        <YAxis width={30} domain={[1, 5]} tick={{ fill: TEXT, fontSize: 10 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <Tooltip contentStyle={{ background: '#161922', border: '1px solid #2a2f3d', borderRadius: 8, fontSize: 12 }} />
        <Line type="monotone" dataKey="mood" stroke="rgba(110,231,183,0.9)" strokeWidth={2} dot={false} connectNulls />
        <Line type="monotone" dataKey="energy" stroke="rgba(251,191,36,0.9)" strokeWidth={2} dot={false} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  );
}
