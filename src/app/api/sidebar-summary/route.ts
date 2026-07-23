import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const where = { userId: auth.userId };
  const [sleep, workouts, nutrition] = await Promise.all([
    prisma.sleepEntry.count({ where }),
    prisma.workoutEntry.count({ where }),
    prisma.nutritionEntry.count({ where }),
  ]);

  return NextResponse.json(
    { sleep, workouts, nutrition },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
