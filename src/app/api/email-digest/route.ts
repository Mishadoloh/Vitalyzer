import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import { isEmailDigestDue, sendEmailDigest } from '@/lib/email-digest';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({}));
  const addressOverride = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;

  try {
    const result = await sendEmailDigest(auth.userId, { force: true, addressOverride });
    return NextResponse.json({
      ok: true,
      ...result,
      message: result.mode === 'preview' ? 'Лист сформовано у preview-режимі. Додайте RESEND_API_KEY, щоб надсилати реально.' : 'Тестовий лист відправлено.',
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret') || req.headers.get('x-cron-secret');
  const expected = process.env.EMAIL_CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await prisma.settings.findMany({
    where: {
      emailDigestAddress: { not: null },
      OR: [{ emailDigestEnabled: true }, { backupEmailEnabled: true }],
    },
    select: {
      userId: true,
      emailDigestEnabled: true,
      emailDigestAddress: true,
      emailDigestFrequency: true,
      emailDigestLastSentAt: true,
      backupEmailEnabled: true,
      backupEmailLastSentAt: true,
    },
  });

  const due = rows.filter(isEmailDigestDue);
  const results = [];
  for (const row of due) {
    try {
      const result = await sendEmailDigest(row.userId);
      results.push({ userId: row.userId, ok: true, mode: result.mode });
    } catch (e) {
      results.push({ userId: row.userId, ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ checked: rows.length, sent: results.filter((item) => item.ok).length, results });
}
