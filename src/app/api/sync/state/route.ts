import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
const HABIT_IDS = ['water', 'steps', 'protein', 'sleepEarly', 'stretch', 'walk'] as const;

function sanitizeHabits(value: unknown): Record<string, string[]> {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return Object.fromEntries(HABIT_IDS.map((id) => {
    const dates = Array.isArray(source[id]) ? source[id] : [];
    return [id, Array.from(new Set(dates.filter((date): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)))).slice(-730)];
  }));
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const state = await prisma.syncedHabitState.findUnique({ where: { userId: auth.userId } });
  return NextResponse.json({ habits: sanitizeHabits(state?.data ?? {}) });
}

export async function PUT(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const habits = sanitizeHabits(body.habits);
  await prisma.syncedHabitState.upsert({
    where: { userId: auth.userId },
    create: { userId: auth.userId, data: habits },
    update: { data: habits },
  });
  return NextResponse.json({ habits });
}
