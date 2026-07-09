import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// POST /api/stripe/checkout — creates a Stripe Checkout session for the
// single subscription plan (STRIPE_PRICE_ID) and returns its URL for redirect.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'STRIPE_PRICE_ID не налаштовано на сервері' }, { status: 500 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.isGuest) {
    return NextResponse.json(
      { error: 'Гостьовий акаунт не можна оплатити. Увійдіть через Google, щоб оформити підписку.' },
      { status: 400 },
    );
  }

  const origin = req.nextUrl.origin;

  let customerId = user?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session?.user?.email ?? undefined,
      name: session?.user?.name ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    client_reference_id: userId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId } },
    success_url: `${origin}/app?checkout=success`,
    cancel_url: `${origin}/billing?checkout=cancel`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
