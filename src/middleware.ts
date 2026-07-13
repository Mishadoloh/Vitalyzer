import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000;
const API_LIMIT = 90;
const WRITE_LIMIT = 35;
const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: NextRequest) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const realIp = req.headers.get('x-real-ip')?.trim();
  return forwardedFor || realIp || 'local';
}

function isWrite(method: string) {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

function hitLimit(key: string, limit: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  bucket.count += 1;
  return {
    limited: bucket.count > limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

export function middleware(req: NextRequest) {
  if (!req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  if (isWrite(req.method) && req.nextUrl.pathname !== '/api/stripe/webhook') {
    const origin = req.headers.get('origin');
    if (origin && origin !== req.nextUrl.origin) {
      return NextResponse.json({ error: 'Запит із цього джерела заборонено.' }, { status: 403 });
    }
  }

  const methodLimit = isWrite(req.method) ? WRITE_LIMIT : API_LIMIT;
  const scope = isWrite(req.method) ? 'write' : 'read';
  const key = `${clientKey(req)}:${scope}:${req.nextUrl.pathname}`;
  const result = hitLimit(key, methodLimit);

  if (result.limited) {
    return NextResponse.json(
      { error: 'Забагато запитів. Спробуйте ще раз за хвилину.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(methodLimit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(methodLimit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
