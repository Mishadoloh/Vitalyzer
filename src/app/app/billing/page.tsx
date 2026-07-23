import { Check, CreditCard, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { getLocale, getTranslations } from 'next-intl/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import BillingActions from './BillingActions';

type BillingPageProps = {
  searchParams?: { checkout?: string };
};

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const [t, locale] = await Promise.all([getTranslations('Billing'), getLocale()]);
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: {
          isGuest: true,
          stripeCustomerId: true,
          stripeCurrentPeriodEnd: true,
          subscriptionStatus: true,
        },
      })
    : null;

  const status = user?.subscriptionStatus || 'inactive';
  const isPro = ACTIVE_STATUSES.has(status);
  const isGuest = user?.isGuest ?? true;
  const statusKey = ['active', 'trialing', 'past_due', 'canceled', 'incomplete'].includes(status)
    ? status
    : 'inactive';
  const renewal = user?.stripeCurrentPeriodEnd
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(user.stripeCurrentPeriodEnd)
    : t('notScheduled');

  const freeFeatures = [t('freeFeature1'), t('freeFeature2'), t('freeFeature3'), t('freeFeature4')];
  const proFeatures = [t('proFeature1'), t('proFeature2'), t('proFeature3'), t('proFeature4'), t('proFeature5')];

  return (
    <div className="space-y-5">
      <section className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
              <ShieldCheck size={14} />
              {t('eyebrow')}
            </div>
            <h1 className="text-2xl font-bold text-text sm:text-3xl">{t('title')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">{t('description')}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <LockKeyhole size={14} className="text-accent" />
            {t('secure')}
          </div>
        </div>
      </section>

      {searchParams?.checkout === 'success' && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-accent">
          <Check size={17} className="mt-0.5 shrink-0" />
          <span>{t('success')}</span>
        </div>
      )}
      {searchParams?.checkout === 'cancel' && (
        <div className="rounded-lg border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">{t('cancelNotice')}</div>
      )}

      <section className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <div className="bg-bg-card p-4">
          <div className="text-xs uppercase text-text-muted">{t('currentPlan')}</div>
          <div className="mt-1 text-lg font-bold text-text">{isPro ? t('pro') : t('free')}</div>
        </div>
        <div className="bg-bg-card p-4">
          <div className="text-xs uppercase text-text-muted">{t('status')}</div>
          <div className={`mt-1 text-lg font-bold ${isPro ? 'text-accent' : 'text-text'}`}>{t(`status_${statusKey}`)}</div>
        </div>
        <div className="bg-bg-card p-4">
          <div className="text-xs uppercase text-text-muted">{t('renewal')}</div>
          <div className="mt-1 text-lg font-bold text-text">{renewal}</div>
        </div>
      </section>

      {isGuest && (
        <section className="rounded-lg border border-warn/30 bg-warn/10 p-4">
          <h2 className="font-semibold text-text">{t('guestTitle')}</h2>
          <p className="mt-1 text-sm leading-6 text-text-muted">{t('guestDescription')}</p>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={17} className="text-accent" />
          <h2 className="text-lg font-bold text-text">{t('compare')}</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-lg border border-border bg-bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-text">{t('free')}</h3>
                <p className="mt-1 text-sm text-text-muted">{t('freeDescription')}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-text">$0</div>
                <div className="text-xs text-text-muted">{t('forever')}</div>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {freeFeatures.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-text-muted">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                  {feature}
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-lg border border-accent/40 bg-accent/5 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="mb-2 inline-flex rounded-full border border-accent/30 px-2.5 py-1 text-[11px] font-semibold text-accent">
                  {t('recommended')}
                </div>
                <h3 className="text-lg font-bold text-text">{t('pro')}</h3>
                <p className="mt-1 text-sm text-text-muted">{t('proDescription')}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-accent">$4.99</div>
                <div className="text-xs text-text-muted">{t('perMonth')}</div>
              </div>
            </div>
            <ul className="my-5 space-y-3">
              {proFeatures.map((feature) => (
                <li key={feature} className="flex gap-2 text-sm text-text-muted">
                  <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                  {feature}
                </li>
              ))}
            </ul>
            <BillingActions
              isGuest={isGuest}
              isPro={isPro}
              canManage={Boolean(user?.stripeCustomerId)}
            />
          </article>
        </div>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border py-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2"><CreditCard size={14} />{t('stripe')}</span>
        <span>{t('cancelAnytime')}</span>
      </footer>
    </div>
  );
}
