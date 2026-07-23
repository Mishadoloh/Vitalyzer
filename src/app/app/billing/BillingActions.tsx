'use client';

import Link from 'next/link';
import { CreditCard, ExternalLink, Loader2, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { showToast } from '@/lib/toast';

type BillingActionsProps = {
  isGuest: boolean;
  shouldManage: boolean;
};

async function readResponse(response: Response): Promise<{ error?: string; url?: string }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { error?: string; url?: string };
  } catch {
    return {};
  }
}

export default function BillingActions({ isGuest, shouldManage }: BillingActionsProps) {
  const t = useTranslations('Billing');
  const [loading, setLoading] = useState<'checkout' | 'portal' | null>(null);

  async function openStripe(endpoint: '/api/stripe/checkout' | '/api/stripe/portal', mode: 'checkout' | 'portal') {
    setLoading(mode);
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || t('requestError'));
      if (!data.url) throw new Error(t('requestError'));
      window.location.assign(data.url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : t('requestError'), true);
      setLoading(null);
    }
  }

  if (isGuest) {
    return (
      <Link
        href="/signin?callbackUrl=/app/billing"
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
      >
        <LogIn size={16} />
        {t('signIn')}
      </Link>
    );
  }

  if (shouldManage) {
    return (
      <button
        type="button"
        onClick={() => openStripe('/api/stripe/portal', 'portal')}
        disabled={loading !== null}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/15 disabled:cursor-wait disabled:opacity-60"
      >
        {loading === 'portal' ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}
        {loading === 'portal' ? t('openingPortal') : t('manage')}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openStripe('/api/stripe/checkout', 'checkout')}
      disabled={loading !== null}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-4 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
    >
      {loading === 'checkout' ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
      {loading === 'checkout' ? t('redirecting') : t('subscribe')}
    </button>
  );
}
