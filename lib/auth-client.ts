/**
 * Browser-side helpers for email + name session auth.
 *
 * Both /signup and /signin call the same API (`POST /api/auth/signin`).
 * There is no password — a valid name + email creates or resumes a session.
 */

export const DEFAULT_AFTER_AUTH_PATH = '/workspace';

type StartSessionInput = {
  name: string;
  email: string;
  /** Where to send the user after success (usually /workspace). */
  returnTo?: string;
};

type StartSessionResult = {
  returnTo: string;
};

/**
 * Creates a session cookie via the API, then returns where the browser should go next.
 * Throws an Error with a user-facing message on failure.
 */
export async function startEmailSession({
  name,
  email,
  returnTo = DEFAULT_AFTER_AUTH_PATH,
}: StartSessionInput): Promise<StartSessionResult> {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, returnTo }),
  });

  const data: { error?: string; returnTo?: string } = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Unable to continue. Please try again.');
  }

  return { returnTo: data.returnTo || DEFAULT_AFTER_AUTH_PATH };
}

/** Read ?return_to= from the current URL, falling back to the workspace. */
export function readReturnToParam(): string {
  if (typeof window === 'undefined') return DEFAULT_AFTER_AUTH_PATH;
  const params = new URLSearchParams(window.location.search);
  return params.get('return_to') || DEFAULT_AFTER_AUTH_PATH;
}
