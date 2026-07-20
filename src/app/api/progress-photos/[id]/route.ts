import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  const photo = await prisma.progressPhoto.findFirst({ where: { id: params.id, userId: auth.userId }, select: { image: true, mimeType: true } });
  if (!photo) return NextResponse.json({ error: 'Фото не знайдено' }, { status: 404 });
  return new NextResponse(new Uint8Array(photo.image), {
    headers: {
      'Content-Type': photo.mimeType,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  await prisma.progressPhoto.deleteMany({ where: { id: params.id, userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
