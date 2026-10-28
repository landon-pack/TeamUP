import {
  createSessionToken,
  safeReturnPath,
  sessionCookieHeader,
  validateSignIn,
} from '@/lib/auth';
import { sameOrigin } from '@/lib/server';

export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const body = (await req.json()) as { email?: string; name?: string; returnTo?: string };
    const validated = validateSignIn(body);
    if ('error' in validated) {
      return Response.json({ error: validated.error }, { status: 400 });
    }
    const token = await createSessionToken(validated.email, validated.name);
    const secure = new URL(req.url).protocol === 'https:';
    return Response.json(
      { ok: true, returnTo: safeReturnPath(body.returnTo) },
      {
        headers: {
          'Set-Cookie': sessionCookieHeader(token, secure),
        },
      },
    );
  } catch {
    return Response.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 });
  }
}
