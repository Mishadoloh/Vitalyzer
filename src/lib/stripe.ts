import Stripe from 'stripe';

// Falls back to a placeholder so the module can load (e.g. during `next build`)
// before STRIPE_SECRET_KEY is configured. Any real Stripe API call made with the
// placeholder will fail loudly at request time — that's expected until the real
// key is set in .env.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_not_configured', {
  apiVersion: '2026-06-24.dahlia',
});
