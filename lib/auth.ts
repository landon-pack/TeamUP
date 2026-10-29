/**
 * Server-side session auth (email + display name, no password).
 *
 * How it works:
 * 1. /signup or /signin POSTs name+email to /api/auth/signin
 * 2. That route calls createSessionToken() and sets the `teamup_session` cookie
 * 3. Later requests call getSessionUser() to read the signed cookie
 *
 * Browser helpers live in lib/auth-client.ts.
 * Cookie crypto (HMAC) stays in this file — do not call from client components.
 */

import { env } from 'cloudflare:workers';
import { headers } from 'next/headers';

export type SessionUser = {
  /** Stable id stored in users.auth_id (format: "email:you@school.edu") */
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

/** Cookie name sent to the browser after a successful sign-in / sign-up. */
export const SESSION_COOKIE = 'teamup_session';
const SESSION_DAYS = 30;

/** Compact fields inside the signed cookie payload. */
type SessionPayload = {
  e: string; // email
  n: string; // display name
  i: string; // user id ("email:…")
  exp: number; // expiry (unix ms)
};

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

function authSecret() {
  const bindings = env as unknown as { AUTH_SECRET?: string };
  const secret = bindings.AUTH_SECRET || process.env.AUTH_SECRET;
  if (secret) return secret;
  // Local-only fallback so `npm run dev` works before secrets are configured.
  if (process.env.NODE_ENV !== 'production') return 'teamup-local-dev-auth-secret';
  throw new Error('AUTH_SECRET is not configured');
}

async function hmacKey() {
  return crypto.subtle.importKey(
    'raw',
    encoder().encode(authSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload: string) {
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(), encoder().encode(payload));
  return toBase64Url(signature);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateSignIn(input: { email?: unknown; name?: unknown }) {
  const email = typeof input.email === 'string' ? normalizeEmail(input.email) : '';
  const name =
    typeof input.name === 'string'
      ? input.name.trim().replace(/\s+/g, ' ').slice(0, 80)
      : '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { error: 'Enter a valid email address.' as const };
  }
  if (!name || name.length < 2) {
    return { error: 'Enter your name (at least 2 characters).' as const };
  }
  return { email, name };
}

export async function createSessionToken(email: string, name: string) {
  const payload: SessionPayload = {
    e: normalizeEmail(email),
    n: name,
    i: 'email:' + normalizeEmail(email),
    exp: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  const body = toBase64Url(encoder().encode(JSON.stringify(payload)));
  return `${body}.${await sign(body)}`;
}

export async function readSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = await sign(body);
  if (expected.length !== signature.length) return null;
  let match = 0;
  for (let i = 0; i < expected.length; i++) match |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  if (match !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (!payload?.e || !payload?.n || !payload?.i || !payload?.exp) return null;
    if (payload.exp < Date.now()) return null;
    const email = normalizeEmail(payload.e);
    return {
      userId: payload.i || 'email:' + email,
      email,
      displayName: payload.n,
      fullName: payload.n,
    };
  } catch {
    return null;
  }
}

function parseCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const requestHeaders = await headers();
  return readSessionToken(parseCookie(requestHeaders.get('cookie'), SESSION_COOKIE));
}

export function sessionCookieHeader(token: string, secure: boolean) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    secure ? '; Secure' : ''
  }`;
}

export function clearSessionCookieHeader(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function safeReturnPath(value: string | null | undefined) {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/workspace';
  try {
    const url = new URL(value, 'https://app.local');
    if (url.origin !== 'https://app.local') return '/workspace';
    if (
      url.pathname === '/signin' ||
      url.pathname === '/signup' ||
      url.pathname.startsWith('/api/auth')
    ) {
      return '/workspace';
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return '/workspace';
  }
}

export function signInPath(returnTo = '/workspace') {
  return `/signin?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

export function signOutPath(returnTo = '/') {
  const target = safeReturnPath(returnTo);
  return `/api/auth/signout?return_to=${encodeURIComponent(target)}`;
}
