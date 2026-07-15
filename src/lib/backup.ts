import { prisma } from './prisma';
import { getSettingsForClient } from './settings';
import type { EntryType } from './types';

const EXPORT_COLUMNS: Record<EntryType, string[]> = {
  sleep: ['date', 'hours', 'quality', 'bedtime', 'wakeTime'],
  workouts: ['date', 'type', 'durationMin', 'calories', 'intensity', 'avgHR', 'distanceKm'],
  nutrition: ['date', 'calories', 'proteinG', 'carbsG', 'fatG', 'waterMl'],
  weight: ['date', 'weightKg', 'bodyFatPct'],
  mood: ['date', 'mood', 'energy', 'stress', 'notes'],
};

type BackupRows = Record<EntryType, Record<string, unknown>[]>;

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function getBackupData(userId: string) {
  const [sleep, workouts, nutrition, weight, mood, settings] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.workoutEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.nutritionEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.weightEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    prisma.moodEntry.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
    getSettingsForClient(userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    sleep,
    workouts,
    nutrition,
    weight,
    mood,
    settings,
  };
}

export function rowsToCsv(type: EntryType, rows: Record<string, unknown>[]): string {
  const columns = EXPORT_COLUMNS[type];
  const lines = [columns.join(',')];
  for (const row of rows) {
    lines.push(columns.map((column) => csvEscape(row[column])).join(','));
  }
  return `\uFEFF${lines.join('\r\n')}`;
}

export function buildBackupAttachments(backup: Awaited<ReturnType<typeof getBackupData>>) {
  const date = new Date().toISOString().slice(0, 10);
  const rows: BackupRows = {
    sleep: backup.sleep as unknown as Record<string, unknown>[],
    workouts: backup.workouts as unknown as Record<string, unknown>[],
    nutrition: backup.nutrition as unknown as Record<string, unknown>[],
    weight: backup.weight as unknown as Record<string, unknown>[],
    mood: backup.mood as unknown as Record<string, unknown>[],
  };

  return [
    {
      filename: `vitalyzer-backup-${date}.json`,
      content: Buffer.from(JSON.stringify(backup, null, 2), 'utf8').toString('base64'),
    },
    ...Object.entries(rows).map(([type, data]) => ({
      filename: `vitalyzer-${type}-${date}.csv`,
      content: Buffer.from(rowsToCsv(type as EntryType, data), 'utf8').toString('base64'),
    })),
  ];
}

export { EXPORT_COLUMNS };
