'use client';

import { useEffect, useState } from 'react';
import { getProviders, signIn } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import GoogleLogo from './GoogleLogo';

export default function GoogleSignInButton({
  callbackUrl = '/billing',
  className,
  label = 'Увійти через Google',
  unavailableLabel = 'Google-вхід недоступний',
}: {
  callbackUrl?: string;
  className?: string;
  label?: string;
  unavailableLabel?: string;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);

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

  const disabled = available !== true;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => signIn('google', { callbackUrl })}
      title={available === false ? 'Google-вхід ще не налаштований' : undefined}
      className={
        (className ??
          'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-black hover:opacity-90') +
        ' disabled:cursor-not-allowed disabled:opacity-55'
      }
    >
      {available === null ? <Loader2 size={16} className="animate-spin" /> : <GoogleLogo />}
      {available === false ? unavailableLabel : label}
    </button>
  );
}
