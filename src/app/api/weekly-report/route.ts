import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import { getSettingsForClient } from '@/lib/settings';

export const dynamic = 'force-dynamic';

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mean(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const startDate = isoDate(start);
  const endDate = isoDate(end);
  const range = { gte: startDate, lte: endDate };

  const [sleep, nutrition, workouts, weight, mood, settings, habits, photos] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'asc' } }),
    prisma.nutritionEntry.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'asc' } }),
    prisma.workoutEntry.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'asc' } }),
    prisma.weightEntry.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'asc' } }),
    prisma.moodEntry.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'asc' } }),
    getSettingsForClient(auth.userId),
    prisma.syncedHabitState.findUnique({ where: { userId: auth.userId } }),
    prisma.progressPhoto.findMany({ where: { userId: auth.userId, date: range }, orderBy: { date: 'desc' }, select: { id: true, date: true } }),
  ]);

  const habitData = habits?.data && typeof habits.data === 'object' ? habits.data as Record<string, unknown> : {};
  const habitCheckins = Object.values(habitData).reduce<number>((total, dates) => total + (Array.isArray(dates) ? dates.filter((date) => typeof date === 'string' && date >= startDate && date <= endDate).length : 0), 0);
  const habitPercent = Math.round((habitCheckins / 42) * 100);
  const avgSleep = mean(sleep.map((row) => row.hours));
  const avgCalories = mean(nutrition.map((row) => row.calories));
  const avgProtein = mean(nutrition.map((row) => row.proteinG));
  const proteinGoal = Math.round(settings.weightKg * settings.proteinTarget);
  const weightDelta = weight.length > 1 ? weight[weight.length - 1].weightKg - weight[0].weightKg : null;
  const insights: Array<{ tone: 'good' | 'warn' | 'info'; text: string }> = [];

  const shortSleepDays = sleep.filter((row) => row.hours < Math.min(7, settings.sleepTarget)).length;
  if (shortSleepDays >= 3) insights.push({ tone: 'warn', text: `Сон був коротшим за 7 годин ${shortSleepDays} дні. Спробуйте стабілізувати час відбою.` });
  else if (avgSleep > 0) insights.push({ tone: 'good', text: `Середній сон — ${avgSleep.toFixed(1)} год. ${avgSleep >= settings.sleepTarget ? 'Ціль виконано.' : `До цілі бракує ${(settings.sleepTarget - avgSleep).toFixed(1)} год.`}` });

  if (nutrition.length && avgProtein < proteinGoal * 0.85) insights.push({ tone: 'warn', text: `У середньому ${Math.round(avgProtein)} г білка на день. До вашої цілі бракує близько ${Math.max(0, Math.round(proteinGoal - avgProtein))} г.` });
  else if (nutrition.length) insights.push({ tone: 'good', text: `Білкова ціль майже закрита: ${Math.round(avgProtein)} із ${proteinGoal} г на день.` });

  if (workouts.length >= settings.workoutsTarget) insights.push({ tone: 'good', text: `Виконано ${workouts.length} тренувань — тижнева ціль закрита.` });
  else insights.push({ tone: 'info', text: `Виконано ${workouts.length} із ${settings.workoutsTarget} запланованих тренувань.` });
  if (insights.length < 3 && habitPercent > 0) insights.push({ tone: habitPercent >= 70 ? 'good' : 'info', text: `Звички виконані на ${habitPercent}%. ${habitPercent >= 70 ? 'Ритм стабільний.' : 'Оберіть дві ключові звички на наступний тиждень.'}` });
  if (insights.length < 3 && sleep.length < 4) insights.push({ tone: 'info', text: `Додайте ще ${4 - sleep.length} записи сну, щоб побачити надійний середній показник.` });
  if (insights.length < 3 && nutrition.length < 4) insights.push({ tone: 'info', text: `Харчування заповнено за ${nutrition.length} із 7 днів. Чотирьох днів уже достатньо для першого тренду.` });
  if (insights.length < 3 && photos.length === 0) insights.push({ tone: 'info', text: 'Зробіть одне фото прогресу цього тижня — воно доповнить цифри візуальним результатом.' });

  return NextResponse.json({
    period: { start: startDate, end: endDate },
    summary: {
      avgSleep: Number(avgSleep.toFixed(1)),
      sleepDays: sleep.length,
      weightLatest: weight.at(-1)?.weightKg ?? null,
      weightDelta: weightDelta === null ? null : Number(weightDelta.toFixed(1)),
      avgCalories: Math.round(avgCalories),
      avgProtein: Math.round(avgProtein),
      workouts: workouts.length,
      workoutMinutes: Math.round(workouts.reduce((sum, row) => sum + row.durationMin, 0)),
      habitPercent: Math.min(100, habitPercent),
      photos: photos.length,
      avgMood: Number(mean(mood.map((row) => row.mood)).toFixed(1)),
    },
    goals: { sleep: settings.sleepTarget, protein: proteinGoal, workouts: settings.workoutsTarget },
    insights: insights.slice(0, 3),
  });
}
