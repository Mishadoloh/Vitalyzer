import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from './auth';
import { prisma } from './prisma';

export type AppUser = { userId: string; isGuest: boolean; error?: undefined };
export type AuthError = { userId?: undefined; error: NextResponse };

export async function requireUser(): Promise<AppUser | AuthError> {
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id;
  if (!sessionUserId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { isGuest: true } });
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  return { userId: sessionUserId, isGuest: user.isGuest };
}

// Compatibility wrapper for existing routes. Core tracking is available to
// every authenticated account; paid-only endpoints enforce their own limits.
export async function requireSubscribedUser(): Promise<AppUser | AuthError> {
  return requireUser();
}
