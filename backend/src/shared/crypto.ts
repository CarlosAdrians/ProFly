import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const params = { N: 131072, r: 8, p: 1, maxmem: 192 * 1024 * 1024 };
const dummy = `scrypt$131072$8$1$${'00'.repeat(16)}$${'00'.repeat(64)}`;

async function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, params, (error, key) => (error ? reject(error) : resolve(key))),
  );
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt);
  return `scrypt$131072$8$1$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored?: string) {
  const encoded = stored ?? dummy;
  const match = /^scrypt\$131072\$8\$1\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match?.[1] || !match[2]) return false;
  const key = await derive(password, match[1]);
  return timingSafeEqual(key, Buffer.from(match[2], 'hex')) && stored !== undefined;
}

export function token() {
  return randomBytes(32).toString('hex');
}
export function tokenHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
