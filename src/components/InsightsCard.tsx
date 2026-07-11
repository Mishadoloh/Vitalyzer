'use client';

import { useEffect, useState } from 'react';
import { Activity, CalendarHeart, Link2, TrendingDown, TrendingUp } from 'lucide-react';
import type { InsightsResult } from '@/lib/correlations';

const STRENGTH_LABEL: Record<string, string> = {
  strong: 'сильний звʼязок',
  moderate: 'помітний звʼязок',
};

// Self-contained card: fetches /api/insights on mount, renders correlation
// findings in plain language. Shows nothing scary when data is too sparse —
// instead explains how many days are needed.
export default function InsightsCard() {
  const [insights, setInsights] = useState<InsightsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setInsights(data))
      .catch(() => setInsights(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="mt-6">
      <h2 className="mb-2.5 flex items-center gap-2 text-[15px] font-semibold">
        <Link2 size={16} className="text-accent" />
        Звʼязки у ваших даних
      </h2>

      <div className="rounded-2xl border border-border bg-bg-card p-4">
        {loading && <p className="m-0 text-[13px] text-text-muted">Аналізуємо звʼязки…</p>}

        {!loading && insights && insights.findings.length === 0 && !insights.bestDay && (
          <p className="m-0 text-[13px] text-text-muted">
            Поки що замало перетинів між категоріями ({insights.daysAnalyzed} дн. даних). Ведіть щоденник сну і
            настрою хоча б 7 днів поспіль — і тут зʼявляться персональні закономірності: як сон впливає на вашу
            енергію, чи допомагають тренування спати міцніше тощо.
          </p>
        )}

        {!loading && insights && insights.findings.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {insights.findings.map((f) => (
              <li key={f.id} className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    f.direction === 'positive' ? 'bg-accent/10 text-accent-strong' : 'bg-danger/10 text-danger'
                  }`}
                >
                  {f.direction === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13.5px] font-semibold text-text">{f.title}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10.5px] ${
                        f.strength === 'strong' ? 'bg-accent/15 text-accent' : 'bg-white/5 text-text-muted'
                      }`}
                    >
                      {STRENGTH_LABEL[f.strength]}
                    </span>
                  </div>
                  <p className="m-0 mt-0.5 text-[12.5px] leading-relaxed text-text-muted">{f.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && insights && (insights.bestDay || insights.worstDay) && (
          <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4">
            {insights.bestDay && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[12.5px]">
                <CalendarHeart size={14} className="text-accent-strong" />
                Найкращий день тижня: <b className="text-text">{insights.bestDay.weekday}</b>
                <span className="text-text-muted">(настрій {insights.bestDay.avgMood}/5)</span>
              </div>
            )}
            {insights.worstDay && (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-[12.5px]">
                <Activity size={14} className="text-warn" />
                Найважчий: <b className="text-text">{insights.worstDay.weekday}</b>
                <span className="text-text-muted">(настрій {insights.worstDay.avgMood}/5)</span>
              </div>
            )}
          </div>
        )}

        {!loading && !insights && (
          <p className="m-0 text-[13px] text-text-muted">Не вдалося завантажити аналіз звʼязків.</p>
        )}
      </div>
    </section>
  );
}
