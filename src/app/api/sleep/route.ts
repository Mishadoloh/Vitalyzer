import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const entries = await prisma.sleepEntry.findMany({ where: { userId: auth.userId }, orderBy: { date: 'desc' } });
  return NextResponse.json(entries);
}

// DELETE /api/sleep?all=true — clears the whole category (used by "Очистити цю категорію").
export async function DELETE(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const all = req.nextUrl.searchParams.get('all');
  if (all !== 'true') {
    return NextResponse.json({ error: 'Missing ?all=true confirmation' }, { status: 400 });
  }
  await prisma.sleepEntry.deleteMany({ where: { userId: auth.userId } });
  return NextResponse.json({ ok: true });
}
