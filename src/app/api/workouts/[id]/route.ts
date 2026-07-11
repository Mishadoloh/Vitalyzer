import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await prisma.workoutEntry.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/workouts/:id — edit a single record; only whitelisted fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.type !== undefined) data.type = String(body.type || 'Тренування');
  if (body.durationMin !== undefined) data.durationMin = Number(body.durationMin) || 0;
  if (body.calories !== undefined) data.calories = body.calories === null || body.calories === '' ? null : Number(body.calories);
  if (body.avgHR !== undefined) data.avgHR = body.avgHR === null || body.avgHR === '' ? null : Number(body.avgHR);
  if (body.distanceKm !== undefined) data.distanceKm = body.distanceKm === null || body.distanceKm === '' ? null : Number(body.distanceKm);
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Немає полів для оновлення' }, { status: 400 });
  }
  const result = await prisma.workoutEntry.updateMany({ where: { id: params.id, userId: auth.userId }, data });
  if (result.count === 0) return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
