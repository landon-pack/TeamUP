import { clearSessionCookieHeader, safeReturnPath } from '@/lib/auth';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secure = url.protocol === 'https:';
  const returnTo = safeReturnPath(url.searchParams.get('return_to'));
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
