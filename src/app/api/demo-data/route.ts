import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import { getOrCreateSettingsRow } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function isoDaysAgo(daysAgo: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

export async function POST() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;

  const settings = await getOrCreateSettingsRow(auth.userId);
  const dates = Array.from({ length: 14 }, (_, index) => isoDaysAgo(13 - index));

  await prisma.workoutEntry.deleteMany({
    where: {
      userId: auth.userId,
      date: { in: dates },
      type: { startsWith: 'Demo: ' },
    },
  });

  for (const [index, date] of dates.entries()) {
    const wave = Math.sin(index * 0.8);
    const recovery = Math.cos(index * 0.55);
    const workoutDay = [1, 3, 5, 8, 10, 12].includes(index);
    const weightTrend = settings.goal === 'lose' ? -0.07 : settings.goal === 'gain' ? 0.05 : -0.01;

    await prisma.sleepEntry.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      create: {
        userId: auth.userId,
        date,
        hours: Number((settings.sleepTarget - 0.35 + wave * 0.55).toFixed(1)),
        quality: Math.max(2, Math.min(5, Math.round(3.6 + recovery))),
        bedtime: '23:20',
        wakeTime: '07:05',
      },
      update: {
        hours: Number((settings.sleepTarget - 0.35 + wave * 0.55).toFixed(1)),
        quality: Math.max(2, Math.min(5, Math.round(3.6 + recovery))),
        bedtime: '23:20',
        wakeTime: '07:05',
      },
    });

    await prisma.nutritionEntry.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      create: {
        userId: auth.userId,
        date,
        calories: Math.round(settings.calTarget + wave * 180 + (workoutDay ? 140 : -60)),
        proteinG: Math.round(settings.weightKg * settings.proteinTarget + recovery * 12),
        carbsG: Math.round(210 + wave * 28 + (workoutDay ? 36 : 0)),
        fatG: Math.round(68 + recovery * 8),
        waterMl: Math.round(2200 + index * 35 + (workoutDay ? 350 : 0)),
      },
      update: {
        calories: Math.round(settings.calTarget + wave * 180 + (workoutDay ? 140 : -60)),
        proteinG: Math.round(settings.weightKg * settings.proteinTarget + recovery * 12),
        carbsG: Math.round(210 + wave * 28 + (workoutDay ? 36 : 0)),
        fatG: Math.round(68 + recovery * 8),
        waterMl: Math.round(2200 + index * 35 + (workoutDay ? 350 : 0)),
      },
    });

    await prisma.weightEntry.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      create: {
        userId: auth.userId,
        date,
        weightKg: Number((settings.weightKg + (index - 13) * weightTrend + recovery * 0.12).toFixed(1)),
        bodyFatPct: Number((18.5 + recovery * 0.25).toFixed(1)),
      },
      update: {
        weightKg: Number((settings.weightKg + (index - 13) * weightTrend + recovery * 0.12).toFixed(1)),
        bodyFatPct: Number((18.5 + recovery * 0.25).toFixed(1)),
      },
    });

    await prisma.moodEntry.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      create: {
        userId: auth.userId,
        date,
        mood: Math.max(2, Math.min(5, Math.round(3.4 + recovery * 0.8))),
        energy: Math.max(2, Math.min(5, Math.round(3.5 + wave * 0.8))),
        stress: Math.max(1, Math.min(5, Math.round(2.8 - recovery * 0.7))),
        notes: index === dates.length - 1 ? 'Demo: легкий день, більше води і ранній сон.' : null,
      },
      update: {
        mood: Math.max(2, Math.min(5, Math.round(3.4 + recovery * 0.8))),
        energy: Math.max(2, Math.min(5, Math.round(3.5 + wave * 0.8))),
        stress: Math.max(1, Math.min(5, Math.round(2.8 - recovery * 0.7))),
        notes: index === dates.length - 1 ? 'Demo: легкий день, більше води і ранній сон.' : null,
      },
    });

    if (workoutDay) {
      await prisma.workoutEntry.create({
        data: {
          userId: auth.userId,
          date,
          type: index % 2 === 0 ? 'Demo: силове' : 'Demo: біг',
          durationMin: index % 2 === 0 ? 48 : 34,
          calories: index % 2 === 0 ? 330 : 285,
          intensity: recovery > 0 ? 'moderate' : 'easy',
          avgHR: index % 2 === 0 ? 128 : 144,
          distanceKm: index % 2 === 0 ? null : 5.2,
        },
      });
    }
  }

  await prisma.adviceCache.deleteMany({ where: { userId: auth.userId } });

  return NextResponse.json({
    ok: true,
    days: dates.length,
    workouts: 6,
    message: 'Демо-дані додано. Графіки та порада оновляться автоматично.',
  });
}
