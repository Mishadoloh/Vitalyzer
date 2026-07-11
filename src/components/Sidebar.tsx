'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Dumbbell,
  History,
  LayoutDashboard,
  Menu,
  Moon,
  PlusCircle,
  Settings as SettingsIcon,
  TrendingUp,
  UploadCloud,
  Utensils,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/app', label: 'Дашборд', icon: LayoutDashboard },
  { href: '/app/quick-add', label: 'Швидкий запис', icon: PlusCircle },
  { href: '/app/import', label: 'Імпорт даних', icon: UploadCloud },
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
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  return (
    <>
      <header className="flex items-center justify-between border-b border-border bg-bg-elevated px-4 py-3 md:hidden">
        <div className="flex items-center gap-2 text-lg font-bold">
          <span className="text-accent">◆</span>
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
        <div className="flex items-center gap-2 px-2 pb-6 pt-1.5 text-lg font-bold">
          <span className="text-accent">◆</span>
          <span>Vitalyzer</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm transition-colors ${
                  active ? 'bg-accent/10 font-semibold text-accent' : 'text-text-muted hover:bg-bg-card hover:text-text'
                }`}
              >
                {active && <span className="absolute left-0 top-1.5 h-[calc(100%-12px)] w-[3px] rounded-full bg-accent" />}
                <item.icon size={16} className="shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col gap-2 border-t border-border pt-4 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Moon size={13} className="text-accent" />
            <b className="text-text">{counts ? counts.sleep : '-'}</b> записів сну
          </div>
          <div className="flex items-center gap-2">
            <Dumbbell size={13} className="text-info" />
            <b className="text-text">{counts ? counts.workouts : '-'}</b> тренувань
          </div>
          <div className="flex items-center gap-2">
            <Utensils size={13} className="text-warn" />
            <b className="text-text">{counts ? counts.nutrition : '-'}</b> днів харчування
          </div>
        </div>
      </aside>
    </>
  );
}
