'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  Activity,
  Camera,
  CalendarRange,
  Dumbbell,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  PlusCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  ShieldEllipsis,
  Target,
  TrendingUp,
  UploadCloud,
  Utensils,
  UserRound,
  X,
} from 'lucide-react';
import GoogleLogo from './GoogleLogo';
import LanguageSwitcher from './LanguageSwitcher';

const NAV = [
  { href: '/app', key: 'dashboard', shortKey: 'overview', icon: LayoutDashboard },
  { href: '/app/quick-add', key: 'quickAdd', shortKey: 'add', icon: PlusCircle },
  { href: '/app/weekly-report', key: 'week', shortKey: 'week', icon: CalendarRange },
  { href: '/app/habits', key: 'habits', shortKey: 'habits', icon: Activity },
  { href: '/app/progress-photos', key: 'photos', shortKey: 'photos', icon: Camera },
  { href: '/app/import', key: 'import', shortKey: 'import', icon: UploadCloud },
  { href: '/app/goals', key: 'goals', shortKey: 'goals', icon: Target },
  { href: '/app/trends', key: 'trends', shortKey: 'trends', icon: TrendingUp },
  { href: '/app/history', key: 'history', shortKey: 'history', icon: History },
  { href: '/app/profile', key: 'profile', shortKey: 'profile', icon: UserRound },
  { href: '/app/settings', key: 'settings', shortKey: 'options', icon: SettingsIcon },
] as const;

export default function Sidebar() {
  const t = useTranslations('Navigation');
  const common = useTranslations('Common');
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [counts, setCounts] = useState<{ sleep: number; workouts: number; nutrition: number } | null>(null);
  const [open, setOpen] = useState(false);
  const isGuest = Boolean((session?.user as { isGuest?: boolean } | undefined)?.isGuest);
  const isAdmin = Boolean((session?.user as { isAdmin?: boolean } | undefined)?.isAdmin);
  const googleAccount = status === 'authenticated' && !isGuest;
  const accountName = session?.user?.name || session?.user?.email || common('guestMode');

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/sidebar-summary');
        if (!response.ok) return;
        const summary = await response.json() as { sleep?: number; workouts?: number; nutrition?: number };
        if (!cancelled) {
          setCounts({
            sleep: Number(summary.sleep) || 0,
            workouts: Number(summary.workouts) || 0,
            nutrition: Number(summary.nutrition) || 0,
          });
        }
      } catch {
        // Sidebar summary is non-critical.
      }
    }
    load();
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', load);
    };
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">◆</span>
          <span>Metrivyn</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <Link
            href="/app/profile"
            aria-label={googleAccount ? 'Вхід через Google підтверджено' : 'Гостьовий режим'}
            className={`grid h-9 w-9 place-items-center rounded-lg border ${googleAccount ? 'border-accent/30 bg-accent/10' : 'border-border bg-bg-card'}`}
          >
            {googleAccount ? <GoogleLogo size={16} /> : <ShieldCheck size={15} className="text-text-muted" />}
          </Link>
          <button
            onClick={() => setOpen((value) => !value)}
            aria-label="Меню"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
          >
            {open ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/55 lg:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,86vw)] shrink-0 flex-col border-r border-border bg-bg-elevated p-3.5 transition-transform duration-200 lg:static lg:z-auto lg:w-[220px] lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 rounded-2xl border border-border bg-bg-card p-3">
          <div className="flex min-w-0 items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">◆</span>
            <span className="min-w-0 truncate">Metrivyn</span>
          </div>
          <div className="mt-3"><LanguageSwitcher segmented /></div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
            <ShieldCheck size={12} />
            {common('privateDashboard')}
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active ? 'border border-accent/20 bg-accent/10 font-semibold text-accent shadow-sm shadow-black/15' : 'border border-transparent text-text-muted hover:border-border hover:bg-bg-card hover:text-text'
                }`}
              >
                {active && <span className="absolute left-1 top-2 h-[calc(100%-16px)] w-[3px] rounded-full bg-accent" />}
                <item.icon size={16} className="shrink-0" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>
        {isAdmin && (
          <Link
            href="/admin"
            className="mb-2 flex items-center gap-2.5 rounded-xl border border-info/25 bg-info/10 px-3 py-2.5 text-sm font-semibold text-info transition-colors hover:border-info/50"
          >
            <ShieldEllipsis size={16} />
            Адмін-панель
          </Link>
        )}
        <Link
          href="/app/profile"
          className={`mb-3 flex items-center gap-2.5 rounded-xl border p-3 transition-colors hover:bg-bg-card ${
            googleAccount ? 'border-accent/25 bg-accent/5' : 'border-border bg-bg-card/60'
          }`}
        >
          <span className={`grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg ${googleAccount ? 'bg-white' : 'bg-bg-elevated text-sm font-bold text-text-muted'}`}>
            {session?.user?.image ? (
              <img src={session.user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : googleAccount ? <GoogleLogo size={17} /> : accountName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-text">{accountName}</span>
            <span className={`mt-0.5 flex items-center gap-1.5 text-[10.5px] ${googleAccount ? 'text-accent' : 'text-warn'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${googleAccount ? 'bg-accent' : 'bg-warn'}`} />
              {googleAccount ? common('googleConnected') : common('guestMode')}
            </span>
          </span>
        </Link>
        <div className="rounded-2xl border border-border bg-bg-card p-3 text-xs text-text-muted">
          <div className="mb-3 flex items-center gap-2 font-semibold text-text">
            <Activity size={13} className="text-accent" />
            Дані зараз
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border py-2">
            <span className="flex items-center gap-2">
              <Moon size={13} className="text-accent" />
              Сон
            </span>
            <b className="text-text">{counts ? counts.sleep : '-'}</b>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border py-2">
            <span className="flex items-center gap-2">
              <Dumbbell size={13} className="text-info" />
              Тренування
            </span>
            <b className="text-text">{counts ? counts.workouts : '-'}</b>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <span className="flex items-center gap-2">
              <Utensils size={13} className="text-warn" />
              Харчування
            </span>
            <b className="text-text">{counts ? counts.nutrition : '-'}</b>
          </div>
        </div>
      </aside>

      <nav className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 gap-1 rounded-2xl border border-border bg-bg-elevated/95 p-1 shadow-2xl shadow-black/35 backdrop-blur lg:hidden">
        {NAV.slice(0, 5).map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-[10.5px] transition-colors ${
                active ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-bg-card hover:text-text'
              }`}
            >
              <item.icon size={17} />
              <span className="max-w-full truncate">{t(item.shortKey)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
