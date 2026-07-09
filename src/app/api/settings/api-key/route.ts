import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOrCreateSettingsRow, getSettingsForClient } from '@/lib/settings';
import { requireSubscribedUser } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function PUT(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const body = await req.json();
  const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : '';
  await getOrCreateSettingsRow(auth.userId);
  await prisma.settings.update({
    where: { userId: auth.userId },
    data: {
      anthropicApiKey: apiKey || null,
      aiModel: typeof body.aiModel === 'string' && body.aiModel.trim() ? body.aiModel.trim() : null,
    },
  });
  return NextResponse.json(await getSettingsForClient(auth.userId));
}

export async function DELETE() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  await getOrCreateSettingsRow(auth.userId);
  await prisma.settings.update({ where: { userId: auth.userId }, data: { anthropicApiKey: null } });
  return NextResponse.json(await getSettingsForClient(auth.userId));
}
