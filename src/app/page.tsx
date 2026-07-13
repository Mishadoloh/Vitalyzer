import {
  CheckCircle2,
  Clock3,
  Database,
  FileDown,
  LineChart,
  Moon,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import LandingCTA from '@/components/LandingCTA';
import GuestSignInButton from '@/components/GuestSignInButton';
import Hero3DLoader from '@/components/Hero3DLoader';
import MockDashboardPreview from '@/components/MockDashboardPreview';
import TiltCard from '@/components/TiltCard';
import Reveal from '@/components/Reveal';
import AnimatedStat from '@/components/AnimatedStat';
import FaqAccordion from '@/components/FaqAccordion';
import CtaData3DLoader from '@/components/CtaData3DLoader';

const FEATURES = [
  {
    icon: UploadCloud,
    title: 'Один дашборд замість пʼяти застосунків',
    text: 'Імпортуйте експорти з Apple Health, Google Fit, Strava, MyFitnessPal, Garmin — або вносьте дані вручну за 10 секунд.',
  },
  {
    icon: Sparkles,
    title: 'Порада на кожен день',
    text: 'Рушій трендів аналізує сон, тренування, харчування, вагу й настрій і дає одну конкретну дію замість купи графіків.',
  },
  {
    icon: LineChart,
    title: 'Тренди та серії',
    text: 'Streak-и дотримання цілей, порівняння тижня з тижнем, графіки ваги й настрою за місяць.',
  },
  {
    icon: Smartphone,
    title: 'Працює з телефону',
    text: 'Повністю адаптивний інтерфейс — заповнюйте щоденник із дивана чи з зали.',
  },
  {
    icon: Moon,
    title: 'Сон, тренування, харчування, вага, настрій',
    text: 'П’ять категорій в одному місці — жодна частина картини не губиться між застосунками.',
  },
  {
    icon: ShieldCheck,
    title: 'Приватність за замовчуванням',
    text: 'Основний аналіз працює локально: ваші записи лишаються під вашим контролем, а резервну копію можна забрати в будь-який момент.',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Підключіть дані',
    text: 'Імпортуйте CSV/Excel-експорт з трекера або внесіть перший запис вручну за хвилину.',
  },
  {
    step: '2',
    title: 'Розумний аналіз',
    text: 'Рушій рахує тренди, дефіцит сну, ризик перетренованості, баланс калорій і білка.',
  },
  {
    step: '3',
    title: 'Одна конкретна порада',
    text: 'Щодня — не графік для інтерпретації, а готова дія на сьогодні.',
  },
];

const STATS = [
  { value: 5, suffix: '', label: 'категорій даних в одному місці' },
  { value: 100, suffix: '%', label: 'контроль над своїми даними' },
  { value: 1, suffix: '', label: 'конкретна порада щодня' },
  { value: 10, suffix: 'с', label: 'на ручний запис показників' },
];

const COMPARISON = [
  { label: 'Дані сну, тренувань, харчування, ваги й настрою в одному місці', vitalyzer: true, other: false },
  { label: 'Готова порада на день замість графіків для розшифровки', vitalyzer: true, other: false },
  { label: 'Серії (streaks) і порівняння тижня з тижнем', vitalyzer: true, other: false },
  { label: 'Працює з будь-яким трекером (Apple Health, Garmin, Strava...)', vitalyzer: true, other: false },
  { label: 'Локальний аналіз без обов’язкової передачі даних', vitalyzer: true, other: false },
];

const FAQ = [
  {
    q: 'Чи потрібно відмовлятись від мого трекера сну/тренувань?',
    a: 'Ні. Vitalyzer читає дані, які ви вже збираєте (Apple Health, Google Fit, Strava, MyFitnessPal, Garmin), і додає шар аналізу зверху.',
  },
  {
    q: 'Що з приватністю даних?',
    a: 'За замовчуванням аналіз локальний. Дані можна експортувати резервною копією, а сирі записи не потрібні стороннім сервісам для базових порад.',
  },
  {
    q: 'Чи можна скасувати підписку в будь-який момент?',
    a: 'Так, керування підпискою — через захищений білінг-портал Stripe прямо в Налаштуваннях, без листів у підтримку.',
  },
];

const FAQ_POINTS = [
  {
    icon: Database,
    title: 'Дані лишаються вашими',
    text: 'Записи привʼязані до вашого акаунта, а резервну копію можна забрати в JSON.',
  },
  {
    icon: Clock3,
    title: 'Старт без налаштувань',
    text: 'Гостьовий режим відкриває дашборд одразу, без Google і без Stripe.',
  },
  {
    icon: FileDown,
    title: 'Імпорт без привʼязки',
    text: 'Підходять CSV та Excel-експорти з трекерів, які ви вже використовуєте.',
  },
];

async function getAuthState(): Promise<'anonymous' | 'guest' | 'unsubscribed' | 'subscribed'> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return 'anonymous';
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true, subscriptionStatus: true } });
  if (user?.isGuest) return 'guest';
  const active = user?.subscriptionStatus === 'active' || user?.subscriptionStatus === 'trialing';
  return active ? 'subscribed' : 'unsubscribed';
}

