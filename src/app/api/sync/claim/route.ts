import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';
import { verifyGuestTransferToken } from '@/lib/guest-transfer';

export const dynamic = 'force-dynamic';

function mergeHabitData(left: unknown, right: unknown): Record<string, string[]> {
  const first = left && typeof left === 'object' ? left as Record<string, unknown> : {};
  const second = right && typeof right === 'object' ? right as Record<string, unknown> : {};
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);
  return Object.fromEntries(Array.from(keys).map((key) => {
    const values = [...(Array.isArray(first[key]) ? first[key] as string[] : []), ...(Array.isArray(second[key]) ? second[key] as string[] : [])];
    return [key, Array.from(new Set(values)).sort()];
  }));
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (auth.isGuest) return NextResponse.json({ error: 'Sign in before transferring guest data' }, { status: 400 });
  const body = await req.json();
  const payload = verifyGuestTransferToken(typeof body.token === 'string' ? body.token : '');
  if (!payload || payload.guestUserId === auth.userId) return NextResponse.json({ error: 'Invalid or expired transfer token' }, { status: 400 });

  const guest = await prisma.user.findUnique({ where: { id: payload.guestUserId }, select: { isGuest: true } });
  if (!guest?.isGuest) return NextResponse.json({ ok: true, transferred: false });

  await prisma.$transaction(async (tx) => {
    const sourceId = payload.guestUserId;
    const targetId = auth.userId;
    const [sleep, nutrition, weight, mood, workouts, sourceState, targetState, sourceSettings, targetSettings] = await Promise.all([
      tx.sleepEntry.findMany({ where: { userId: sourceId } }),
      tx.nutritionEntry.findMany({ where: { userId: sourceId } }),
      tx.weightEntry.findMany({ where: { userId: sourceId } }),
      tx.moodEntry.findMany({ where: { userId: sourceId } }),
      tx.workoutEntry.findMany({ where: { userId: sourceId } }),
      tx.syncedHabitState.findUnique({ where: { userId: sourceId } }),
      tx.syncedHabitState.findUnique({ where: { userId: targetId } }),
      tx.settings.findUnique({ where: { userId: sourceId } }),
      tx.settings.findUnique({ where: { userId: targetId } }),
    ]);

    for (const row of sleep) {
      const existing = await tx.sleepEntry.findUnique({ where: { userId_date: { userId: targetId, date: row.date } } });
      if (!existing) await tx.sleepEntry.create({ data: { ...row, id: undefined, userId: targetId } });
      else if (row.updatedAt > existing.updatedAt) await tx.sleepEntry.update({ where: { id: existing.id }, data: { hours: row.hours, quality: row.quality, bedtime: row.bedtime, wakeTime: row.wakeTime } });
    }
    for (const row of nutrition) {
      const existing = await tx.nutritionEntry.findUnique({ where: { userId_date: { userId: targetId, date: row.date } } });
      if (!existing) await tx.nutritionEntry.create({ data: { ...row, id: undefined, userId: targetId } });
      else if (row.updatedAt > existing.updatedAt) await tx.nutritionEntry.update({ where: { id: existing.id }, data: { calories: row.calories, proteinG: row.proteinG, carbsG: row.carbsG, fatG: row.fatG, waterMl: row.waterMl } });
    }
    for (const row of weight) {
      const existing = await tx.weightEntry.findUnique({ where: { userId_date: { userId: targetId, date: row.date } } });
      if (!existing) await tx.weightEntry.create({ data: { ...row, id: undefined, userId: targetId } });
      else if (row.updatedAt > existing.updatedAt) await tx.weightEntry.update({ where: { id: existing.id }, data: { weightKg: row.weightKg, bodyFatPct: row.bodyFatPct } });
    }
    for (const row of mood) {
      const existing = await tx.moodEntry.findUnique({ where: { userId_date: { userId: targetId, date: row.date } } });
      if (!existing) await tx.moodEntry.create({ data: { ...row, id: undefined, userId: targetId } });
      else if (row.updatedAt > existing.updatedAt) await tx.moodEntry.update({ where: { id: existing.id }, data: { mood: row.mood, energy: row.energy, stress: row.stress, notes: row.notes } });
    }

    const targetWorkouts = await tx.workoutEntry.findMany({ where: { userId: targetId } });
    for (const row of workouts) {
      const duplicate = targetWorkouts.some((item) => item.date === row.date && item.type.toLowerCase() === row.type.toLowerCase() && Math.abs(item.durationMin - row.durationMin) < 1);
      if (!duplicate) await tx.workoutEntry.create({ data: { ...row, id: undefined, userId: targetId } });
    }

    if (sourceState || targetState) {
      await tx.syncedHabitState.upsert({
        where: { userId: targetId },
        create: { userId: targetId, data: mergeHabitData(sourceState?.data, targetState?.data) },
        update: { data: mergeHabitData(sourceState?.data, targetState?.data) },
      });
    }
    if (sourceSettings && !targetSettings) await tx.settings.update({ where: { userId: sourceId }, data: { userId: targetId } });
    await tx.progressPhoto.updateMany({ where: { userId: sourceId }, data: { userId: targetId } });
    await tx.user.delete({ where: { id: sourceId } });
  });

  return NextResponse.json({ ok: true, transferred: true });
}
