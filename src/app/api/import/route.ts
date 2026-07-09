import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import type {
  EntryType,
  ImportResult,
  MoodRecordInput,
  NutritionRecordInput,
  SleepRecordInput,
  WeightRecordInput,
  WorkoutRecordInput,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

// POST /api/import  { type: 'sleep' | 'workouts' | 'nutrition' | 'weight' | 'mood', records: [...] }
// Upserts parsed+mapped records into the DB, scoped to the signed-in user. Mirrors the
// dedupe behaviour of the original client-only version: sleep/nutrition/weight/mood
// keep one aggregated row per date (re-import of the same date overwrites it),
// workouts allow several rows per day and only merge near-identical duplicates
// (same date+type+duration).
export async function POST(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;

  const body = await req.json();
  const type = body.type as EntryType;
  const records = body.records as unknown[];

  if (!type || !Array.isArray(records) || !records.length) {
    return NextResponse.json({ error: 'Потрібні type та непорожній масив records' }, { status: 400 });
  }

  let result: ImportResult;

  if (type === 'sleep') {
    result = await importSleep(auth.userId, records as SleepRecordInput[]);
  } else if (type === 'nutrition') {
    result = await importNutrition(auth.userId, records as NutritionRecordInput[]);
  } else if (type === 'workouts') {
    result = await importWorkouts(auth.userId, records as WorkoutRecordInput[]);
  } else if (type === 'weight') {
    result = await importWeight(auth.userId, records as WeightRecordInput[]);
  } else if (type === 'mood') {
    result = await importMood(auth.userId, records as MoodRecordInput[]);
  } else {
    return NextResponse.json({ error: 'Невідомий тип: ' + type }, { status: 400 });
  }

  return NextResponse.json(result);
}

async function importSleep(userId: string, records: SleepRecordInput[]): Promise<ImportResult> {
  let added = 0;
  let updated = 0;
  for (const r of records) {
    const existing = await prisma.sleepEntry.findUnique({ where: { userId_date: { userId, date: r.date } } });
    await prisma.sleepEntry.upsert({
      where: { userId_date: { userId, date: r.date } },
      create: {
        userId,
        date: r.date,
        hours: r.hours,
        quality: r.quality ?? null,
        bedtime: r.bedtime ?? null,
        wakeTime: r.wakeTime ?? null,
      },
      update: {
        hours: r.hours,
        quality: r.quality ?? null,
        bedtime: r.bedtime ?? null,
        wakeTime: r.wakeTime ?? null,
      },
    });
    if (existing) updated++;
    else added++;
  }
  const total = await prisma.sleepEntry.count({ where: { userId } });
  return { added, updated, skipped: 0, total };
}

async function importNutrition(userId: string, records: NutritionRecordInput[]): Promise<ImportResult> {
  let added = 0;
  let updated = 0;
  for (const r of records) {
    const existing = await prisma.nutritionEntry.findUnique({ where: { userId_date: { userId, date: r.date } } });
    await prisma.nutritionEntry.upsert({
      where: { userId_date: { userId, date: r.date } },
      create: {
        userId,
        date: r.date,
        calories: r.calories,
        proteinG: r.proteinG,
        carbsG: r.carbsG,
        fatG: r.fatG,
        waterMl: r.waterMl,
      },
      update: {
        calories: r.calories,
        proteinG: r.proteinG,
        carbsG: r.carbsG,
        fatG: r.fatG,
        waterMl: r.waterMl,
      },
    });
    if (existing) updated++;
    else added++;
  }
  const total = await prisma.nutritionEntry.count({ where: { userId } });
  return { added, updated, skipped: 0, total };
}

async function importWorkouts(userId: string, records: WorkoutRecordInput[]): Promise<ImportResult> {
  let added = 0;
  let updated = 0;

  const dates = Array.from(new Set(records.map((r) => r.date)));
  const existingRows = await prisma.workoutEntry.findMany({ where: { userId, date: { in: dates } } });

  for (const r of records) {
    const match = existingRows.find(
      (e) =>
        e.date === r.date &&
        e.type.toLowerCase() === (r.type || '').toLowerCase() &&
        Math.abs(e.durationMin - (r.durationMin || 0)) < 1
    );
    if (match) {
      await prisma.workoutEntry.update({
        where: { id: match.id },
        data: {
          calories: r.calories ?? null,
          intensity: r.intensity ?? null,
          avgHR: r.avgHR ?? null,
          distanceKm: r.distanceKm ?? null,
        },
      });
      updated++;
    } else {
      const created = await prisma.workoutEntry.create({
        data: {
          userId,
          date: r.date,
          type: r.type || 'Тренування',
          durationMin: r.durationMin || 0,
          calories: r.calories ?? null,
          intensity: r.intensity ?? null,
          avgHR: r.avgHR ?? null,
          distanceKm: r.distanceKm ?? null,
        },
      });
      existingRows.push(created); // avoid re-matching within the same batch
      added++;
    }
  }

  const total = await prisma.workoutEntry.count({ where: { userId } });
  return { added, updated, skipped: 0, total };
}

async function importWeight(userId: string, records: WeightRecordInput[]): Promise<ImportResult> {
  let added = 0;
  let updated = 0;
  for (const r of records) {
    const existing = await prisma.weightEntry.findUnique({ where: { userId_date: { userId, date: r.date } } });
    await prisma.weightEntry.upsert({
      where: { userId_date: { userId, date: r.date } },
      create: { userId, date: r.date, weightKg: r.weightKg, bodyFatPct: r.bodyFatPct ?? null },
      update: { weightKg: r.weightKg, bodyFatPct: r.bodyFatPct ?? null },
    });
    if (existing) updated++;
    else added++;
  }
  const total = await prisma.weightEntry.count({ where: { userId } });
  return { added, updated, skipped: 0, total };
}

async function importMood(userId: string, records: MoodRecordInput[]): Promise<ImportResult> {
  let added = 0;
  let updated = 0;
  for (const r of records) {
    const existing = await prisma.moodEntry.findUnique({ where: { userId_date: { userId, date: r.date } } });
    await prisma.moodEntry.upsert({
      where: { userId_date: { userId, date: r.date } },
      create: { userId, date: r.date, mood: r.mood, energy: r.energy, stress: r.stress ?? null, notes: r.notes ?? null },
      update: { mood: r.mood, energy: r.energy, stress: r.stress ?? null, notes: r.notes ?? null },
    });
    if (existing) updated++;
    else added++;
  }
  const total = await prisma.moodEntry.count({ where: { userId } });
  return { added, updated, skipped: 0, total };
}
