import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await prisma.sleepEntry.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/sleep/:id — edit a single record; only whitelisted fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.hours !== undefined) data.hours = Number(body.hours);
  if (body.quality !== undefined) data.quality = body.quality === null || body.quality === '' ? null : Number(body.quality);
  if (body.bedtime !== undefined) data.bedtime = body.bedtime || null;
  if (body.wakeTime !== undefined) data.wakeTime = body.wakeTime || null;
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Немає полів для оновлення' }, { status: 400 });
  }
  const result = await prisma.sleepEntry.updateMany({ where: { id: params.id, userId: auth.userId }, data });
  if (result.count === 0) return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