const PRICING_ITEMS = [
  'Необмежений швидкий запис і CSV-імпорт',
  'Щоденна персональна порада і локальний аналіз',
  'Тренди, серії (streaks) і тижневі порівняння',
  'Резервне копіювання та повний контроль над даними',
];

export default async function LandingPage() {
  const authState = await getAuthState();
  const price = process.env.NEXT_PUBLIC_SUBSCRIPTION_PRICE_LABEL || '$4.99 / місяць';

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-float-slow absolute -top-32 left-1/4 h-[420px] w-[420px] rounded-full bg-accent/10 blur-[120px]" />
        <div className="animate-float-slower absolute top-64 right-0 h-[360px] w-[360px] rounded-full bg-info/10 blur-[120px]" />
        <div className="animate-float-slow absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-warn/5 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-border/60 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="text-accent">◆</span>
            <span>Vitalyzer</span>
          </div>
          <LandingCTA
            authState={authState}
            className="rounded-lg border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent"
          />
        </div>
      </header>

      <section className="relative mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 px-5 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <Hero3DLoader className="pointer-events-none absolute inset-x-0 -top-6 bottom-0 opacity-45 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_72%,transparent)] lg:-right-24 lg:left-auto lg:w-[58%] lg:opacity-85" />
        <div className="relative text-center lg:text-left">
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-card px-3 py-1 text-[12px] text-text-muted">
            <Sparkles size={13} className="text-accent" />
            Аналіз здоровʼя, а не черговий трекер
          </span>
          <h1 className="m-0 text-3xl font-bold leading-tight sm:text-5xl">
            Персональний трекер здоровʼя,
            <br className="hidden sm:block" /> що пояснює ваші дані
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] text-text-muted sm:text-base lg:mx-0">
            Vitalyzer не замінює ваш трекер сну, тренувань чи харчування — він читає дані, які ви вже збираєте, і
            щодня дає одну конкретну персональну пораду замість чергового графіка.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <LandingCTA authState={authState} />
            <a
              href="#features"
              className="inline-flex items-center gap-1.5 rounded-lg px-6 py-3 text-[15px] text-text-muted hover:text-text"
            >
              <ScanLine size={16} />
              Як це працює
            </a>
          </div>
          {authState === 'anonymous' && (
            <GuestSignInButton
              callbackUrl="/app"
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] text-text-muted underline hover:text-text"
            />
          )}
        </div>

        <div className="relative flex justify-center lg:justify-end">
          <TiltCard maxTilt={10} scale={1.03}>
            <MockDashboardPreview />
          </TiltCard>
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-14">
        <Reveal className="grid grid-cols-2 gap-6 rounded-2xl border border-border bg-bg-card/60 px-6 py-8 sm:grid-cols-4">
          {STATS.map((s) => (
            <AnimatedStat key={s.label} value={s.value} suffix={s.suffix} label={s.label} />
          ))}
        </Reveal>
      </section>

      <section id="features" className="relative mx-auto max-w-5xl px-5 pb-16">
        <Reveal>
          <h2 className="mb-6 text-center text-xl font-semibold sm:text-2xl">Все, що потрібно для щоденних рішень</h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={Math.min(i, 3) * 0.06}>
              <TiltCard maxTilt={5} scale={1.015} className="h-full rounded-2xl">
                <div className="h-full rounded-2xl border border-border bg-bg-card p-5 transition-colors hover:border-accent/40">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    <f.icon size={18} />
                  </div>
                  <h3 className="m-0 mb-2 text-[15px] font-semibold">{f.title}</h3>
                  <p className="m-0 text-[13.5px] text-text-muted">{f.text}</p>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-4xl px-5 pb-16">
        <Reveal>
          <h2 className="mb-8 text-center text-xl font-semibold sm:text-2xl">Як це працює</h2>
        </Reveal>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08} className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-strong text-[15px] font-bold text-[#06281c]">
                {s.step}
              </div>
              <h3 className="m-0 mb-1.5 text-[14.5px] font-semibold">{s.title}</h3>
              <p className="m-0 text-[13px] text-text-muted">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-3xl px-5 pb-16">
        <Reveal>
          <h2 className="mb-6 text-center text-xl font-semibold sm:text-2xl">Чим це відрізняється від звичайного трекера</h2>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 bg-bg-elevated px-4 py-3 text-[12px] font-semibold text-text-muted sm:gap-6 sm:px-5">
              <span />
              <span className="text-center text-accent">Vitalyzer</span>
              <span className="text-center">Звичайний трекер</span>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3.5 text-[13px] sm:gap-6 sm:px-5 ${
                  i % 2 === 0 ? 'bg-bg-card' : 'bg-bg-card/50'
                }`}
              >
                <span className="text-text-muted">{row.label}</span>
                <span className="flex justify-center text-accent-strong">
                  {row.vitalyzer ? <CheckCircle2 size={18} /> : <XCircle size={18} className="text-text-muted/40" />}
                </span>
                <span className="flex justify-center">
                  {row.other ? <CheckCircle2 size={18} className="text-accent-strong" /> : <XCircle size={18} className="text-text-muted/40" />}
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <section id="pricing" className="relative mx-auto max-w-md px-5 pb-16 text-center">
        <Reveal>
          <TiltCard maxTilt={6} scale={1.015} className="rounded-2xl">
            <div className="rounded-2xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-8">
              <div className="text-sm text-text-muted">Один тариф, без прихованих умов</div>
              <div className="mt-2 text-4xl font-bold text-accent-strong">{price}</div>
              <ul className="mx-auto mt-5 flex max-w-xs flex-col gap-2.5 text-left text-[13px] text-text-muted">
                {PRICING_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-accent-strong" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <LandingCTA
                  authState={authState}
                  className="inline-block w-full rounded-lg bg-accent-strong px-6 py-3 text-[15px] font-semibold text-[#06281c] hover:opacity-90"
                />
              </div>
            </div>
          </TiltCard>
        </Reveal>
      </section>

      <section className="relative border-y border-border/60 bg-bg-elevated/25 px-5 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <Reveal className="lg:sticky lg:top-24">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[12px] text-accent">
              <ShieldCheck size={13} />
              Перед стартом
            </span>
            <h2 className="m-0 max-w-sm text-2xl font-semibold leading-tight sm:text-3xl">
              Питання, які варто закрити до першого імпорту
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-7 text-text-muted">
              Vitalyzer не просить міняти звички або переносити все вручну. Він забирає дані з уже знайомих джерел і
              перетворює їх на коротку щоденну дію.
            </p>
            <div className="mt-7 flex flex-col gap-4">
              {FAQ_POINTS.map((item) => (
                <div key={item.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-bg-card text-accent">
                    <item.icon size={17} />
                  </span>
                  <span>
                    <span className="block text-[14px] font-semibold text-text">{item.title}</span>
                    <span className="mt-1 block text-[13px] leading-6 text-text-muted">{item.text}</span>
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <FaqAccordion items={FAQ} />
          </Reveal>
        </div>
      </section>

      <section className="relative px-5 py-12 sm:py-14">
        <Reveal>
          <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-7 overflow-hidden border-y border-border/70 py-9 text-center sm:grid-cols-[minmax(0,1fr)_390px_auto] sm:text-left">
            <div>
              <h2 className="m-0 text-xl font-semibold sm:text-2xl">Перевірте на власних даних за кілька хвилин</h2>
              <p className="mt-2 max-w-xl text-[14px] text-text-muted">
                Відкрийте гостьовий режим, внесіть перший запис або імпортуйте файл і подивіться, яку пораду дасть рушій.
              </p>
            </div>
            <CtaData3DLoader className="pointer-events-none mx-auto -my-3 h-[260px] w-full max-w-[420px] opacity-100 sm:h-[220px] sm:max-w-none" />
            <GuestSignInButton
              callbackUrl="/app"
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-strong px-6 py-3 text-[15px] font-semibold text-[#06281c] hover:opacity-90 sm:w-auto"
            />
          </div>
        </Reveal>
      </section>

      <footer className="relative border-t border-border/60 bg-bg-elevated/35 px-5 py-10 text-text-muted">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-[1.1fr_auto_auto] sm:items-start">
          <div>
            <div className="flex items-center justify-center gap-2 text-sm font-bold text-text sm:justify-start">
              <span className="text-accent">◆</span>
              Vitalyzer
            </div>
            <p className="mx-auto mt-3 max-w-sm text-center text-xs leading-6 sm:mx-0 sm:text-left">
              Один спокійний дашборд для сну, тренувань, харчування, ваги й настрою.
            </p>
          </div>
          <nav className="flex justify-center gap-5 text-[13px] sm:justify-start">
            <a href="#features" className="hover:text-text">
              Функції
            </a>
            <a href="#pricing" className="hover:text-text">
              Ціни
            </a>
            <a href="/signin" className="hover:text-text">
              Вхід
            </a>
          </nav>
          <div className="text-center text-xs sm:text-right">
            <div>© {new Date().getFullYear()} Vitalyzer</div>
            <div className="mt-2 text-text-muted/70">Приватність за замовчуванням</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
