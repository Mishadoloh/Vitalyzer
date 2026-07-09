/*
 * insights.ts
 * Серверний аналітичний рушій ("розумний шар"): рахує тренди, оцінки
 * та формує персоналізовані щоденні поради на основі правил і статистики.
 * Використовується як основа, і як фолбек, коли AI (Claude API) не налаштований.
 */
import type { AdviceResult, MoodStats, NutritionStats, Settings, SleepStats, WeightStats, WorkoutStats } from './types';

export interface SleepRow {
  date: string;
  hours: number;
  quality: number | null;
}
export interface WorkoutRow {
  date: string;
  type: string;
  durationMin: number;
  calories: number | null;
}
export interface NutritionRow {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}
export interface WeightRow {
  date: string;
  weightKg: number;
}
export interface MoodRow {
  date: string;
  mood: number;
  energy: number;
  stress: number | null;
}

export function todayISO(): string {
  return normalizeToISO(new Date());
}

export function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return normalizeToISO(d);
}

function normalizeToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function filterRange<T extends { date: string }>(arr: T[], fromISO: string, toISO: string): T[] {
  return arr.filter((r) => r.date >= fromISO && r.date <= toISO).sort((a, b) => (a.date < b.date ? -1 : 1));
}

function average(nums: (number | null | undefined)[]): number | null {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function stdev(nums: (number | null | undefined)[]): number {
  const valid = nums.filter((n): n is number => n !== null && n !== undefined && !isNaN(n));
  if (valid.length < 2) return 0;
  const avg = average(valid) ?? 0;
  const variance = valid.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / valid.length;
  return Math.sqrt(variance);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function round1(n: number | null): number | null {
  return n === null || n === undefined ? null : Math.round(n * 10) / 10;
}

export function sleepStats(sleepAll: SleepRow[], settings: Settings, days = 7): SleepStats {
  const to = todayISO();
  const from = daysAgoISO(days - 1);
  const week = filterRange(sleepAll, from, to);
  const prevWeek = filterRange(sleepAll, daysAgoISO(days * 2 - 1), daysAgoISO(days));

  const hoursArr = week.map((r) => r.hours);
  const avgHours = average(hoursArr);
  const prevAvgHours = average(prevWeek.map((r) => r.hours));
  const variance = stdev(hoursArr);
  const avgQuality = average(week.map((r) => r.quality));
  const debt = avgHours !== null ? (settings.sleepTarget - avgHours) * week.length : null;

  let score: number | null = null;
  if (avgHours !== null) {
    const diff = Math.abs(avgHours - settings.sleepTarget);
    let base = 100 - diff * 18;
    base -= variance * 6;
    score = clamp(Math.round(base), 0, 100);
  }

  return {
    daysLogged: week.length,
    avgHours: round1(avgHours),
    prevAvgHours: round1(prevAvgHours),
    variance: round1(variance),
    avgQuality: round1(avgQuality),
    debtHours: debt !== null ? round1(debt) : null,
    score,
  };
}

export function workoutStats(workoutsAll: WorkoutRow[], settings: Settings, days = 7): WorkoutStats {
  const to = todayISO();
  const from = daysAgoISO(days - 1);
  const week = filterRange(workoutsAll, from, to);
  const prevWeek = filterRange(workoutsAll, daysAgoISO(days * 2 - 1), daysAgoISO(days));

  const count = week.length;
  const totalMin = week.reduce((s, w) => s + (w.durationMin || 0), 0);
  const totalCalories = week.reduce((s, w) => s + (w.calories || 0), 0);
  const target = settings.workoutsTarget || 3;

  const sortedAll = [...workoutsAll].sort((a, b) => (a.date < b.date ? 1 : -1));
  const lastDate = sortedAll.length ? sortedAll[0].date : null;
  let daysSinceLast: number | null = null;
  if (lastDate) {
    daysSinceLast = Math.round((new Date(to).getTime() - new Date(lastDate).getTime()) / 86400000);
  }

  let score: number | null = null;
  if (target > 0) {
    let freqScore = clamp((count / target) * 100, 0, 130);
    if (freqScore > 100) freqScore = 200 - freqScore;
    score = clamp(Math.round(freqScore), 0, 100);
  }

  const overtrainingRisk = count > target * 1.6 && totalMin > 500;
  const inactivityRisk = daysSinceLast !== null && daysSinceLast >= 4;

  return {
    count,
    prevCount: prevWeek.length,
    totalMin,
    totalCalories,
    target,
    daysSinceLast,
    score,
    overtrainingRisk,
    inactivityRisk,
  };
}

export function nutritionStats(nutritionAll: NutritionRow[], settings: Settings, days = 7): NutritionStats {
  const to = todayISO();
  const from = daysAgoISO(days - 1);
  const week = filterRange(nutritionAll, from, to);
  const prevWeek = filterRange(nutritionAll, daysAgoISO(days * 2 - 1), daysAgoISO(days));

  const avgCal = average(week.map((r) => r.calories));
  const prevAvgCal = average(prevWeek.map((r) => r.calories));
  const avgProtein = average(week.map((r) => r.proteinG));
  const avgCarbs = average(week.map((r) => r.carbsG));
  const avgFat = average(week.map((r) => r.fatG));
  const avgWater = average(week.map((r) => r.waterMl));
  const proteinPerKg = avgProtein !== null && settings.weightKg ? avgProtein / settings.weightKg : null;

  let score: number | null = null;
  if (avgCal !== null) {
    const calDiffPct = (Math.abs(avgCal - settings.calTarget) / settings.calTarget) * 100;
    let base = 100 - calDiffPct * 2.2;
    if (proteinPerKg !== null && settings.proteinTarget) {
      const proteinDiff = Math.abs(proteinPerKg - settings.proteinTarget);
      base -= proteinDiff * 12;
    }
    score = clamp(Math.round(base), 0, 100);
  }

  return {
    daysLogged: week.length,
    avgCalories: avgCal !== null ? Math.round(avgCal) : null,
    prevAvgCalories: prevAvgCal !== null ? Math.round(prevAvgCal) : null,
    avgProtein: round1(avgProtein),
    avgCarbs: round1(avgCarbs),
    avgFat: round1(avgFat),
    avgWater: avgWater !== null ? Math.round(avgWater) : null,
    proteinPerKg: round1(proteinPerKg),
    score,
  };
}

export function weightStats(weightAll: WeightRow[], days = 7): WeightStats {
  const to = todayISO();
  const from = daysAgoISO(days - 1);
  const week = filterRange(weightAll, from, to);
  const prevWeekPoint = filterRange(weightAll, daysAgoISO(days * 2 - 1), daysAgoISO(days));

  const sortedAll = [...weightAll].sort((a, b) => (a.date < b.date ? 1 : -1));
  const latestKg = sortedAll.length ? sortedAll[0].weightKg : null;
  const weekAgoKg = prevWeekPoint.length ? prevWeekPoint[prevWeekPoint.length - 1].weightKg : week.length ? week[0].weightKg : null;

  let trendKgPerWeek: number | null = null;
  if (latestKg !== null && weekAgoKg !== null) {
    trendKgPerWeek = round1(latestKg - weekAgoKg);
  }

  return {
    daysLogged: week.length,
    latestKg: round1(latestKg),
    weekAgoKg: round1(weekAgoKg),
    trendKgPerWeek,
  };
}

export function moodStats(moodAll: MoodRow[], days = 7): MoodStats {
  const to = todayISO();
  const from = daysAgoISO(days - 1);
  const week = filterRange(moodAll, from, to);
  const prevWeek = filterRange(moodAll, daysAgoISO(days * 2 - 1), daysAgoISO(days));

  return {
    daysLogged: week.length,
    avgMood: round1(average(week.map((r) => r.mood))),
    avgEnergy: round1(average(week.map((r) => r.energy))),
    avgStress: round1(average(week.map((r) => r.stress))),
    prevAvgMood: round1(average(prevWeek.map((r) => r.mood))),
    prevAvgEnergy: round1(average(prevWeek.map((r) => r.energy))),
  };
}

export function overallScore(s: SleepStats, w: WorkoutStats, n: NutritionStats): number | null {
  const scores = [s.score, w.score, n.score].filter((x): x is number => x !== null);
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function generateRuleBasedAdvice(
  sleepAll: SleepRow[],
  workoutsAll: WorkoutRow[],
  nutritionAll: NutritionRow[],
  settings: Settings,
  weightAll: WeightRow[] = [],
  moodAll: MoodRow[] = []
): AdviceResult {
  const s = sleepStats(sleepAll, settings);
  const w = workoutStats(workoutsAll, settings);
  const n = nutritionStats(nutritionAll, settings);
  const wt = weightStats(weightAll);
  const md = moodStats(moodAll);
  const overall = overallScore(s, w, n);

  const items: string[] = [];

  if (s.avgHours !== null) {
    if (s.avgHours < settings.sleepTarget - 0.75) {
      items.push(
        `Середній сон за тиждень — ${s.avgHours} год, що менше цілі (${settings.sleepTarget} год). Спробуйте лягати на 30–45 хв раніше найближчі кілька днів, щоб скоротити накопичений дефіцит (${s.debtHours ?? '?'} год).`
      );
    } else if (s.avgHours > settings.sleepTarget + 1) {
      items.push(`Ви спите в середньому ${s.avgHours} год — помітно більше цілі. Якщо це не відновлення після навантажень, варто перевірити якість сну та регулярність режиму.`);
    } else {
      items.push(`Сон у нормі: в середньому ${s.avgHours} год/добу, близько до цілі ${settings.sleepTarget} год.`);
    }
    if (s.variance !== null && s.variance > 1.2) {
      items.push(`Розкид тривалості сну доволі великий (±${s.variance} год) — нерегулярний графік сну знижує якість відновлення. Спробуйте стабільніший час відходу до сну.`);
    }
    if (s.prevAvgHours !== null && s.avgHours !== null) {
      const delta = round1(s.avgHours - s.prevAvgHours) ?? 0;
      if (Math.abs(delta) >= 0.5) {
        items.push(`Тренд сну ${delta > 0 ? '↑ покращується' : '↓ погіршується'}: ${delta > 0 ? '+' : ''}${delta} год порівняно з попереднім тижнем.`);
      }
    }
  } else {
    items.push('Немає даних про сон за останній тиждень — імпортуйте свіжий експорт, щоб отримати аналіз відновлення.');
  }

  if (w.count > 0 || workoutsAll.length > 0) {
    if (w.inactivityRisk) {
      items.push(`Останнє тренування було ${w.daysSinceLast} дн. тому. Легка активність (прогулянка, розтяжка 20–30 хв) допоможе повернутись у ритм без перевантаження.`);
    } else if (w.count < w.target) {
      items.push(`За останні 7 днів ${w.count} тренування з цілі ${w.target}. Розгляньте одне додаткове легке тренування, щоб вийти на план.`);
    } else if (w.overtrainingRisk) {
      items.push(`Тренувань цього тижня (${w.count}) суттєво більше за ціль (${w.target}), сумарно ${Math.round(w.totalMin)} хв. Якщо сон при цьому нижче норми — це сигнал додати день відновлення.`);
    } else {
      items.push(`Тренувальний ритм стабільний: ${w.count}/${w.target} за тиждень.`);
    }

    if (w.overtrainingRisk && s.avgHours !== null && s.avgHours < settings.sleepTarget - 0.5) {
      items.push('Поєднання високого навантаження і нестачі сну підвищує ризик перетренованості та травм — сьогодні краще легке відновлювальне заняття замість інтенсивного.');
    }
  } else {
    items.push('Тренувань ще не імпортовано. Додайте дані з вашого фітнес-трекера на вкладці «Імпорт даних».');
  }

  if (n.avgCalories !== null) {
    const calDiff = n.avgCalories - settings.calTarget;
    if (Math.abs(calDiff) > settings.calTarget * 0.15) {
      const dir = calDiff > 0 ? 'вище' : 'нижче';
      items.push(`Середнє споживання калорій (${n.avgCalories} ккал) помітно ${dir} цілі (${settings.calTarget} ккал) — це ${calDiff > 0 ? 'профіцит' : 'дефіцит'} приблизно ${Math.abs(Math.round(calDiff))} ккал/день.`);
    }
    if (n.proteinPerKg !== null && settings.proteinTarget && n.proteinPerKg < settings.proteinTarget - 0.3) {
      items.push(`Білок в середньому ${n.proteinPerKg} г/кг — нижче цілі ${settings.proteinTarget} г/кг. Додайте білкове джерело (яйця, риба, бобові, протеїн) до 1–2 прийомів їжі.`);
    }
    if (n.avgWater !== null && n.avgWater > 0 && n.avgWater < 1800) {
      items.push(`Гідратація в середньому ${n.avgWater} мл/день — трохи мало, особливо у дні тренувань. Тримайте пляшку води на видноті як нагадування.`);
    }
  } else {
    items.push('Даних про харчування немає — імпортуйте щоденник харчування, щоб отримати рекомендації по калоріях та білку.');
  }

  if (wt.latestKg !== null && wt.trendKgPerWeek !== null && Math.abs(wt.trendKgPerWeek) >= 0.2) {
    const dir = wt.trendKgPerWeek > 0 ? 'зросла' : 'зменшилась';
    if (settings.goal === 'lose' && wt.trendKgPerWeek > 0) {
      items.push(`Вага за тиждень ${dir} на ${Math.abs(wt.trendKgPerWeek)} кг, хоча ціль — схуднення. Перевірте калорійність раціону відносно цілі (${settings.calTarget} ккал).`);
    } else if (settings.goal === 'gain' && wt.trendKgPerWeek < 0) {
      items.push(`Вага за тиждень ${dir} на ${Math.abs(wt.trendKgPerWeek)} кг, хоча ціль — набір маси. Можливо, варто трохи підняти калорійність.`);
    } else {
      items.push(`Вага за тиждень ${dir} на ${Math.abs(wt.trendKgPerWeek)} кг (зараз ${wt.latestKg} кг) — це узгоджується з вашою ціллю.`);
    }
  }

  if (md.avgMood !== null || md.avgEnergy !== null) {
    if (md.avgEnergy !== null && md.avgEnergy <= 2.5 && s.avgHours !== null && s.avgHours < settings.sleepTarget - 0.5) {
      items.push('Низька енергія цього тижня, ймовірно, пов\'язана з дефіцитом сну — це найшвидший важіль для покращення самопочуття найближчими днями.');
    } else if (md.avgMood !== null && md.prevAvgMood !== null && md.avgMood - md.prevAvgMood <= -0.8) {
      items.push(`Настрій помітно погіршився порівняно з минулим тижнем (${md.avgMood}/5 проти ${md.prevAvgMood}/5). Зверніть увагу на сон, навантаження і відновлення.`);
    } else if (md.avgStress !== null && md.avgStress >= 3.8) {
      items.push(`Рівень стресу підвищений (${md.avgStress}/5) — короткі перерви, прогулянки або дихальні вправи протягом дня можуть допомогти.`);
    }
  }

  let tag = 'Загальний огляд';
  if (overall !== null) {
    if (overall >= 80) tag = 'Все під контролем';
    else if (overall >= 60) tag = 'Непогано, є що покращити';
    else tag = 'Варто звернути увагу';
  }

  return {
    source: 'rules',
    tag,
    overallScore: overall,
    scores: { sleep: s.score, workouts: w.score, nutrition: n.score },
    stats: { sleep: s, workouts: w, nutrition: n, weight: wt, mood: md },
    items,
    generatedAt: new Date().toISOString(),
  };
}
