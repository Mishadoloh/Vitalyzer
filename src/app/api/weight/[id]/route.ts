import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await prisma.weightEntry.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/weight/:id — edit a single record; only whitelisted fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.weightKg !== undefined) data.weightKg = Number(body.weightKg);
  if (body.bodyFatPct !== undefined) data.bodyFatPct = body.bodyFatPct === null || body.bodyFatPct === '' ? null : Number(body.bodyFatPct);
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Немає полів для оновлення' }, { status: 400 });
  }
  const result = await prisma.weightEntry.updateMany({ where: { id: params.id, userId: auth.userId }, data });
  if (result.count === 0) return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
