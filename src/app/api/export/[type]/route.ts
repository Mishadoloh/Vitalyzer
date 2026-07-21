import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import type { EntryType } from '@/lib/types';
import { rowsToCsv } from '@/lib/backup';

export const dynamic = 'force-dynamic';

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

  const csv = rowsToCsv(type, rows);

  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="metrivyn-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
