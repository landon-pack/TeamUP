/**
 * Password hashing for TeamUP accounts (Web Crypto / Workers-safe).
 *
 * Stored format:  pbkdf2$iterations$saltBase64Url$hashBase64Url
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function encoder() {
  return new TextEncoder();
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  // Fresh copy so Workers always get a plain ArrayBuffer-backed salt.
  const saltCopy = new Uint8Array(salt.byteLength);
  saltCopy.set(salt);
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltCopy,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS,
  );
}

/** Hash a plaintext password for storage. */
export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveKey(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${toBase64Url(salt)}$${toBase64Url(hash)}`;
}

/** Constant-time-ish compare of a password against a stored hash blob. */
export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [scheme, iterText, saltB64, hashB64] = stored.split('$');
  if (scheme !== 'pbkdf2' || !iterText || !saltB64 || !hashB64) return false;
  const iterations = Number(iterText);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;

  const expected = fromBase64Url(hashB64);
  const actual = new Uint8Array(await deriveKey(password, fromBase64Url(saltB64), iterations));
  if (expected.length !== actual.length) return false;

  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected[i]! ^ actual[i]!;
  return mismatch === 0;
}
