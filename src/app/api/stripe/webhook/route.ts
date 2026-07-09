import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

// POST /api/stripe/webhook — keeps User.subscriptionStatus in sync with Stripe.
// Configure this URL in the Stripe Dashboard (or `stripe listen` for local dev)
// and put the signing secret it gives you into STRIPE_WEBHOOK_SECRET.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid signature: ' + (e instanceof Error ? e.message : String(e)) }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const userId = checkoutSession.client_reference_id;
      const subscriptionId = checkoutSession.subscription as string | null;
      if (userId && subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncSubscription(userId, subscription);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (userId) {
        await syncSubscription(userId, subscription);
      } else {
        // Fallback: metadata missing (e.g. subscription created outside our checkout flow) — match by customer id.
        const user = await prisma.user.findUnique({ where: { stripeCustomerId: subscription.customer as string } });
        if (user) await syncSubscription(user.id, subscription);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function syncSubscription(userId: string, subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: item?.price.id ?? null,
      subscriptionStatus: subscription.status,
      stripeCurrentPeriodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null,
    },
  });
}
