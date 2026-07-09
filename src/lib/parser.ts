/*
 * parser.ts
 * Читання CSV/Excel файлів у браузері, автовизначення типу даних
 * (сон/тренування/харчування) та полів, нормалізація у внутрішній формат.
 * Використовується лише на клієнті (потребує File API); результат (масив
 * нормалізованих записів) надсилається на /api/import.
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type {
  EntryType,
  FieldMapping,
  ParsedFile,
  MoodRecordInput,
  NutritionRecordInput,
  SleepRecordInput,
  WeightRecordInput,
  WorkoutRecordInput,
} from './types';

const TYPE_KEYWORDS: Record<EntryType, string[]> = {
  sleep: ['sleep', 'сон', 'bedtime', 'wake', 'inbed', 'in bed', 'asleep', 'rem', 'deep sleep', 'sleep hours', 'duration_asleep'],
  workouts: ['workout', 'exercise', 'activity', 'тренування', 'training', 'run', 'ride', 'distance', 'pace', 'heart rate', 'avg hr', 'reps', 'sets', 'calories burned', 'elevation'],
  nutrition: ['calorie', 'калор', 'protein', 'білок', 'carb', 'вуглевод', 'fat', 'жир', 'meal', 'food', 'nutrition', 'water', 'вода', 'sugar', 'fiber'],
  weight: ['weight', 'вага', 'body fat', 'bodyfat', 'жир тіла', 'bmi'],
  mood: ['mood', 'настрій', 'energy', 'енергія', 'stress', 'стрес', 'wellbeing', 'самопочуття'],
};

export const FIELD_ALIASES: Record<EntryType, Record<string, string[]>> = {
  sleep: {
    date: ['date', 'day', 'дата', 'start', 'sleep date', 'night'],
    hours: ['hours', 'duration', 'sleep hours', 'time asleep', 'asleep', 'total sleep', 'год', 'value', 'minutes asleep'],
    quality: ['quality', 'score', 'якість', 'sleep score', 'efficiency'],
    bedtime: ['bedtime', 'start time', 'time went to bed', 'початок'],
    wakeTime: ['wake', 'end time', 'wake up', 'кінець'],
  },
  workouts: {
    date: ['date', 'day', 'дата', 'start date', 'activity date'],
    type: ['type', 'activity', 'sport', 'вид', 'exercise', 'workout type', 'activity type'],
    durationMin: ['duration', 'minutes', 'time', 'moving time', 'тривалість', 'length'],
    calories: ['calories', 'calories burned', 'energy', 'калор', 'kcal'],
    intensity: ['intensity', 'effort', 'rpe', 'інтенсивність'],
    avgHR: ['avg hr', 'average heart rate', 'heart rate', 'hr avg', 'пульс'],
    distanceKm: ['distance', 'km', 'дистанція', 'miles'],
  },
  nutrition: {
    date: ['date', 'day', 'дата', 'datetime', 'logged'],
    calories: ['calories', 'calorie', 'energy', 'калор', 'kcal'],
    proteinG: ['protein', 'білок', 'protein (g)', 'protein_g'],
    carbsG: ['carb', 'вуглевод', 'carbohydrate', 'carbs (g)', 'carbs_g'],
    fatG: ['fat', 'жир', 'fat (g)', 'fat_g'],
    waterMl: ['water', 'вода', 'hydration', 'fluid'],
  },
  weight: {
    date: ['date', 'day', 'дата'],
    weightKg: ['weight', 'вага', 'weight (kg)', 'weight_kg', 'kg'],
    bodyFatPct: ['body fat', 'bodyfat', 'жир тіла', 'fat %', 'fat_pct'],
  },
  mood: {
    date: ['date', 'day', 'дата'],
    mood: ['mood', 'настрій'],
    energy: ['energy', 'енергія'],
    stress: ['stress', 'стрес'],
    notes: ['notes', 'нотатки', 'comment'],
  },
};

function normalizeHeader(h: unknown): string {
  return String(h ?? '').trim().toLowerCase();
}

export function readFileAsRows(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (res: { meta: { fields?: string[] }; data: unknown }) => {
          const headers = res.meta.fields ?? [];
          resolve({ headers, rows: res.data as Record<string, unknown>[] });
        },
        error: (err: Error) => reject(err),
      });
    });
  } else if (ext === 'xlsx' || ext === 'xls') {
    return file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[];
      const headers = json.length ? Object.keys(json[0]) : [];
      return { headers, rows: json };
    });
  }
  return Promise.reject(new Error('Непідтримуваний формат файлу: ' + ext));
}

export function detectType(headers: string[]): EntryType | null {
  const lowerHeaders = headers.map(normalizeHeader);
  let best: EntryType | null = null;
  let bestScore = 0;
  (Object.keys(TYPE_KEYWORDS) as EntryType[]).forEach((type) => {
    let score = 0;
    TYPE_KEYWORDS[type].forEach((kw) => {
      if (lowerHeaders.some((h) => h.includes(kw))) score += 1;
    });
    if (score > bestScore) {
      best = type;
      bestScore = score;
    }
  });
  return best;
}

export function guessMapping(type: EntryType, headers: string[]): FieldMapping {
  const aliases = FIELD_ALIASES[type];
  const lowerMap = headers.map((h) => ({ raw: h, lower: normalizeHeader(h) }));
  const mapping: FieldMapping = {};
  Object.keys(aliases).forEach((field) => {
    const candidates = aliases[field];
    let found = lowerMap.find((h) => candidates.some((c) => h.lower === c));
    if (!found) found = lowerMap.find((h) => candidates.some((c) => h.lower.includes(c)));
    mapping[field] = found ? found.raw : '';
  });
  return mapping;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function normalizeDateValue(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return toISODate(raw);
  const str = String(raw).trim();

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = str.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (slashMatch) {
    const [, a, b, y] = slashMatch;
    let month = parseInt(a, 10);
    let day = parseInt(b, 10);
    if (month > 12) [month, day] = [day, month];
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return toISODate(parsed);
  return null;
}

export function numberFrom(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw;
  const cleaned = String(raw).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

export interface BuildResult<T> {
  records: T[];
  skipped: number;
}

export function buildRecords(
  type: EntryType,
  rows: Record<string, unknown>[],
  mapping: FieldMapping
): BuildResult<SleepRecordInput | WorkoutRecordInput | NutritionRecordInput | WeightRecordInput | MoodRecordInput> {
  const dateField = mapping.date;
  if (!dateField) return { records: [], skipped: rows.length };

  let skipped = 0;

  if (type === 'weight') {
    const records: WeightRecordInput[] = [];
    rows.forEach((row) => {
      const date = normalizeDateValue(row[dateField]);
      const weightKg = numberFrom(row[mapping.weightKg]);
      if (!date || weightKg === null) {
        skipped++;
        return;
      }
      records.push({ date, weightKg, bodyFatPct: numberFrom(row[mapping.bodyFatPct]) });
    });
    return { records, skipped };
  }

  if (type === 'mood') {
    const records: MoodRecordInput[] = [];
    rows.forEach((row) => {
      const date = normalizeDateValue(row[dateField]);
      const mood = numberFrom(row[mapping.mood]);
      const energy = numberFrom(row[mapping.energy]);
      if (!date || mood === null || energy === null) {
        skipped++;
        return;
      }
      records.push({
        date,
        mood,
        energy,
        stress: numberFrom(row[mapping.stress]),
        notes: mapping.notes ? (row[mapping.notes] as string) : undefined,
      });
    });
    return { records, skipped };
  }

  if (type === 'workouts') {
    const records: WorkoutRecordInput[] = [];
    rows.forEach((row) => {
      const date = normalizeDateValue(row[dateField]);
      if (!date) {
        skipped++;
        return;
      }
      records.push({
        date,
        type: mapping.type ? String(row[mapping.type] || 'Тренування') : 'Тренування',
        durationMin: numberFrom(row[mapping.durationMin]) || 0,
        calories: numberFrom(row[mapping.calories]),
        intensity: mapping.intensity ? (row[mapping.intensity] as string) : undefined,
        avgHR: numberFrom(row[mapping.avgHR]),
        distanceKm: numberFrom(row[mapping.distanceKm]),
      });
    });
    return { records, skipped };
  }

  // sleep / nutrition: group rows by date and aggregate (sum/average).
  type RawSleep = { date: string; hours: number; quality: number | null; bedtime?: string; wakeTime?: string };
  type RawNutrition = { date: string; calories: number; proteinG: number; carbsG: number; fatG: number; waterMl: number };

  const byDate: Record<string, (RawSleep | RawNutrition)[]> = {};

  rows.forEach((row) => {
    const date = normalizeDateValue(row[dateField]);
    if (!date) {
      skipped++;
      return;
    }
    if (!byDate[date]) byDate[date] = [];
    if (type === 'sleep') {
      byDate[date].push({
        date,
        hours: numberFrom(row[mapping.hours]) || 0,
        quality: numberFrom(row[mapping.quality]),
        bedtime: mapping.bedtime ? (row[mapping.bedtime] as string) : undefined,
        wakeTime: mapping.wakeTime ? (row[mapping.wakeTime] as string) : undefined,
      } as RawSleep);
    } else {
      byDate[date].push({
        date,
        calories: numberFrom(row[mapping.calories]) || 0,
        proteinG: numberFrom(row[mapping.proteinG]) || 0,
        carbsG: numberFrom(row[mapping.carbsG]) || 0,
        fatG: numberFrom(row[mapping.fatG]) || 0,
        waterMl: numberFrom(row[mapping.waterMl]) || 0,
      } as RawNutrition);
    }
  });

  if (type === 'sleep') {
    const records: SleepRecordInput[] = Object.keys(byDate).map((date) => {
      const items = byDate[date] as RawSleep[];
      const totalHours = items.reduce((s, i) => s + (i.hours || 0), 0);
      const qualities = items.map((i) => i.quality).filter((q): q is number => q !== null && q !== undefined);
      const avgQuality = qualities.length ? qualities.reduce((a, b) => a + b, 0) / qualities.length : null;
      return {
        date,
        hours: Math.round(totalHours * 100) / 100,
        quality: avgQuality !== null ? Math.round(avgQuality * 10) / 10 : null,
        bedtime: items[0].bedtime ?? null,
        wakeTime: items[items.length - 1].wakeTime ?? null,
      };
    });
    return { records, skipped };
  }

  const records: NutritionRecordInput[] = Object.keys(byDate).map((date) => {
    const items = byDate[date] as RawNutrition[];
    return {
      date,
      calories: Math.round(items.reduce((s, i) => s + (i.calories || 0), 0)),
      proteinG: Math.round(items.reduce((s, i) => s + (i.proteinG || 0), 0)),
      carbsG: Math.round(items.reduce((s, i) => s + (i.carbsG || 0), 0)),
      fatG: Math.round(items.reduce((s, i) => s + (i.fatG || 0), 0)),
      waterMl: Math.round(items.reduce((s, i) => s + (i.waterMl || 0), 0)),
    };
  });
  return { records, skipped };
}
