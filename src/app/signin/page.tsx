'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import GuestSignInButton from '@/components/GuestSignInButton';

const ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    'Помилка конфігурації сервера автентифікації. Перевірте GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET у .env.',
  AccessDenied: 'Доступ відхилено. Спробуйте увійти іншим Google-акаунтом.',
  OAuthSignin:
    'Не вдалося розпочати вхід через Google. Найчастіша причина — GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET не налаштовані в .env або redirect URI в Google Cloud Console не збігається.',
  OAuthCallback: 'Помилка під час обробки відповіді від Google. Спробуйте ще раз.',
  OAuthCreateAccount: 'Не вдалося створити акаунт на основі даних Google. Спробуйте ще раз.',
  OAuthAccountNotLinked: 'Цей email вже привʼязаний до входу іншим способом.',
  Verification: 'Посилання для входу недійсне або застаріле.',
  Default: 'Щось пішло не так під час входу. Спробуйте ще раз.',
};

function SignInContent() {
  const params = useSearchParams();
  const error = params.get('error');
  const callbackUrl = params.get('callbackUrl') || '/billing';
  const guestCallbackUrl = '/app';
  const message = error ? ERROR_MESSAGES[error] || ERROR_MESSAGES.Default : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-5 text-text">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 h-[360px] w-[360px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm rounded-2xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-8 text-center shadow-2xl shadow-black/40">
        <div className="mb-1 flex items-center justify-center gap-2 text-lg font-bold">
          <span className="text-accent">◆</span>
          <span>Vitalyzer</span>
        </div>
        <h1 className="mt-4 text-xl font-bold">Увійдіть, щоб продовжити</h1>
        <p className="mt-2 text-[13px] text-text-muted">Один Google-акаунт — і ваш дашборд здоровʼя вже чекає.</p>

        {message && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-left text-[13px] text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2.5">
          <GoogleSignInButton
            callbackUrl={callbackUrl}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-black hover:opacity-90"
          />
          <GuestSignInButton callbackUrl={guestCallbackUrl} />
        </div>
        <p className="mt-3 text-[11.5px] text-text-muted">
          Гостьовий акаунт не привʼязаний до email — не забудьте резервну копію в Налаштуваннях.
        </p>

        <a href="/" className="mt-4 inline-block text-xs text-text-muted underline">
          На головну
        </a>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  );
}
