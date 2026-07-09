import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// POST /api/wipe — deletes ALL of the signed-in user's data (sleep, workouts,
// nutrition, weight, mood, settings, advice cache). The client is expected to
// confirm with the user before calling this.
export async function POST() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const { userId } = auth;

  await prisma.$transaction([
    prisma.sleepEntry.deleteMany({ where: { userId } }),
    prisma.workoutEntry.deleteMany({ where: { userId } }),
    prisma.nutritionEntry.deleteMany({ where: { userId } }),
    prisma.weightEntry.deleteMany({ where: { userId } }),
    prisma.moodEntry.deleteMany({ where: { userId } }),
    prisma.adviceCache.deleteMany({ where: { userId } }),
    prisma.settings.deleteMany({ where: { userId } }),
  ]);
  return NextResponse.json({ ok: true });
}
