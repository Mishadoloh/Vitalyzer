import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import type { EntryType } from '@/lib/types';

export const dynamic = 'force-dynamic';

const COLUMNS: Record<EntryType, string[]> = {
  sleep: ['date', 'hours', 'quality', 'bedtime', 'wakeTime'],
  workouts: ['date', 'type', 'durationMin', 'calories', 'intensity', 'avgHR', 'distanceKm'],
  nutrition: ['date', 'calories', 'proteinG', 'carbsG', 'fatG', 'waterMl'],
  weight: ['date', 'weightKg', 'bodyFatPct'],
  mood: ['date', 'mood', 'energy', 'stress', 'notes'],
};

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;

  const type = params.type as EntryType;
  const order = { orderBy: { date: 'asc' as const } };
  let rows: Record<string, unknown>[];

  if (type === 'sleep') {
    rows = await prisma.sleepEntry.findMany({ where: { userId: auth.userId }, ...order });
  } else if (type === 'workouts') {
    rows = await prisma.workoutEntry.findMany({ where: { userId: auth.userId }, ...order });
  } else if (type === 'nutrition') {
    rows = await prisma.nutritionEntry.findMany({ where: { userId: auth.userId }, ...order });
  } else if (type === 'weight') {
    rows = await prisma.weightEntry.findMany({ where: { userId: auth.userId }, ...order });
  } else if (type === 'mood') {
    rows = await prisma.moodEntry.findMany({ where: { userId: auth.userId }, ...order });
  } else {
    return NextResponse.json({ error: `Невідомий тип: ${params.type}` }, { status: 400 });
  }

  const columns = COLUMNS[type];
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(','));
  }

  const csv = `\uFEFF${lines.join('\r\n')}`;

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="vitalyzer-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
