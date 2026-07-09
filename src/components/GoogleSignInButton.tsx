'use client';

import { signIn } from 'next-auth/react';
import GoogleLogo from './GoogleLogo';

export default function GoogleSignInButton({
  callbackUrl = '/billing',
  className,
}: {
  callbackUrl?: string;
  className?: string;
}) {
  return (
    <button
      onClick={() => signIn('google', { callbackUrl })}
      className={
        className ??
        'inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-black hover:opacity-90'
      }
    >
      <GoogleLogo />
      Увійти через Google
    </button>
  );
}
