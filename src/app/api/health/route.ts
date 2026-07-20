import { NextResponse } from 'next/server';
import { googleAuthConfigured } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json(
      {
        status: 'ok',
        services: {
          database: 'available',
          googleAuth: googleAuthConfigured ? 'configured' : 'not_configured',
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'degraded',
        services: {
          database: 'unavailable',
          googleAuth: googleAuthConfigured ? 'configured' : 'not_configured',
        },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
