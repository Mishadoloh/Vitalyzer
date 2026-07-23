import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import type Stripe from 'stripe';

export const dynamic = 'force-dynamic';

async function resolveSubscriptionPrice(configuredPriceId: string): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({
    active: true,
    type: 'recurring',
    limit: 100,
    expand: ['data.product'],
  });

  const configuredPrice = prices.data.find((price) => price.id === configuredPriceId);
  if (configuredPrice) return configuredPrice;

  return prices.data.find((price) => {
    const product = price.product;
    return (
      typeof product !== 'string' &&
      !product.deleted &&
      product.name === 'Metrivyn Pro' &&
      price.unit_amount === 499 &&
      price.currency === 'usd' &&
      price.recurring?.interval === 'month'
    );
  }) ?? null;
}

// POST /api/stripe/checkout — creates a Stripe Checkout session for the
// single subscription plan (STRIPE_PRICE_ID) and returns its URL for redirect.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Потрібно увійти в акаунт' }, { status: 401 });
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId?.startsWith('price_')) {
      return NextResponse.json({ error: 'Ціну підписки налаштовано неправильно' }, { status: 500 });
    }

    const subscriptionPrice = await resolveSubscriptionPrice(priceId);
    if (!subscriptionPrice) {
      return NextResponse.json(
        { error: 'У поточному Stripe sandbox не знайдено активну ціну Metrivyn Pro ($4.99 на місяць)' },
        { status: 500 },
      );
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
      line_items: [{ price: subscriptionPrice.id, quantity: 1 }],
      subscription_data: { metadata: { userId } },
      success_url: `${origin}/app/billing?checkout=success`,
      cancel_url: `${origin}/app/billing?checkout=cancel`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Stripe Checkout failed', error);
    return NextResponse.json(
      { error: 'Не вдалося відкрити оплату. Перевірте налаштування Stripe та спробуйте ще раз.' },
      { status: 500 },
    );
  }
}
