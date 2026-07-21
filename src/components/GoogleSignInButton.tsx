'use client';

import { useEffect, useState } from 'react';
import { getProviders, getSession, signIn, signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import GoogleLogo from './GoogleLogo';

export default function GoogleSignInButton({
  callbackUrl = '/app',
  className,
  label,
  unavailableLabel,
}: {
  callbackUrl?: string;
  className?: string;
  label?: string;
  unavailableLabel?: string;
}) {
  const t = useTranslations('Common');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let active = true;
    getProviders()
      .then((providers) => {
        if (active) setAvailable(Boolean(providers?.google));
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const disabled = available !== true || starting;

  async function startGoogleSignIn() {
    setStarting(true);
    try {
      const session = await getSession();
      if ((session?.user as { isGuest?: boolean } | undefined)?.isGuest) {
        await signOut({ redirect: false });
      }
      await signIn('google', { callbackUrl });
    } catch {
      setStarting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={startGoogleSignIn}
      title={available === false ? 'Google-вхід ще не налаштований' : undefined}
      className={
        (className ??
          'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-black hover:opacity-90') +
        ' disabled:cursor-not-allowed disabled:opacity-55'
      }
    >
      {available === null || starting ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
      {available === false ? (unavailableLabel || t('googleUnavailable')) : (label || t('googleSignIn'))}
    </button>
  );
}
