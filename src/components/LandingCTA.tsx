'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import GoogleSignInButton from './GoogleSignInButton';

export default function LandingCTA({
  authState,
  className,
}: {
  authState: 'anonymous' | 'guest' | 'unsubscribed' | 'subscribed';
  className?: string;
}) {
  const t = useTranslations('Landing');
  const base =
    'inline-flex items-center justify-center gap-2 ' +
    (className ?? 'rounded-lg bg-accent-strong px-6 py-3 text-[15px] font-semibold text-[#06281c] hover:opacity-90');

  if (authState === 'subscribed' || authState === 'unsubscribed' || authState === 'guest') {
    return (
      <Link href="/app" className={base}>
        {authState === 'guest' ? t('openGuest') : t('openApp')}
        <ArrowRight size={16} />
      </Link>
    );
  }

  return <GoogleSignInButton callbackUrl="/app" className={base} />;
}
