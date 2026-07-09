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
    <div className="mb-5 rounded-2xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="m-0 flex items-center gap-2 text-base font-semibold text-accent">
          <Sparkles size={17} />
          Порада на сьогодні
        </h2>
        <button
          onClick={onRefresh}
          title="Оновити пораду"
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-border text-text-muted hover:border-accent hover:text-accent"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      <div className="mt-2.5 text-[14.5px] leading-relaxed">
        {loading && <p className="text-text-muted">Аналізуємо ваші дані...</p>}
        {!loading && (!advice || advice.items.length === 0) && (
          <p className="text-text-muted">
            Немає даних для аналізу. Імпортуйте дані на вкладці «Імпорт даних», щоб отримати персональну пораду.
          </p>
        )}
        {!loading && advice && advice.items.length > 0 && (
          <>
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] text-accent">
              {advice.source === 'ai' ? <Bot size={12} /> : <Sparkles size={12} />}
              {advice.tag} · {advice.source === 'ai' ? 'AI-аналіз (Claude)' : 'Локальний аналіз'}
            </span>
            <ul className="mt-2 list-disc pl-5">
              {advice.items.map((item, i) => (
                <li key={i} className="mb-1.5">
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
