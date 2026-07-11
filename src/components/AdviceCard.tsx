'use client';

import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import type { AdviceResult } from '@/lib/types';

export default function AdviceCard({
  advice,
  loading,
  onRefresh,
}: {
  advice: AdviceResult | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-border bg-bg-card p-5 shadow-sm shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-text">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
            <Sparkles size={16} />
          </span>
          Порада на сьогодні
        </h2>
        <button
          onClick={onRefresh}
          title="Оновити пораду"
          className="flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-border text-text-muted hover:border-accent hover:text-accent"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="mt-3 text-[14.5px] leading-relaxed">
        {loading && <p className="text-text-muted">Аналізуємо ваші дані...</p>}
        {!loading && (!advice || advice.items.length === 0) && (
          <p className="text-text-muted">
            Немає даних для аналізу. Додайте запис або імпортуйте дані, щоб отримати персональну пораду.
          </p>
        )}
        {!loading && advice && advice.items.length > 0 && (
          <>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
              {advice.source === 'ai' ? <Bot size={12} /> : <Sparkles size={12} />}
              {advice.tag} · {advice.source === 'ai' ? 'AI-аналіз' : 'Локальний аналіз'}
            </span>
            <ul className="mt-2 space-y-1.5 pl-5">
              {advice.items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
