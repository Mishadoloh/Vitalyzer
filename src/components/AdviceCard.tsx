'use client';

import { CheckCircle2, Lightbulb, RefreshCw } from 'lucide-react';
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
    <div className="mb-5 overflow-hidden rounded-3xl border border-border bg-[linear-gradient(135deg,rgba(27,31,42,0.98),rgba(20,24,33,0.98))] shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-text">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Lightbulb size={16} />
          </span>
          <span>
            Порада на сьогодні
            <span className="mt-0.5 block text-[11px] font-normal text-text-muted">коротко, практично, по ваших даних</span>
          </span>
        </h2>
        <button
          onClick={onRefresh}
          title="Оновити пораду"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-bg-elevated text-text-muted hover:border-accent hover:text-accent"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="p-4 text-[14.5px] leading-relaxed sm:p-5">
        {loading && <p className="text-text-muted">Аналізуємо ваші дані...</p>}
        {!loading && (!advice || advice.items.length === 0) && (
          <p className="text-text-muted">
            Немає даних для аналізу. Додайте запис або імпортуйте дані, щоб отримати персональну пораду.
          </p>
        )}
        {!loading && advice && advice.items.length > 0 && (
          <>
            <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
              <Lightbulb size={12} />
              {advice.tag} · за вашими даними
            </span>
            <ul className="mt-2 space-y-2">
              {advice.items.map((item, index) => (
                <li key={index} className="flex gap-2 rounded-2xl border border-border bg-bg-elevated/70 p-3">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
