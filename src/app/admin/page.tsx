import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import {
  Activity,
  ArrowLeft,
  Ban,
  BarChart3,
  Camera,
  CheckCircle2,
  Database,
  Dumbbell,
  HardDrive,
  Mail,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Utensils,
} from 'lucide-react';
import type { Prisma } from '@prisma/client';
import AdminUserActions from '@/components/AdminUserActions';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/admin-access';
import { prisma } from '@/lib/prisma';
import { hasSuspensionMarker, SUSPENSION_PROVIDER } from '@/lib/user-access';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Адмін-панель | Metrivyn',
  robots: { index: false, follow: false, noarchive: true },
};

type AdminPageProps = {
  searchParams?: { q?: string; filter?: string };
};

type UserFilter = 'all' | 'guest' | 'pro' | 'suspended';

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function accountLabel(user: { isGuest: boolean; accounts: Array<{ provider: string }>; subscriptionStatus: string | null }): string {
  if (hasSuspensionMarker(user)) return 'Заблоковано';
  if (user.isGuest) return 'Гість';
  if (user.subscriptionStatus === 'active') return 'Pro';
  if (user.subscriptionStatus === 'trialing') return 'Trial';
  return 'Free';
}

function accountTone(user: { isGuest: boolean; accounts: Array<{ provider: string }>; subscriptionStatus: string | null }): string {
  if (hasSuspensionMarker(user)) return 'border-danger/25 bg-danger/10 text-danger';
  if (user.subscriptionStatus === 'active') return 'border-accent/25 bg-accent/10 text-accent';
  if (user.subscriptionStatus === 'trialing') return 'border-info/25 bg-info/10 text-info';
  if (user.isGuest) return 'border-warn/25 bg-warn/10 text-warn';
  return 'border-border bg-bg-elevated text-text-muted';
}

