export type EntryType = 'sleep' | 'workouts' | 'nutrition' | 'weight' | 'mood';

export interface SleepRecordInput {
  date: string; // YYYY-MM-DD
  hours: number;
  quality?: number | null;
  bedtime?: string | null;
  wakeTime?: string | null;
}

export interface WorkoutRecordInput {
  date: string;
  type: string;
  durationMin: number;
  calories?: number | null;
  intensity?: string | null;
  avgHR?: number | null;
  distanceKm?: number | null;
}

export interface NutritionRecordInput {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}

export interface WeightRecordInput {
  date: string;
  weightKg: number;
  bodyFatPct?: number | null;
}

export interface MoodRecordInput {
  date: string;
  mood: number;
  energy: number;
  stress?: number | null;
  notes?: string | null;
}

export type RecordInput =
  | SleepRecordInput
  | WorkoutRecordInput
  | NutritionRecordInput
  | WeightRecordInput
  | MoodRecordInput;

export interface FieldMapping {
  [canonicalField: string]: string; // canonical field -> source column header (or '' if unused)
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ImportResult {
  added: number;
  updated: number;
  skipped: number;
  total: number;
}

export interface Settings {
  weightKg: number;
  goal: 'lose' | 'maintain' | 'gain' | 'perform';
  sleepTarget: number;
  calTarget: number;
  proteinTarget: number;
  workoutsTarget: number;
  anthropicApiKey?: string | null;
  aiModel?: string | null;
  hasApiKey?: boolean; // derived, true if a key is configured server-side (env or DB)
  emailDigestEnabled?: boolean;
  emailDigestAddress?: string | null;
  emailDigestFrequency?: 'daily' | 'weekly';
  emailDigestLastSentAt?: string | null;
}

export interface SleepStats {
  daysLogged: number;
  avgHours: number | null;
  prevAvgHours: number | null;
  variance: number | null;
  avgQuality: number | null;
  debtHours: number | null;
  score: number | null;
}

export interface WorkoutStats {
  count: number;
  prevCount: number;
  totalMin: number;
  totalCalories: number;
  target: number;
  daysSinceLast: number | null;
  score: number | null;
  overtrainingRisk: boolean;
  inactivityRisk: boolean;
}

export interface NutritionStats {
  daysLogged: number;
  avgCalories: number | null;
  prevAvgCalories: number | null;
  avgProtein: number | null;
  avgCarbs: number | null;
  avgFat: number | null;
  avgWater: number | null;
  proteinPerKg: number | null;
  score: number | null;
}

export interface WeightStats {
  daysLogged: number;
  latestKg: number | null;
  weekAgoKg: number | null;
  trendKgPerWeek: number | null;
}

export interface MoodStats {
  daysLogged: number;
  avgMood: number | null;
  avgEnergy: number | null;
  avgStress: number | null;
  prevAvgMood: number | null;
  prevAvgEnergy: number | null;
}

export interface AdviceResult {
  source: 'rules' | 'ai';
  tag: string;
  overallScore: number | null;
  scores: { sleep: number | null; workouts: number | null; nutrition: number | null };
  stats: { sleep: SleepStats; workouts: WorkoutStats; nutrition: NutritionStats; weight: WeightStats; mood: MoodStats };
  items: string[];
  generatedAt: string;
}
