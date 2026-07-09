import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { generateAiAdvice } from '@/lib/ai';
import { generateRuleBasedAdvice, todayISO } from '@/lib/insights';
import { getOrCreateSettingsRow, resolveApiKey } from '@/lib/settings';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import type { AdviceResult } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const { userId } = auth;

  const force = req.nextUrl.searchParams.get('force') === 'true';
  const today = todayISO();

  if (!force) {
    const cached = await prisma.adviceCache.findUnique({ where: { userId_date: { userId, date: today } } });
    // Guard against stale cache rows written before a stats shape change (e.g. adding
    // weight/mood) — regenerate instead of serving a payload the client can't read.
    if (cached && cached.statsJson && typeof cached.statsJson === 'object' && 'weight' in cached.statsJson && 'mood' in cached.statsJson) {
      return NextResponse.json(cacheRowToAdvice(cached));
    }
  }

  const [sleepAll, workoutsAll, nutritionAll, weightAll, moodAll, settingsRow] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId } }),
    prisma.workoutEntry.findMany({ where: { userId } }),
    prisma.nutritionEntry.findMany({ where: { userId } }),
    prisma.weightEntry.findMany({ where: { userId } }),
    prisma.moodEntry.findMany({ where: { userId } }),
    getOrCreateSettingsRow(userId),
  ]);

  const settings = {
    weightKg: settingsRow.weightKg,
    goal: settingsRow.goal as 'lose' | 'maintain' | 'gain' | 'perform',
    sleepTarget: settingsRow.sleepTarget,
    calTarget: settingsRow.calTarget,
    proteinTarget: settingsRow.proteinTarget,
    workoutsTarget: settingsRow.workoutsTarget,
  };

  const ruleBased = generateRuleBasedAdvice(sleepAll, workoutsAll, nutritionAll, settings, weightAll, moodAll);

  let finalAdvice: AdviceResult = ruleBased;
  let warning: string | null = null;

  const apiKey = await resolveApiKey(userId);
  if (apiKey) {
    try {
      finalAdvice = await generateAiAdvice(ruleBased, apiKey, settingsRow.aiModel);
    } catch (e) {
      warning = 'AI-аналіз недоступний, використано локальний рушій: ' + (e instanceof Error ? e.message : String(e));
      finalAdvice = ruleBased;
    }
  }

  await prisma.adviceCache.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      source: finalAdvice.source,
      tag: finalAdvice.tag,
      overallScore: finalAdvice.overallScore,
      scoresJson: finalAdvice.scores as unknown as Prisma.InputJsonValue,
      statsJson: finalAdvice.stats as unknown as Prisma.InputJsonValue,
      itemsJson: finalAdvice.items as unknown as Prisma.InputJsonValue,
    },
    update: {
      source: finalAdvice.source,
      tag: finalAdvice.tag,
      overallScore: finalAdvice.overallScore,
      scoresJson: finalAdvice.scores as unknown as Prisma.InputJsonValue,
      statsJson: finalAdvice.stats as unknown as Prisma.InputJsonValue,
      itemsJson: finalAdvice.items as unknown as Prisma.InputJsonValue,
      generatedAt: new Date(),
    },
  });

  return NextResponse.json({ ...finalAdvice, warning });
}

function cacheRowToAdvice(row: {
  source: string;
  tag: string;
  overallScore: number | null;
  scoresJson: unknown;
  statsJson: unknown;
  itemsJson: unknown;
  generatedAt: Date;
}): AdviceResult {
  return {
    source: row.source as 'rules' | 'ai',
    tag: row.tag,
    overallScore: row.overallScore,
    scores: row.scoresJson as AdviceResult['scores'],
    stats: row.statsJson as AdviceResult['stats'],
    items: row.itemsJson as string[],
    generatedAt: row.generatedAt.toISOString(),
  };
}
