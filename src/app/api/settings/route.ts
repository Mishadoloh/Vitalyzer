import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSettingsRow, getSettingsForClient } from '@/lib/settings';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const settings = await getSettingsForClient(auth.userId);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const emailDigestAddress = typeof body.emailDigestAddress === 'string' ? body.emailDigestAddress.trim().toLowerCase() : '';
  const emailDigestEnabled = Boolean(body.emailDigestEnabled);
  if (emailDigestEnabled && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDigestAddress)) {
    return NextResponse.json({ error: 'Вкажіть коректну email-адресу для розсилки' }, { status: 400 });
  }
  await getOrCreateSettingsRow(auth.userId);
  await prisma.settings.update({
    where: { userId: auth.userId },
    data: {
      weightKg: Number(body.weightKg) || 70,
      goal: String(body.goal || 'maintain'),
      sleepTarget: Number(body.sleepTarget) || 8,
      calTarget: Number(body.calTarget) || 2200,
      proteinTarget: Number(body.proteinTarget) || 1.8,
      workoutsTarget: parseInt(body.workoutsTarget, 10) || 3,
      emailDigestEnabled,
      emailDigestAddress: emailDigestAddress || null,
      emailDigestFrequency: body.emailDigestFrequency === 'daily' ? 'daily' : 'weekly',
    },
  });
  const settings = await getSettingsForClient(auth.userId);
  return NextResponse.json(settings);
}
