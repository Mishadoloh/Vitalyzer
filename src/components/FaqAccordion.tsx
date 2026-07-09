'use client';

import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export interface FaqItem {
  q: string;
  a: string;
}

export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <div
            key={item.q}
            className={`overflow-hidden rounded-xl border bg-bg-card transition-colors ${
              open ? 'border-accent/40' : 'border-border'
            }`}
          >
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left"
              aria-expanded={open}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  open ? 'bg-accent/15 text-accent' : 'bg-white/5 text-text-muted'
                }`}
              >
                <HelpCircle size={15} />
              </span>
              <span className="flex-1 text-[13.5px] font-semibold text-text">{item.q}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-text-muted transition-transform duration-300 ${open ? 'rotate-180 text-accent' : ''}`}
              />
            </button>
            <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pl-[52px] text-[13px] leading-relaxed text-text-muted">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