function accountPlan(user: { subscriptionStatus: string | null }): 'free' | 'trial' | 'pro' {
  if (user.subscriptionStatus === 'active') return 'pro';
  if (user.subscriptionStatus === 'trialing') return 'trial';
  return 'free';
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) redirect('/app');
  const adminId = (session?.user as { id?: string } | undefined)?.id;
  if (!adminId) redirect('/app');

  const query = String(searchParams?.q || '').trim().slice(0, 80);
  const requestedFilter = String(searchParams?.filter || 'all');
  const filter: UserFilter = ['guest', 'pro', 'suspended'].includes(requestedFilter)
    ? requestedFilter as UserFilter
    : 'all';
  const filters: Prisma.UserWhereInput[] = [];
  if (query) {
    filters.push({
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    });
  }
  if (filter === 'guest') filters.push({ isGuest: true });
  if (filter === 'pro') filters.push({ subscriptionStatus: 'active' });
  if (filter === 'suspended') filters.push({ accounts: { some: { provider: SUSPENSION_PROVIDER } } });
  const userWhere: Prisma.UserWhereInput | undefined = filters.length ? { AND: filters } : undefined;
  const filterHref = (nextFilter: UserFilter) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (nextFilter !== 'all') params.set('filter', nextFilter);
    const suffix = params.toString();
    return suffix ? `/admin?${suffix}` : '/admin';
  };
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const chartStart = new Date(now);
  chartStart.setDate(chartStart.getDate() - 13);
  chartStart.setHours(0, 0, 0, 0);
  const recentDate = isoDate(weekAgo);

  const [
    totalUsers,
    googleUsers,
    guestUsers,
    proUsers,
    suspendedUsers,
    newUsers,
    sleepCount,
    workoutCount,
    nutritionCount,
    weightCount,
    moodCount,
    photoCount,
    habitCount,
    recentUsers,
    chartUsers,
    activeSleep,
    activeWorkouts,
    activeNutrition,
    activeWeight,
    activeMood,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isGuest: false, email: { not: null } } }),
    prisma.user.count({ where: { isGuest: true } }),
    prisma.user.count({ where: { subscriptionStatus: 'active' } }),
    prisma.user.count({ where: { accounts: { some: { provider: SUSPENSION_PROVIDER } } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.sleepEntry.count(),
    prisma.workoutEntry.count(),
    prisma.nutritionEntry.count(),
    prisma.weightEntry.count(),
    prisma.moodEntry.count(),
    prisma.progressPhoto.count(),
    prisma.syncedHabitState.count(),
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        isGuest: true,
        accounts: { where: { provider: SUSPENSION_PROVIDER }, select: { provider: true } },
        createdAt: true,
        subscriptionStatus: true,
        _count: {
          select: {
            sleepEntries: true,
            workoutEntries: true,
            nutritionEntries: true,
            weightEntries: true,
            moodEntries: true,
            progressPhotos: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.sleepEntry.findMany({ where: { date: { gte: recentDate } }, distinct: ['userId'], select: { userId: true } }),
    prisma.workoutEntry.findMany({ where: { date: { gte: recentDate } }, distinct: ['userId'], select: { userId: true } }),
    prisma.nutritionEntry.findMany({ where: { date: { gte: recentDate } }, distinct: ['userId'], select: { userId: true } }),
    prisma.weightEntry.findMany({ where: { date: { gte: recentDate } }, distinct: ['userId'], select: { userId: true } }),
    prisma.moodEntry.findMany({ where: { date: { gte: recentDate } }, distinct: ['userId'], select: { userId: true } }),
  ]);

  const activeUserIds = new Set(
    [...activeSleep, ...activeWorkouts, ...activeNutrition, ...activeWeight, ...activeMood].map((entry) => entry.userId)
  );
  const activeUsers = activeUserIds.size;
  const totalRecords = sleepCount + workoutCount + nutritionCount + weightCount + moodCount;
  const dataCoverage = totalUsers ? Math.round((activeUsers / totalUsers) * 100) : 0;

  const signupsByDay = new Map<string, number>();
  chartUsers.forEach((user) => {
    const key = isoDate(user.createdAt);
    signupsByDay.set(key, (signupsByDay.get(key) || 0) + 1);
  });
  const signupSeries = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(chartStart);
    date.setDate(chartStart.getDate() + index);
    const key = isoDate(date);
    return {
      key,
      label: new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' }).format(date),
      value: signupsByDay.get(key) || 0,
    };
  });
  const maxSignups = Math.max(1, ...signupSeries.map((item) => item.value));

  const dataTypes = [
    { label: 'Сон', value: sleepCount, icon: Moon, color: 'bg-accent-strong' },
    { label: 'Тренування', value: workoutCount, icon: Dumbbell, color: 'bg-info' },
    { label: 'Харчування', value: nutritionCount, icon: Utensils, color: 'bg-warn' },
    { label: 'Вага', value: weightCount, icon: BarChart3, color: 'bg-accent' },
    { label: 'Настрій', value: moodCount, icon: Activity, color: 'bg-danger' },
  ];
  const maxDataType = Math.max(1, ...dataTypes.map((item) => item.value));

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="border-b border-border bg-bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
              <ShieldCheck size={19} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">Metrivyn Control</div>
              <div className="text-[11px] text-text-muted">Захищений адміністративний простір</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden max-w-56 truncate text-xs text-text-muted sm:block">{session?.user?.email}</span>
            <Link href="/app" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm text-text-muted hover:border-accent/40 hover:text-accent">
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">До застосунку</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-accent">
              <Sparkles size={14} /> Операційний огляд
            </div>
            <h1 className="text-2xl font-bold sm:text-3xl">Адмін-панель</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-text-muted">
              Користувачі, активність, стан даних і ключові сигнали продукту в одному місці.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1.5 text-xs text-accent">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-strong" />
            Система працює
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon={Users} label="Усі користувачі" value={totalUsers} detail={`+${newUsers} за 7 днів`} tone="accent" />
          <StatCard icon={Activity} label="Активні за 7 днів" value={activeUsers} detail={`${dataCoverage}% від усіх`} tone="info" />
          <StatCard icon={Database} label="Записів здоров’я" value={totalRecords} detail={`${photoCount} фото прогресу`} tone="warn" />
          <StatCard icon={CheckCircle2} label="Google-акаунти" value={googleUsers} detail={`${proUsers} Pro · ${guestUsers} гостей`} tone="neutral" />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
          <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Нові користувачі</h2>
                <p className="mt-1 text-xs text-text-muted">Динаміка реєстрацій за останні 14 днів</p>
              </div>
              <span className="rounded-full border border-border bg-bg-elevated px-2.5 py-1 text-xs text-text-muted">{chartUsers.length} разом</span>
            </div>
            <div className="mt-6 flex h-44 items-end gap-1.5 sm:gap-2">
              {signupSeries.map((item) => (
                <div key={item.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <span className="text-[10px] font-semibold text-text opacity-0 transition-opacity group-hover:opacity-100">{item.value}</span>
                  <div className="flex h-32 w-full items-end rounded-md bg-bg-elevated p-1">
                    <div
                      className="w-full rounded-sm bg-accent-strong transition-[height] group-hover:bg-accent"
                      style={{ height: `${Math.max(item.value ? 12 : 3, (item.value / maxSignups) * 100)}%`, opacity: item.value ? 1 : 0.2 }}
                    />
                  </div>
                  <span className="hidden text-[9px] text-text-muted sm:block">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">Стан платформи</h2>
                <p className="mt-1 text-xs text-text-muted">Критичні сервіси та збереження</p>
              </div>
              <HardDrive size={18} className="text-accent" />
            </div>
            <div className="mt-5 space-y-2">
              <ServiceRow icon={Database} label="PostgreSQL" detail="Доступна" healthy />
              <ServiceRow icon={ShieldCheck} label="Google OAuth" detail="Налаштовано" healthy />
              <ServiceRow icon={HardDrive} label="Vercel Functions" detail="Production" healthy />
              <ServiceRow icon={Camera} label="Фото прогресу" detail={`${photoCount} файлів`} healthy />
              <ServiceRow icon={Activity} label="Стан звичок" detail={`${habitCount} профілів`} healthy />
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(320px,.72fr)_minmax(0,1.28fr)]">
          <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-5">
            <h2 className="text-sm font-semibold">Структура даних</h2>
            <p className="mt-1 text-xs text-text-muted">Кількість записів за категоріями</p>
            <div className="mt-5 space-y-4">
              {dataTypes.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-text-muted">
                      <item.icon size={13} />
                      {item.label}
                    </span>
                    <b className="text-text">{item.value}</b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-elevated">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / maxDataType) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-card">
            <div className="border-b border-border p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold">Користувачі</h2>
                <p className="mt-1 text-xs text-text-muted">Пошук, плани, статус доступу та повне керування даними</p>
              </div>
              <form className="relative w-full sm:w-72" action="/admin" method="get">
                {filter !== 'all' && <input type="hidden" name="filter" value={filter} />}
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Ім’я або email"
                  className="h-10 w-full rounded-lg border border-border bg-bg-elevated pl-9 pr-3 text-sm outline-none placeholder:text-text-muted focus:border-accent/50"
                />
              </form>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  ['all', 'Усі', totalUsers],
                  ['guest', 'Гості', guestUsers],
                  ['pro', 'Pro', proUsers],
                  ['suspended', 'Заблоковані', suspendedUsers],
                ] as const).map(([value, label, count]) => (
                  <Link
                    key={value}
                    href={filterHref(value)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-xs transition-colors ${
                      filter === value
                        ? 'border-accent/30 bg-accent/10 text-accent'
                        : 'border-border bg-bg-elevated text-text-muted hover:border-accent/25 hover:text-text'
                    }`}
                  >
                    {value === 'suspended' && <Ban size={13} />}
                    {label}
                    <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[10px]">{count}</span>
                  </Link>
                ))}
              </div>
            </div>

            {recentUsers.length ? (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="text-text-muted">
                      <tr>
                        <th className="px-5 py-3 font-medium">Користувач</th>
                        <th className="px-3 py-3 font-medium">План</th>
                        <th className="px-3 py-3 font-medium">Дані</th>
                        <th className="px-3 py-3 font-medium">Створено</th>
                        <th className="px-5 py-3 text-right font-medium">Керування</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentUsers.map((user) => {
                        const records = user._count.sleepEntries + user._count.workoutEntries + user._count.nutritionEntries + user._count.weightEntries + user._count.moodEntries;
                        return (
                          <tr key={user.id} className="border-t border-border/80 hover:bg-bg-elevated/50">
                            <td className="px-5 py-3">
                              <UserIdentity user={user} />
                            </td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${accountTone(user)}`}>
                                {accountLabel(user)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <b>{records}</b>
                              <span className="ml-1 text-text-muted">+ {user._count.progressPhotos} фото</span>
                            </td>
                            <td className="px-3 py-3 text-text-muted">{formatDate(user.createdAt)}</td>
                            <td className="px-5 py-3">
                              <div className="flex justify-end">
                                <AdminUserActions
                                  userId={user.id}
                                  isSuspended={hasSuspensionMarker(user)}
                                  isSelf={user.id === adminId}
                                  plan={accountPlan(user)}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y divide-border md:hidden">
                  {recentUsers.map((user) => {
                    const records = user._count.sleepEntries + user._count.workoutEntries + user._count.nutritionEntries + user._count.weightEntries + user._count.moodEntries;
                    return (
                      <div key={user.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <UserIdentity user={user} />
                          <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold ${accountTone(user)}`}>
                            {accountLabel(user)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-text-muted">
                          <span>{records} записів · {user._count.progressPhotos} фото</span>
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                        <div className="mt-3 border-t border-border/70 pt-3">
                          <AdminUserActions
                            userId={user.id}
                            isSuspended={hasSuspensionMarker(user)}
                            isSelf={user.id === adminId}
                            plan={accountPlan(user)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="grid min-h-48 place-items-center p-6 text-center">
                <div>
                  <Search size={22} className="mx-auto text-text-muted" />
                  <p className="mt-3 text-sm font-semibold">Нічого не знайдено</p>
                  <p className="mt-1 text-xs text-text-muted">Спробуйте інше ім’я або email.</p>
                </div>
              </div>
            )}
          </div>
        </section>

        <footer className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Дані оновлюються під час кожного відкриття сторінки.</span>
          <span>Доступ захищено серверною перевіркою адміністратора.</span>
        </footer>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
  tone: 'accent' | 'info' | 'warn' | 'neutral';
}) {
  const toneClass = tone === 'info'
    ? 'bg-info/10 text-info'
    : tone === 'warn'
      ? 'bg-warn/10 text-warn'
      : tone === 'neutral'
        ? 'bg-white/5 text-text-muted'
        : 'bg-accent/10 text-accent';
  return (
    <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-5">
      <div className={`grid h-9 w-9 place-items-center rounded-lg ${toneClass}`}>
        <Icon size={17} />
      </div>
      <div className="mt-4 text-2xl font-bold sm:text-3xl">{value.toLocaleString('uk-UA')}</div>
      <div className="mt-1 text-xs font-medium text-text">{label}</div>
      <div className="mt-1 text-[11px] text-text-muted">{detail}</div>
    </div>
  );
}

function ServiceRow({
  icon: Icon,
  label,
  detail,
  healthy,
}: {
  icon: typeof Database;
  label: string;
  detail: string;
  healthy: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-bg-elevated px-3 py-2.5">
      <Icon size={15} className={healthy ? 'text-accent' : 'text-danger'} />
      <span className="min-w-0 flex-1 text-xs font-medium">{label}</span>
      <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${healthy ? 'bg-accent-strong' : 'bg-danger'}`} />
        {detail}
      </span>
    </div>
  );
}

function UserIdentity({
  user,
}: {
  user: { name: string | null; email: string | null; image: string | null; isGuest: boolean };
}) {
  const name = user.name || (user.isGuest ? 'Гостьовий користувач' : 'Без імені');
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-bg-elevated text-xs font-bold text-text-muted">
        {user.image ? (
          <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          name.slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-text">{name}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-[10.5px] text-text-muted">
          {user.email ? <Mail size={10} /> : <UserRound size={10} />}
          {user.email || 'Локальний гостьовий акаунт'}
        </span>
      </span>
    </div>
  );
}
