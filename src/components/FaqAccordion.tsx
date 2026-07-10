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
            className={`group overflow-hidden rounded-lg border bg-bg-card/80 shadow-lg shadow-black/10 transition-all duration-300 ${
              open ? 'border-accent/50 bg-bg-elevated/90 shadow-accent/5' : 'border-border/80 hover:border-text-muted/35 hover:bg-bg-card'
            }`}
          >
            <button
              onClick={() => setOpenIndex(open ? null : i)}
              className="flex w-full items-center gap-3 px-4 py-4 text-left sm:px-5"
              aria-expanded={open}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  open ? 'bg-accent/15 text-accent' : 'bg-white/5 text-text-muted group-hover:bg-white/8 group-hover:text-text'
                }`}
              >
                <HelpCircle size={15} />
              </span>
              <span className="flex-1 text-[14px] font-semibold leading-snug text-text">{item.q}</span>
              <ChevronDown
                size={17}
                className={`shrink-0 text-text-muted transition-transform duration-300 ${open ? 'rotate-180 text-accent' : 'group-hover:text-text'}`}
              />
            </button>
            <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
              <div className="overflow-hidden">
                <div className="px-4 pb-5 pl-[60px] pr-6 text-[13.5px] leading-7 text-text-muted">{item.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
