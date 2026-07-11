import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await prisma.nutritionEntry.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/nutrition/:id — edit a single record; only whitelisted fields.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of ['calories', 'proteinG', 'carbsG', 'fatG', 'waterMl'] as const) {
    if (body[field] !== undefined) data[field] = Number(body[field]) || 0;
  }
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: 'Немає полів для оновлення' }, { status: 400 });
  }
  const result = await prisma.nutritionEntry.updateMany({ where: { id: params.id, userId: auth.userId }, data });
  if (result.count === 0) return NextResponse.json({ error: 'Запис не знайдено' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
