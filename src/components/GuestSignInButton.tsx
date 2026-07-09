'use client';

import { signIn } from 'next-auth/react';
import { UserRound } from 'lucide-react';

export default function GuestSignInButton({
  callbackUrl = '/app',
  className,
}: {
  callbackUrl?: string;
  className?: string;
}) {
  return (
    <button
      onClick={() => signIn('guest', { callbackUrl })}
      className={
        className ??
        'inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-[15px] text-text-muted hover:border-accent hover:text-text'
      }
    >
      <UserRound size={16} />
      Продовжити як гість
    </button>
  );
}
