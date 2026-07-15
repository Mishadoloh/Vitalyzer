'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  Camera,
  Dumbbell,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  PlusCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  Target,
  TrendingUp,
  UploadCloud,
  Utensils,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/app', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/app/quick-add', label: 'Швидкий запис', icon: PlusCircle },
  { href: '/app/progress-photos', label: 'Фото', icon: Camera },
  { href: '/app/import', label: 'Імпорт даних', icon: UploadCloud },
  { href: '/app/goals', label: 'Цілі', icon: Target },
  { href: '/app/trends', label: 'Тренди', icon: TrendingUp },
  { href: '/app/history', label: 'Історія', icon: History },
  { href: '/app/settings', label: 'Налаштування', icon: SettingsIcon },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [counts, setCounts] = useState<{ sleep: number; workouts: number; nutrition: number } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (document.visibilityState === 'hidden') return;
      try {
        const [sleep, workouts, nutrition] = await Promise.all([
          fetch('/api/sleep').then((response) => response.json()),
          fetch('/api/workouts').then((response) => response.json()),
          fetch('/api/nutrition').then((response) => response.json()),
        ]);
        if (!cancelled) {
          setCounts({ sleep: sleep.length, workouts: workouts.length, nutrition: nutrition.length });
        }
      } catch {
        // Sidebar summary is non-critical.
      }
    }
    load();
    const interval = setInterval(load, 30000);
    document.addEventListener('visibilitychange', load);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', load);
    };
  }, [pathname]);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg-elevated/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent/10 text-accent">◆</span>
          <span>Vitalyzer</span>
        </div>
        <button
          onClick={() => setOpen((value) => !value)}
          aria-label="Меню"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/55 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[240px] shrink-0 flex-col border-r border-border bg-bg-elevated p-3.5 transition-transform duration-200 md:static md:z-auto md:w-[220px] md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-5 rounded-2xl border border-border bg-bg-card p-3">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-accent/10 text-accent">◆</span>
            <span>Vitalyzer</span>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
            <ShieldCheck size={12} />
            приватний дашборд
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
                {item.label}
              </Link>
            );
          })}
        </nav>
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

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 rounded-2xl border border-border bg-bg-elevated/95 p-1 shadow-2xl shadow-black/35 backdrop-blur md:hidden">
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
              <span className="max-w-full truncate">{item.label.replace(' даних', '')}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
