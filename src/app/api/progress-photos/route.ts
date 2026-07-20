import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
const MAX_PHOTO_BYTES = 2_500_000;

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const photos = await prisma.progressPhoto.findMany({
    where: { userId: auth.userId },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    select: { id: true, date: true, note: true, weightKg: true, mimeType: true, createdAt: true },
  });
  return NextResponse.json(photos.map((photo) => ({ ...photo, imageUrl: `/api/progress-photos/${photo.id}` })));
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const form = await req.formData();
  const file = form.get('image');
  const id = String(form.get('id') || '');
  const date = String(form.get('date') || '');
  if (!(file instanceof File) || !file.type.startsWith('image/')) return NextResponse.json({ error: 'Потрібне зображення' }, { status: 400 });
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: 'Некоректні дані фото' }, { status: 400 });
  if (file.size > MAX_PHOTO_BYTES) return NextResponse.json({ error: 'Фото має бути менше 2.5 МБ' }, { status: 413 });
  const weightValue = Number(form.get('weightKg'));
  await prisma.progressPhoto.upsert({
    where: { id },
    create: {
      id,
      userId: auth.userId,
      date,
      note: String(form.get('note') || '').trim().slice(0, 500),
      weightKg: Number.isFinite(weightValue) && weightValue > 0 ? weightValue : null,
      mimeType: file.type,
      image: Buffer.from(await file.arrayBuffer()),
      createdAt: new Date(String(form.get('createdAt') || Date.now())),
    },
    update: {},
  });
  return NextResponse.json({ ok: true });
}
