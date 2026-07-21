import { NextResponse } from 'next/server';
import { requireSubscribedUser } from '@/lib/auth-helpers';
import { getBackupData } from '@/lib/backup';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSubscribedUser();
  if (auth.error) return auth.error;
  const { userId } = auth;
  const backup = await getBackupData(userId);

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="metrivyn-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
