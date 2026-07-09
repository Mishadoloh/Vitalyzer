import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSettingsForClient } from '@/lib/settings';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const { userId } = auth;

  const [sleep, workouts, nutrition, weight, mood, settings] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.workoutEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.nutritionEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.moodEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    getSettingsForClient(userId),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    sleep,
    workouts,
    nutrition,
    weight,
    mood,
    settings,
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="vitalyzer-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
