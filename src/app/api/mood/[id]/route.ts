import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await prisma.moodEntry.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/mood/:id — edit a single record; only whitelisted fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const clamp15 = (v: unknown) => Math.max(1, Math.min(5, Math.round(Number(v))));
  const data: Record<string, unknown> = {};
  if (body.mood !== undefined) data.mood = clamp15(body.mood);
  if (body.energy !== undefined) data.energy = clamp15(body.energy);
  if (body.stress !== undefined) data.stress = body.stress === null || body.stress === '' ? null : clamp15(body.stress);
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Немає полів для оновлення' }, { status: 400 });
  }
  const result = await prisma.moodEntry.updateMany({ where: { id: params.id, userId: auth.userId }, data });
  if (result.count === 0) return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
