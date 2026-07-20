import { createHmac, timingSafeEqual } from 'crypto';

interface GuestTransferPayload {
  guestUserId: string;
  expiresAt: number;
}

function secret(): string {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error('NEXTAUTH_SECRET is required for guest transfer');
  return value;
}

export function createGuestTransferToken(guestUserId: string): string {
  const payload: GuestTransferPayload = {
    guestUserId,
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', secret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

export function verifyGuestTransferToken(token: string): GuestTransferPayload | null {
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return null;
  const expected = createHmac('sha256', secret()).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as GuestTransferPayload;
    if (!payload.guestUserId || payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
