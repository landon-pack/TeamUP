/**
 * Sign out — clears the session cookie.
 *
 * GET  /api/auth/signout?return_to=/  → redirect after clearing (used by links)
 * POST /api/auth/signout             → JSON ok (used by fetch clients)
 */

import { clearSessionCookieHeader, safeReturnPath } from '@/lib/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secure = url.protocol === 'https:';
  // Prefer explicit home (/) after logout; otherwise sanitize return_to.
  const requested = url.searchParams.get('return_to');
  const returnTo = requested === '/' || requested === null ? '/' : safeReturnPath(requested);

  return new Response(null, {
    status: 302,
    headers: {
      Location: returnTo,
      'Set-Cookie': clearSessionCookieHeader(secure),
      'Cache-Control': 'private, no-store',
    },
  });
}

export async function POST(req: Request) {
  const secure = new URL(req.url).protocol === 'https:';
  return Response.json(
    { ok: true },
    {
      headers: {
        'Set-Cookie': clearSessionCookieHeader(secure),
        'Cache-Control': 'private, no-store',
      },
    },
  );
}
