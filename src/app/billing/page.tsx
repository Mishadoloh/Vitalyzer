'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { ArrowRight, CheckCircle2, CreditCard, Loader2, LogOut, UserRound } from 'lucide-react';
import { showToast } from '@/lib/toast';

const FREE_FEATURES = [
  'Гостьовий режим без карти',
  'Швидкий запис і базовий дашборд',
  'Локальні тренди для тестових даних',
  'Ручний JSON/CSV backup',
];

const PRO_FEATURES = [
  'Google-акаунт і стабільне збереження даних',
  'Розумні висновки, цілі, streak-и й тижневі звіти',
  'Email-розсилка з автоматичним JSON/CSV backup',
  'Імпорт файлів, історія, профіль і точніші цілі',
  'Керування підпискою через Stripe',
];

export default function BillingPage() {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const price = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL || '$4.99 / місяць';
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);

  async function subscribe() {
    setLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не вдалося створити сесію оплати');
      window.location.href = data.url;
    } catch (e) {
      showToast(e instanceof Error ? e.message : String(e), true);
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-muted">Завантаження...</div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-text-muted">Спочатку увійдіть у застосунок.</p>
        <a href="/" className="text-accent underline">
          На головну
        </a>
      </div>
    );
  }

  if (isGuest) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-5 text-text">
        <div className="relative w-full max-w-2xl rounded-3xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-6 text-center shadow-2xl shadow-black/40 sm:p-8">
          <UserRound size={28} className="mx-auto text-accent" />
          <h1 className="mt-4 text-2xl font-bold">Гостьовий режим активний</h1>
          <p className="mt-3 text-sm text-text-muted">
            Ви можете користуватися Metrivyn без підписки як гість. Дані зберігаються тільки в цьому тимчасовому акаунті.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 text-left sm:grid-cols-2">
            <PlanCard title="Free" price="0$" features={FREE_FEATURES} muted />
            <PlanCard title="Pro" price={price} features={PRO_FEATURES} />
          </div>
          <a
            href="/app"
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-6 py-3 text-[15px] font-semibold text-[#06281c] hover:opacity-90"
          >
            Перейти в застосунок
            <ArrowRight size={16} />
          </a>
          <button
            onClick={() => signOut({ callbackUrl: '/signin' })}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-muted underline"
          >
            <LogOut size={12} />
            Увійти через Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-5 text-text">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/3 h-[360px] w-[360px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-4xl rounded-3xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-6 text-center shadow-2xl shadow-black/40 sm:p-8">
        <div className="mx-auto mb-3 flex items-center justify-center gap-2 text-sm text-text-muted">
          {session?.user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
          ) : null}
          Вітаємо, {session?.user?.name}
        </div>
        <h1 className="mt-1 text-2xl font-bold">Оберіть план Metrivyn</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Free підходить, щоб спробувати застосунок. Pro потрібен для стабільного акаунта, email-звітів, автоматичного backup і повного контролю даних.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 text-left md:grid-cols-2">
          <PlanCard title="Free" price="0$" features={FREE_FEATURES} muted />
          <PlanCard title="Pro" price={price} features={PRO_FEATURES} highlight />
        </div>

        <button
          onClick={subscribe}
          disabled={loading}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-6 py-3 text-[15px] font-semibold text-[#06281c] hover:opacity-90 disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {loading ? 'Перенаправляємо на оплату...' : 'Оформити підписку'}
        </button>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-text-muted underline"
        >
          <LogOut size={12} />
          Вийти з іншого акаунту
        </button>
      </div>
    </div>
  );
}

function PlanCard({ title, price, features, muted, highlight }: { title: string; price: string; features: string[]; muted?: boolean; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-accent/40 bg-accent/10' : 'border-border bg-bg-elevated'} ${muted ? 'opacity-90' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-text">{title}</div>
          <div className="mt-1 text-2xl font-bold text-accent-strong">{price}</div>
        </div>
        {highlight && <span className="rounded-full border border-accent/30 px-2 py-1 text-xs text-accent">рекомендовано</span>}
      </div>
      <ul className="mt-4 space-y-2.5 text-sm text-text-muted">
        {features.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-strong" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
