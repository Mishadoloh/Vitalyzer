import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-access';
import { prisma } from '@/lib/prisma';
import { SUSPENSION_PROVIDER } from '@/lib/user-access';

type RouteContext = { params: { id: string } };
type UserAction =
  | { action: 'suspend' }
  | { action: 'restore' }
  | { action: 'setPlan'; plan: 'free' | 'pro' | 'trial' };

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}

async function getAdmin() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; email?: string | null } | undefined;
  if (!user?.id || !isAdminEmail(user.email)) return null;
  return user;
}

function error(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request)) return error('Invalid request origin', 403);
  const admin = await getAdmin();
  if (!admin) return error('Forbidden', 403);

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!target) return error('User not found', 404);

  let body: UserAction;
  try {
    body = await request.json() as UserAction;
  } catch {
    return error('Invalid JSON body', 400);
  }

  if ((body.action === 'suspend' || body.action === 'restore') && target.id === admin.id) {
    return error('You cannot change access for your own administrator account', 400);
  }

  if (body.action === 'suspend' || body.action === 'restore') {
    if (body.action === 'suspend') {
      await prisma.account.upsert({
        where: {
          provider_providerAccountId: {
            provider: SUSPENSION_PROVIDER,
            providerAccountId: target.id,
          },
        },
        update: {},
        create: {
          userId: target.id,
          type: 'admin',
          provider: SUSPENSION_PROVIDER,
          providerAccountId: target.id,
        },
      });
    } else {
      await prisma.account.deleteMany({
        where: { userId: target.id, provider: SUSPENSION_PROVIDER },
      });
    }
  } else if (body.action === 'setPlan') {
    const statuses = { free: null, pro: 'active', trial: 'trialing' } as const;
    if (!(body.plan in statuses)) return error('Invalid plan', 400);
    await prisma.user.update({
      where: { id: target.id },
      data: { subscriptionStatus: statuses[body.plan] },
    });
  } else {
    return error('Unknown action', 400);
  }

  revalidatePath('/admin');
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!sameOrigin(request)) return error('Invalid request origin', 403);
  const admin = await getAdmin();
  if (!admin) return error('Forbidden', 403);
  if (params.id === admin.id) return error('You cannot delete your own administrator account', 400);

  const target = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!target) return error('User not found', 404);

  await prisma.user.delete({ where: { id: target.id } });
  revalidatePath('/admin');
  return NextResponse.json({ ok: true });
}
