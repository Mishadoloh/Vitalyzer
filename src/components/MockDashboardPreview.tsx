function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative h-[104px] w-[104px] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="9" fill="none" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth="9"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#34d399" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-text">{score}</span>
        <span className="text-[10px] text-text-muted">/ 100</span>
      </div>
    </div>
  );
}

function MiniBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-text-muted">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MockDashboardPreview() {
  return (
    <div className="w-full rounded-xl border border-border bg-gradient-to-br from-bg-card to-bg-elevated p-5 shadow-2xl shadow-black/40 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
          Порада на сьогодні
        </span>
        <span className="text-[11px] text-text-muted">сьогодні</span>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing score={87} />
        <div className="flex-1 space-y-2.5">
          <MiniBar label="Сон" pct={92} color="#6ee7b7" />
          <MiniBar label="Тренування" pct={78} color="#60a5fa" />
          <MiniBar label="Харчування" pct={84} color="#fbbf24" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-black/20 p-3 text-[12px] leading-relaxed text-text-muted">
        «Сон у нормі: 7.4 год/добу. Тренувальний ритм стабільний — 4/4 за тиждень. Додайте білок до вечері, щоб вийти
        на цільові 1.8 г/кг.»
      </div>
    </div>
  );
}
