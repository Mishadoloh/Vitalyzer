import { NextRequest, NextResponse } from 'next/server';
import { isAppLocale, routing, type AppLocale } from '@/i18n/routing';

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

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isAllowedOrigin(req: NextRequest, origin: string | null) {
  if (!origin) return true;

  try {
    const originUrl = new URL(origin);
    const requestHost = req.headers.get('host') || req.nextUrl.host;
    const requestUrl = new URL(`${req.nextUrl.protocol}//${requestHost}`);

    if (originUrl.host === requestUrl.host && originUrl.protocol === requestUrl.protocol) {
      return true;
    }

    const sameLocalPort = isLocalHost(originUrl.hostname) && isLocalHost(requestUrl.hostname) && originUrl.port === requestUrl.port;
    if (sameLocalPort) return true;

    const configuredUrl = process.env.NEXTAUTH_URL;
    if (configuredUrl && originUrl.origin === new URL(configuredUrl).origin) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
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

function apiMiddleware(req: NextRequest) {
  if (isWrite(req.method) && req.nextUrl.pathname !== '/api/stripe/webhook') {
    if (!isAllowedOrigin(req, req.headers.get('origin'))) {
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

function preferredLocale(req: NextRequest): AppLocale {
  const cookieLocale = req.cookies.get('NEXT_LOCALE')?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const accepted = req.headers.get('accept-language')?.toLowerCase() || '';
  const preferred = routing.locales.find((locale) => accepted.includes(locale));
  return preferred || routing.defaultLocale;
}

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return apiMiddleware(req);
  }

  const segments = req.nextUrl.pathname.split('/');
  const pathnameLocale = segments[1];
  const locale = isAppLocale(pathnameLocale) ? pathnameLocale : preferredLocale(req);
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-vitalyzer-locale', locale);

  if (isAppLocale(pathnameLocale)) {
    const pathname = `/${segments.slice(2).join('/')}` || '/';
    const destination = req.nextUrl.clone();
    destination.pathname = pathname;
    const response = NextResponse.rewrite(destination, {request: {headers: requestHeaders}});
    response.cookies.set('NEXT_LOCALE', locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax'
    });
    return response;
  }

  return NextResponse.next({request: {headers: requestHeaders}});
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
