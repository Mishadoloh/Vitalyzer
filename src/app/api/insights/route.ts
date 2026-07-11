import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import { computeInsights, type DailyRecord } from '@/lib/correlations';

export const dynamic = 'force-dynamic';

// GET /api/insights — cross-category correlation findings for the signed-in user.
// Fast enough to compute on demand (in-memory Pearson over a few hundred rows),
// so no caching layer like /api/advice needs.
export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const { userId } = auth;

  const [sleep, workouts, nutrition, mood] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId }, select: { date: true, hours: true, quality: true } }),
    prisma.workoutEntry.findMany({ where: { userId }, select: { date: true, durationMin: true } }),
    prisma.nutritionEntry.findMany({ where: { userId }, select: { date: true, calories: true } }),
    prisma.moodEntry.findMany({ where: { userId }, select: { date: true, mood: true, energy: true, stress: true } }),
  ]);

  // Workouts allow several rows per day — sum minutes into one daily value.
  const workoutByDate = new Map<string, number>();
  for (const w of workouts) {
    workoutByDate.set(w.date, (workoutByDate.get(w.date) ?? 0) + w.durationMin);
  }
  const workoutMinutes: DailyRecord[] = Array.from(workoutByDate, ([date, value]) => ({ date, value }));

  const result = computeInsights({
    sleepHours: sleep.map((r) => ({ date: r.date, value: r.hours })),
    sleepQuality: sleep.filter((r) => r.quality !== null).map((r) => ({ date: r.date, value: r.quality as number })),
    mood: mood.map((r) => ({ date: r.date, value: r.mood })),
    energy: mood.map((r) => ({ date: r.date, value: r.energy })),
    stress: mood.filter((r) => r.stress !== null).map((r) => ({ date: r.date, value: r.stress as number })),
    workoutMinutes,
    calories: nutrition.map((r) => ({ date: r.date, value: r.calories })),
  });

  return NextResponse.json(result);
}
