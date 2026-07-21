import { prisma } from './prisma';
import { getOrCreateSettingsRow } from './settings';
import { buildBackupAttachments, getBackupData } from './backup';

type DigestMode = 'sent' | 'preview';

interface DigestResult {
  mode: DigestMode;
  to: string;
  subject: string;
  backupAttached: boolean;
}

interface ResendAttachment {
  filename: string;
  content: string;
}

function todayISO(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function addDays(iso: string, delta: number): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function average(values: number[]): number | null {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
}

function round(value: number | null, digits = 1): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] || char);
}

function formatValue(value: number | null, suffix: string): string {
  return value === null ? '-' : `${value}${suffix}`;
}

function buildInsight(items: string[], fallback: string): string {
  return items.length ? items.slice(0, 3).join(' ') : fallback;
}

export async function buildEmailDigest(userId: string, addressOverride?: string | null) {
  const settings = await getOrCreateSettingsRow(userId);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const to = (addressOverride || settings.emailDigestAddress || user?.email || '').trim().toLowerCase();
  if (!to) throw new Error('Email для розсилки не налаштовано');

  const today = todayISO();
  const from = addDays(today, -6);
  const [sleep, workouts, nutrition, weight, mood, advice] = await Promise.all([
    prisma.sleepEntry.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } }),
    prisma.workoutEntry.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } }),
    prisma.nutritionEntry.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } }),
    prisma.weightEntry.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } }),
    prisma.moodEntry.findMany({ where: { userId, date: { gte: from } }, orderBy: { date: 'asc' } }),
    prisma.adviceCache.findUnique({ where: { userId_date: { userId, date: today } } }),
  ]);

  const avgSleep = round(average(sleep.map((entry) => entry.hours)));
  const avgProtein = round(average(nutrition.map((entry) => entry.proteinG)), 0);
  const avgCalories = round(average(nutrition.map((entry) => entry.calories)), 0);
  const avgMood = round(average(mood.map((entry) => entry.mood)));
  const latestWeight = weight[weight.length - 1]?.weightKg ?? null;
  const firstWeight = weight[0]?.weightKg ?? null;
  const weightDelta = firstWeight !== null && latestWeight !== null ? round(latestWeight - firstWeight) : null;
  const adviceItems = Array.isArray(advice?.itemsJson) ? (advice.itemsJson as string[]) : [];
  const insight = buildInsight(adviceItems, 'Додайте кілька записів за тиждень, і звіт стане точнішим.');

  const subject = `Metrivyn: звіт за тиждень (${today})`;
  const text = [
    'Ваш короткий звіт Metrivyn',
    '',
    `Сон: ${formatValue(avgSleep, ' год')}`,
    `Тренування: ${workouts.length}`,
    `Калорії: ${formatValue(avgCalories, ' ккал')}`,
    `Білок: ${formatValue(avgProtein, ' г')}`,
    `Вага: ${latestWeight === null ? '-' : `${round(latestWeight)} кг`} (${weightDelta === null ? 'без тренду' : `${weightDelta > 0 ? '+' : ''}${weightDelta} кг`})`,
    `Настрій: ${formatValue(avgMood, '/5')}`,
    '',
    insight,
    '',
    'Відкрити дашборд: ' + (process.env.NEXTAUTH_URL || 'http://localhost:3008') + '/app',
  ].join('\n');

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#0f1117;color:#e9eef7;padding:24px">
      <div style="max-width:620px;margin:0 auto;background:#1b1f2a;border:1px solid #2b3242;border-radius:18px;padding:22px">
        <div style="font-size:13px;color:#5ee0b7;margin-bottom:8px">Metrivyn</div>
        <h1 style="font-size:24px;margin:0 0 8px">Ваш тижневий звіт</h1>
        <p style="color:#a8b0c2;margin:0 0 18px">Коротко про сон, активність, харчування, вагу й настрій.</p>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:18px">
          ${[
            ['Сон', formatValue(avgSleep, ' год')],
            ['Тренування', String(workouts.length)],
            ['Калорії', formatValue(avgCalories, ' ккал')],
            ['Білок', formatValue(avgProtein, ' г')],
            ['Вага', latestWeight === null ? '-' : `${round(latestWeight)} кг`],
            ['Настрій', formatValue(avgMood, '/5')],
          ]
            .map(([label, value]) => `<div style="background:#11151d;border:1px solid #2b3242;border-radius:12px;padding:12px"><div style="color:#8e98ad;font-size:12px">${escapeHtml(label)}</div><div style="font-size:20px;font-weight:700">${escapeHtml(value)}</div></div>`)
            .join('')}
        </div>
        <div style="background:#10251f;border:1px solid rgba(94,224,183,.35);border-radius:14px;padding:14px;color:#cdeee4">${escapeHtml(insight)}</div>
        <a href="${escapeHtml(process.env.NEXTAUTH_URL || 'http://localhost:3008')}/app" style="display:inline-block;margin-top:18px;background:#34d399;color:#06281c;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 16px">Відкрити дашборд</a>
        <p style="margin-top:18px;color:#7f899d;font-size:12px">Керувати розсилкою можна в налаштуваннях Metrivyn.</p>
      </div>
    </div>
  `;

  return { to, subject, text, html };
}

export async function sendEmailDigest(userId: string, options: { force?: boolean; addressOverride?: string | null } = {}): Promise<DigestResult> {
  const settings = await getOrCreateSettingsRow(userId);
  if (!options.force && !settings.emailDigestEnabled && !settings.backupEmailEnabled) throw new Error('Розсилку вимкнено');

  const message = await buildEmailDigest(userId, options.addressOverride);
  const backupDue = isBackupDue(settings);
  const shouldAttachBackup = Boolean(settings.backupEmailEnabled && (options.force || backupDue));
  const attachments: ResendAttachment[] = shouldAttachBackup ? buildBackupAttachments(await getBackupData(userId)) : [];
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'Metrivyn <onboarding@resend.dev>';

  if (!apiKey) {
    console.info('[email-preview]', { to: message.to, subject: message.subject, text: message.text, attachments: attachments.map((item) => item.filename) });
    await prisma.settings.update({
      where: { userId },
      data: {
        emailDigestLastSentAt: settings.emailDigestEnabled ? new Date() : settings.emailDigestLastSentAt,
        backupEmailLastSentAt: shouldAttachBackup ? new Date() : settings.backupEmailLastSentAt,
      },
    });
    return { mode: 'preview', to: message.to, subject: message.subject, backupAttached: shouldAttachBackup };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, text: message.text, html: message.html, attachments }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Не вдалося відправити email');
  }

  await prisma.settings.update({
    where: { userId },
    data: {
      emailDigestLastSentAt: settings.emailDigestEnabled ? new Date() : settings.emailDigestLastSentAt,
      backupEmailLastSentAt: shouldAttachBackup ? new Date() : settings.backupEmailLastSentAt,
    },
  });
  return { mode: 'sent', to: message.to, subject: message.subject, backupAttached: shouldAttachBackup };
}

function isDigestDue(settings: { emailDigestEnabled: boolean; emailDigestAddress: string | null; emailDigestFrequency: string; emailDigestLastSentAt: Date | null }): boolean {
  if (!settings.emailDigestEnabled || !settings.emailDigestAddress) return false;
  if (!settings.emailDigestLastSentAt) return true;
  const ageMs = Date.now() - settings.emailDigestLastSentAt.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  return settings.emailDigestFrequency === 'daily' ? ageMs >= dayMs : ageMs >= dayMs * 7;
}

function isBackupDue(settings: { backupEmailEnabled: boolean; emailDigestAddress: string | null; backupEmailLastSentAt: Date | null }): boolean {
  if (!settings.backupEmailEnabled || !settings.emailDigestAddress) return false;
  if (!settings.backupEmailLastSentAt) return true;
  return Date.now() - settings.backupEmailLastSentAt.getTime() >= 7 * 24 * 60 * 60 * 1000;
}

export function isEmailDigestDue(settings: {
  emailDigestEnabled: boolean;
  emailDigestAddress: string | null;
  emailDigestFrequency: string;
  emailDigestLastSentAt: Date | null;
  backupEmailEnabled: boolean;
  backupEmailLastSentAt: Date | null;
}): boolean {
  return isDigestDue(settings) || isBackupDue(settings);
}
