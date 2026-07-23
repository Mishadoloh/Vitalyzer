import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getSettingsForClient } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const where = { userId: auth.userId };
  const [sleep, workouts, nutrition, weight, mood, settings] = await Promise.all([
    prisma.sleepEntry.findMany({ where, orderBy: { date: 'desc' } }),
    prisma.workoutEntry.findMany({ where, orderBy: { date: 'desc' } }),
    prisma.nutritionEntry.findMany({ where, orderBy: { date: 'desc' } }),
    prisma.weightEntry.findMany({ where, orderBy: { date: 'desc' } }),
    prisma.moodEntry.findMany({ where, orderBy: { date: 'desc' } }),
    getSettingsForClient(auth.userId),
  ]);

  return NextResponse.json(
    { sleep, workouts, nutrition, weight, mood, settings },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
