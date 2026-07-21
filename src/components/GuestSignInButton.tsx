'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Loader2, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { showToast } from '@/lib/toast';

export default function GuestSignInButton({
  callbackUrl = '/app',
  className,
}: {
  callbackUrl?: string;
  className?: string;
}) {
  const t = useTranslations('Common');
  const [loading, setLoading] = useState(false);

  async function continueAsGuest() {
    setLoading(true);
    try {
      const result = await signIn('guest', { callbackUrl, redirect: false });
      if (result?.error) {
        throw new Error(result.error);
      }
      window.location.href = result?.url || callbackUrl;
    } catch (e) {
      showToast(t('guestError', { message: e instanceof Error ? e.message : String(e) }), true);
      setLoading(false);
    }
  }

  return (
    <button
      onClick={continueAsGuest}
      disabled={loading}
      className={
        className ??
        'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-[15px] text-text-muted hover:border-accent hover:text-text disabled:opacity-60'
      }
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserRound size={16} />}
      {loading ? t('opening') : t('continueAsGuest')}
    </button>
  );
}
