import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth-helpers';
import { createGuestTransferToken } from '@/lib/guest-transfer';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireUser();
  if (auth.error) return auth.error;
  if (!auth.isGuest) return NextResponse.json({ error: 'Only guest accounts can create transfer tokens' }, { status: 403 });
  return NextResponse.json({ token: createGuestTransferToken(auth.userId) });
}
