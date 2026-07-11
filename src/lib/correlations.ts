/*
 * correlations.ts
 * "Розумний шар" другого рівня: шукає статистичні звʼязки між категоріями
 * даних користувача (сон ↔ настрій, тренування ↔ сон тощо) і повертає
 * людською мовою сформульовані знахідки з коефіцієнтом кореляції Пірсона.
 * Виконується на сервері; кореляція рахується по днях, спільних для обох рядів.
 */

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  value: number;
}

export interface InsightFinding {
  id: string;
  title: string;
  detail: string;
  r: number; // Pearson correlation coefficient, -1..1
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative';
  sampleDays: number;
}

export interface InsightsResult {
  findings: InsightFinding[];
  bestDay: { weekday: string; avgMood: number } | null;
  worstDay: { weekday: string; avgMood: number } | null;
  daysAnalyzed: number;
}

const WEEKDAYS_UK = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', 'пʼятниця', 'субота'];

// Minimum overlapping days before we report anything: correlations on fewer
// points are statistical noise dressed up as insight.
const MIN_SAMPLE = 7;

export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return null;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  if (denX === 0 || denY === 0) return null; // constant series → correlation undefined
  return num / Math.sqrt(denX * denY);
}

function alignByDate(a: DailyRecord[], b: DailyRecord[]): { xs: number[]; ys: number[]; n: number } {
  const bByDate = new Map(b.map((r) => [r.date, r.value]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const rec of a) {
    const other = bByDate.get(rec.date);
    if (other !== undefined) {
      xs.push(rec.value);
      ys.push(other);
    }
  }
  return { xs, ys, n: xs.length };
}

// Shift series A one day back so we correlate "yesterday's A" with "today's B"
// (e.g. yesterday's workout vs tonight's sleep).
function shiftDates(records: DailyRecord[], days: number): DailyRecord[] {
  return records.map((r) => {
    const d = new Date(r.date);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return { date: `${y}-${m}-${day}`, value: r.value };
  });
}

function classify(r: number): { strength: InsightFinding['strength']; direction: InsightFinding['direction'] } {
  const abs = Math.abs(r);
  return {
    strength: abs >= 0.6 ? 'strong' : abs >= 0.35 ? 'moderate' : 'weak',
    direction: r >= 0 ? 'positive' : 'negative',
  };
}

interface PairSpec {
  id: string;
  a: DailyRecord[];
  b: DailyRecord[];
  lagDays?: number; // shift A forward by this many days before aligning
  titlePositive: string;
  titleNegative: string;
  detail: (r: number, n: number) => string;
}

export function computeInsights(input: {
  sleepHours: DailyRecord[];
  sleepQuality: DailyRecord[];
  mood: DailyRecord[];
  energy: DailyRecord[];
  stress: DailyRecord[];
  workoutMinutes: DailyRecord[]; // summed per day
  calories: DailyRecord[];
}): InsightsResult {
  const pairs: PairSpec[] = [
    {
      id: 'sleep-mood',
      a: input.sleepHours,
      b: input.mood,
      titlePositive: 'Більше сну — кращий настрій',
      titleNegative: 'Більше сну — гірший настрій',
      detail: (r, n) =>
        `У дні після довшого сну ваш настрій ${r > 0 ? 'помітно кращий' : 'несподівано гірший'} (r=${r.toFixed(2)} за ${n} днів).`,
    },
    {
      id: 'sleep-energy',
      a: input.sleepHours,
      b: input.energy,
      titlePositive: 'Сон заряджає вашу енергію',
      titleNegative: 'Довгий сон не додає вам енергії',
      detail: (r, n) =>
        `Тривалість сну і рівень енергії ${r > 0 ? 'йдуть рука в руку' : 'рухаються в протилежних напрямках'} (r=${r.toFixed(2)} за ${n} днів).`,
    },
    {
      id: 'workout-sleep',
      a: input.workoutMinutes,
      b: input.sleepQuality,
      lagDays: 1,
      titlePositive: 'Тренування покращують сон тієї ж ночі',
      titleNegative: 'Після тренувань ви спите гірше',
      detail: (r, n) =>
        `Якість сну в ночі після тренувальних днів ${r > 0 ? 'вища' : 'нижча'}, ніж зазвичай (r=${r.toFixed(2)} за ${n} днів).`,
    },
    {
      id: 'stress-sleep',
      a: input.stress,
      b: shiftDates(input.sleepHours, -1), // tonight's sleep follows today's stress
      titlePositive: 'У стресові дні ви спите довше',
      titleNegative: 'Стрес вкорочує ваш сон',
      detail: (r, n) =>
        `Після днів з високим стресом тривалість сну ${r > 0 ? 'зростає' : 'падає'} (r=${r.toFixed(2)} за ${n} днів).`,
    },
    {
      id: 'calories-energy',
      a: input.calories,
      b: input.energy,
      titlePositive: 'Калорійніші дні — більше енергії',
      titleNegative: 'Калорійніші дні — менше енергії',
      detail: (r, n) =>
        `Споживання калорій і відчуття енергії ${r > 0 ? 'повʼязані напряму' : 'повʼязані обернено'} (r=${r.toFixed(2)} за ${n} днів).`,
    },
  ];

  const findings: InsightFinding[] = [];
  for (const pair of pairs) {
    const shiftedA = pair.lagDays ? shiftDates(pair.a, pair.lagDays) : pair.a;
    const { xs, ys, n } = alignByDate(shiftedA, pair.b);
    if (n < MIN_SAMPLE) continue;
    const r = pearson(xs, ys);
    if (r === null) continue;
    const { strength, direction } = classify(r);
    if (strength === 'weak') continue; // don't surface noise
    findings.push({
      id: pair.id,
      title: r > 0 ? pair.titlePositive : pair.titleNegative,
      detail: pair.detail(r, n),
      r: Math.round(r * 100) / 100,
      strength,
      direction,
      sampleDays: n,
    });
  }
  findings.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  // Day-of-week mood pattern: which weekday tends to be your best/worst.
  let bestDay: InsightsResult['bestDay'] = null;
  let worstDay: InsightsResult['worstDay'] = null;
  if (input.mood.length >= MIN_SAMPLE) {
    const byWeekday = new Map<number, number[]>();
    for (const rec of input.mood) {
      const wd = new Date(rec.date).getDay();
      if (!byWeekday.has(wd)) byWeekday.set(wd, []);
      byWeekday.get(wd)!.push(rec.value);
    }
    const averages = Array.from(byWeekday.entries())
      .filter(([, vals]) => vals.length >= 2) // at least two observations of that weekday
      .map(([wd, vals]) => ({ wd, avg: vals.reduce((a, b) => a + b, 0) / vals.length }));
    if (averages.length >= 3) {
      averages.sort((a, b) => b.avg - a.avg);
      const best = averages[0];
      const worst = averages[averages.length - 1];
      if (best.avg - worst.avg >= 0.4) {
        bestDay = { weekday: WEEKDAYS_UK[best.wd], avgMood: Math.round(best.avg * 10) / 10 };
        worstDay = { weekday: WEEKDAYS_UK[worst.wd], avgMood: Math.round(worst.avg * 10) / 10 };
      }
    }
  }

  const allDates = new Set([
    ...input.sleepHours.map((r) => r.date),
    ...input.mood.map((r) => r.date),
    ...input.workoutMinutes.map((r) => r.date),
    ...input.calories.map((r) => r.date),
  ]);

  return { findings, bestDay, worstDay, daysAnalyzed: allDates.size };
}
