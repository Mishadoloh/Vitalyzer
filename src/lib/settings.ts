import { prisma } from './prisma';
import type { Settings } from './types';

const DEFAULTS = {
  weightKg: 70,
  goal: 'maintain' as const,
  sleepTarget: 8,
  calTarget: 2200,
  proteinTarget: 1.8,
  workoutsTarget: 4,
  sex: 'unknown',
  activityLevel: 'moderate',
  emailDigestEnabled: false,
  emailDigestFrequency: 'weekly',
  backupEmailEnabled: false,
};

// One settings row per user. Created lazily on first read.
export async function getOrCreateSettingsRow(userId: string) {
  const existing = await prisma.settings.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.settings.create({ data: { userId, ...DEFAULTS } });
}

export async function getSettingsForClient(userId: string): Promise<Settings> {
  const row = await getOrCreateSettingsRow(userId);
  const hasApiKey = Boolean(row.anthropicApiKey || process.env.ANTHROPIC_API_KEY);
  return {
    weightKg: row.weightKg,
    goal: row.goal as Settings['goal'],
    sleepTarget: row.sleepTarget,
    calTarget: row.calTarget,
    proteinTarget: row.proteinTarget,
    workoutsTarget: row.workoutsTarget,
    age: row.age,
    heightCm: row.heightCm,
    sex: row.sex === 'female' || row.sex === 'male' ? row.sex : 'unknown',
    activityLevel: ['sedentary', 'light', 'moderate', 'active', 'athlete'].includes(row.activityLevel)
      ? (row.activityLevel as Settings['activityLevel'])
      : 'moderate',
    aiModel: row.aiModel,
    hasApiKey,
    emailDigestEnabled: row.emailDigestEnabled,
    emailDigestAddress: row.emailDigestAddress,
    emailDigestFrequency: row.emailDigestFrequency === 'daily' ? 'daily' : 'weekly',
    emailDigestLastSentAt: row.emailDigestLastSentAt?.toISOString() ?? null,
    backupEmailEnabled: row.backupEmailEnabled,
    backupEmailLastSentAt: row.backupEmailLastSentAt?.toISOString() ?? null,
  };
}

// Resolves the effective Anthropic key: DB override takes priority, otherwise env var.
export async function resolveApiKey(userId: string): Promise<string | null> {
  const row = await getOrCreateSettingsRow(userId);
  return row.anthropicApiKey || process.env.ANTHROPIC_API_KEY || null;
}
