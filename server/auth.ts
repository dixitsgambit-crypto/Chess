import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;
const N = 16384, R = 8, P = 1, LEN = 64;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, LEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(pw: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const [kind, n, r, p, salt, hash] = stored.split('$');
  if (kind !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scrypt(pw, Buffer.from(salt, 'base64'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** A dummy hash so failed logins for unknown users take as long as real ones. */
export const DUMMY_HASH = `scrypt$${N}$${R}$${P}$${Buffer.alloc(16).toString('base64')}$${Buffer.alloc(LEN).toString('base64')}`;

export const newToken = () => randomBytes(32).toString('base64url');
export const hashToken = (t: string) => createHash('sha256').update(t).digest('hex');
export const newId = () => randomBytes(12).toString('base64url');

export const USERNAME = /^[A-Za-z0-9_-]{3,24}$/;
export function checkCredentials(username: unknown, password: unknown): string | null {
  if (typeof username !== 'string' || !USERNAME.test(username)) return 'Usernames are 3–24 characters: letters, digits, _ or -.';
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) return 'Passwords must be 8–200 characters long.';
  return null;
}

/** Fixed-window rate limiter keyed by IP or user. */
export class RateLimiter {
  private hits = new Map<string, { n: number; reset: number }>();
  private limit: number;
  private windowMs: number;
  constructor(limit: number, windowMs: number) { this.limit = limit; this.windowMs = windowMs; }
  allow(key: string, now = Date.now()): boolean {
    const h = this.hits.get(key);
    if (!h || h.reset <= now) { this.hits.set(key, { n: 1, reset: now + this.windowMs }); if (this.hits.size > 10000) this.sweep(now); return true; }
    h.n++;
    return h.n <= this.limit;
  }
  private sweep(now: number) { for (const [k, v] of this.hits) if (v.reset <= now) this.hits.delete(k); }
}
