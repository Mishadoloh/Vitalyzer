'use client';

import { useEffect, useState } from 'react';
import {useLocale} from 'next-intl';
import Link from 'next/link';
import { CalendarRange, Camera, CheckCircle2, Dumbbell, Lightbulb, Loader2, Moon, Scale, Utensils } from 'lucide-react';

interface Report {
  period: { start: string; end: string };
  summary: { avgSleep: number; sleepDays: number; weightLatest: number | null; weightDelta: number | null; avgCalories: number; avgProtein: number; workouts: number; workoutMinutes: number; habitPercent: number; photos: number; avgMood: number };
  goals: { sleep: number; protein: number; workouts: number };
  insights: Array<{ tone: 'good' | 'warn' | 'info'; text: string }>;
}

export default function WeeklyReportPage() {
  const locale = useLocale();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/weekly-report', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Не вдалося сформувати звіт');
        return response.json();
      })
      .then(setReport)
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  if (!report) return <div className="grid min-h-[55vh] place-items-center text-sm text-text-muted">{error || <span className="inline-flex items-center gap-2"><Loader2 size={17} className="animate-spin" /> Формуємо тиждень...</span>}</div>;

  const s = report.summary;
  const dateLocale = {uk: 'uk-UA', en: 'en-US', pl: 'pl-PL', de: 'de-DE'}[locale] || 'uk-UA';
  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
  return (
    <section className="pb-8">
      <header className="mb-5 rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,.98),rgba(12,24,26,.98))] p-5 shadow-xl shadow-black/20 sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs text-accent"><CalendarRange size={14} /> {formatDate(report.period.start)} — {formatDate(report.period.end)}</span>
        <h1 className="mt-4 text-2xl font-bold text-text">Ваш тиждень</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">Один екран для сну, ваги, харчування, тренувань, звичок і фото. Дані оновлюються автоматично.</p>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Metric icon={Moon} label="Сон" value={s.sleepDays ? `${s.avgSleep} год` : '—'} detail={`${s.sleepDays}/7 днів`} progress={s.avgSleep / report.goals.sleep * 100} />
        <Metric icon={Scale} label="Вага" value={s.weightLatest === null ? '—' : `${s.weightLatest} кг`} detail={s.weightDelta === null ? 'немає тренду' : `${s.weightDelta > 0 ? '+' : ''}${s.weightDelta} кг`} />
        <Metric icon={Utensils} label="Харчування" value={s.avgCalories ? `${s.avgCalories} ккал` : '—'} detail={`${s.avgProtein}/${report.goals.protein} г білка`} progress={s.avgProtein / report.goals.protein * 100} />
        <Metric icon={Dumbbell} label="Тренування" value={`${s.workouts}/${report.goals.workouts}`} detail={`${s.workoutMinutes} хв`} progress={s.workouts / report.goals.workouts * 100} />
        <Metric icon={CheckCircle2} label="Звички" value={`${s.habitPercent}%`} detail="42 можливі чеки" progress={s.habitPercent} />
        <Metric icon={Camera} label="Фото" value={String(s.photos)} detail={s.photos ? 'цього тижня' : 'додайте знімок'} />
      </div>

      <section className="mb-4 rounded-3xl border border-border bg-bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><Lightbulb size={17} className="text-warn" /><h2 className="text-base font-semibold text-text">Короткі висновки</h2></div>
        <div className="grid gap-3 lg:grid-cols-3">
          {report.insights.map((insight, index) => <article key={index} className={`rounded-2xl border p-4 text-sm leading-6 ${insight.tone === 'warn' ? 'border-warn/30 bg-warn/10' : insight.tone === 'good' ? 'border-accent/30 bg-accent/10' : 'border-info/30 bg-info/10'} text-text`}>{insight.text}</article>)}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-border bg-bg-card p-5">
          <h2 className="text-base font-semibold text-text">Фокус наступного тижня</h2>
          <p className="mt-2 text-sm leading-6 text-text-muted">Почніть із показника, який найбільше відстає від цілі. Один стабільний крок корисніший за шість нових правил одразу.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Focus label="Сон" value={s.avgSleep} target={report.goals.sleep} suffix="год" />
            <Focus label="Білок" value={s.avgProtein} target={report.goals.protein} suffix="г" />
            <Focus label="Тренування" value={s.workouts} target={report.goals.workouts} suffix="" />
          </div>
        </div>
        <aside className="rounded-3xl border border-border bg-bg-card p-5">
          <h2 className="text-base font-semibold text-text">Доповнити звіт</h2>
          <p className="mt-2 text-xs leading-5 text-text-muted">Запишіть сьогоднішні показники, щоб наступний висновок був точнішим.</p>
          <Link href="/app/quick-add" className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-accent-strong px-4 py-3 text-sm font-semibold text-[#06281c]">Швидкий запис</Link>
        </aside>
      </section>
    </section>
  );
}

function Metric({ icon: Icon, label, value, detail, progress }: { icon: typeof Moon; label: string; value: string; detail: string; progress?: number }) {
  return <article className="min-w-0 rounded-2xl border border-border bg-bg-card p-4"><Icon size={16} className="text-accent" /><div className="mt-3 text-xs text-text-muted">{label}</div><div className="mt-1 truncate text-xl font-bold text-text">{value}</div><div className="mt-1 truncate text-[11px] text-text-muted">{detail}</div>{progress !== undefined && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-elevated"><div className="h-full rounded-full bg-accent-strong" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} /></div>}</article>;
}

function Focus({ label, value, target, suffix }: { label: string; value: number; target: number; suffix: string }) {
  const percent = target ? Math.round(Math.min(100, value / target * 100)) : 0;
  return <div className="rounded-xl border border-border bg-bg-elevated p-3"><div className="flex items-center justify-between gap-2 text-xs text-text-muted"><span>{label}</span><b className="text-text">{percent}%</b></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-card"><div className="h-full rounded-full bg-accent-strong" style={{ width: `${percent}%` }} /></div><div className="mt-2 text-[11px] text-text-muted">{value || 0}{suffix ? ` ${suffix}` : ''} / {target}{suffix ? ` ${suffix}` : ''}</div></div>;
}
