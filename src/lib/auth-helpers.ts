import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type AppUser = { userId: string; isGuest: boolean; error?: undefined };
export type AuthError = { userId?: undefined; error: NextResponse };

// Used by every API route: the whole app is gated behind an active Stripe
// subscription, while anonymous guest accounts are allowed to try the app.
export async function requireSubscribedUser(): Promise<AppUser | AuthError> {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!sessionUserId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { isGuest: true, subscriptionStatus: true },
  });

  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (user.isGuest) {
    return { userId: sessionUserId, isGuest: true };
  }

  if (user?.subscriptionStatus !== 'active' && user?.subscriptionStatus !== 'trialing') {
    return { error: NextResponse.json({ error: 'Потрібна активна підписка' }, { status: 402 }) };
  }

  return { userId: sessionUserId, isGuest: false };
}
