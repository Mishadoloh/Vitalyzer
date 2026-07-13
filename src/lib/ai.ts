/*
 * ai.ts
 * Опційне покращення поради дня через Claude API (Anthropic Messages API).
 * Виконується виключно на сервері (Route Handler) — ключ ніколи не потрапляє
 * в браузер. Якщо ключ не налаштований або запит не вдався, викликач має
 * підстрахуватись локальним рушієм (insights.ts).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { AdviceResult } from './types';

export const DEFAULT_MODEL = 'claude-sonnet-4-5';

function buildPrompt(ruleBased: AdviceResult): string {
  const { stats, overallScore } = ruleBased;
  const s = stats.sleep;
  const w = stats.workouts;
  const n = stats.nutrition;
  const wt = stats.weight;
  const md = stats.mood;

  return `Ти — персональний помічник зі здоров'я. На основі зведеної статистики користувача за останні 7 днів
дай коротку персоналізовану щоденну пораду українською мовою. Будь конкретним і практичним, уникай загальних фраз.

Дані:
Сон: середньо ${s.avgHours ?? 'н/д'} год/добу, розкид ±${s.variance ?? 'н/д'} год, якість ${s.avgQuality ?? 'н/д'}/5, тренд попереднього тижня ${s.prevAvgHours ?? 'н/д'} год, накопичений дефіцит сну ${s.debtHours ?? 'н/д'} год.
Тренування: ${w.count} за останні 7 днів (ціль ${w.target}), сумарно ${w.totalMin} хв, ${w.daysSinceLast !== null ? w.daysSinceLast + ' дн. тому останнє' : 'даних немає'}, ризик перетренованості: ${w.overtrainingRisk ? 'так' : 'ні'}.
Харчування: середньо ${n.avgCalories ?? 'н/д'} ккал/добу, білок ${n.proteinPerKg ?? 'н/д'} г/кг, вода ${n.avgWater ?? 'н/д'} мл/добу.
Вага: поточна ${wt.latestKg ?? 'н/д'} кг, зміна за тиждень ${wt.trendKgPerWeek ?? 'н/д'} кг.
Настрій/енергія: настрій ${md.avgMood ?? 'н/д'}/5, енергія ${md.avgEnergy ?? 'н/д'}/5, стрес ${md.avgStress ?? 'н/д'}/5.
Загальна оцінка стану: ${overallScore ?? 'н/д'}/100.

Дай відповідь у форматі JSON без жодного додаткового тексту навколо:
{"tag": "коротка фраза-статус (3-5 слів)", "items": ["порада 1", "порада 2", "порада 3", "порада 4 (опційно)"]}
Кожна порада — одне-два речення, конкретна дія на сьогодні/найближчі дні, українською мовою.`;
}

export async function generateAiAdvice(
  ruleBased: AdviceResult,
  apiKey: string,
  model?: string | null
): Promise<AdviceResult> {
  const client = new Anthropic({ apiKey });
  const prompt = buildPrompt(ruleBased);

  const response = await client.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Порожня відповідь від Claude API');
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Не вдалося розпарсити відповідь розширеного аналізу');

  let parsed: { tag?: string; items?: string[] };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Не вдалося розпарсити відповідь розширеного аналізу (невалідний JSON)');
  }

  return {
    source: 'ai',
    tag: parsed.tag || 'Порада дня',
    overallScore: ruleBased.overallScore,
    scores: ruleBased.scores,
    stats: ruleBased.stats,
    items: parsed.items || [],
    generatedAt: new Date().toISOString(),
  };
}
