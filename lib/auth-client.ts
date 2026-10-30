/**
 * Browser-side helpers for TeamUP account auth.
 *
 * Sign up  → POST /api/auth/signup
 * Sign in  → POST /api/auth/signin
 */

export const DEFAULT_AFTER_AUTH_PATH = '/workspace';

type AuthResult = {
  returnTo: string;
};

async function readAuthResponse(response: Response): Promise<AuthResult> {
  const data: { error?: string; returnTo?: string } = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unable to continue. Please try again.');
  }
  return { returnTo: data.returnTo || DEFAULT_AFTER_AUTH_PATH };
}

/** Create a new account and start a session. */
export async function signUpAccount(input: {
  name: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  returnTo?: string;
}): Promise<AuthResult> {
  const response = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      username: input.username,
      email: input.email,
      password: input.password,
      confirmPassword: input.confirmPassword,
      returnTo: input.returnTo || DEFAULT_AFTER_AUTH_PATH,
    }),
  });
  return readAuthResponse(response);
}

/** Sign in with email or username + password. */
export async function signInAccount(input: {
  login: string;
  password: string;
  returnTo?: string;
}): Promise<AuthResult> {
  const response = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      login: input.login,
      password: input.password,
      returnTo: input.returnTo || DEFAULT_AFTER_AUTH_PATH,
    }),
  });
  return readAuthResponse(response);
}

/** Read ?return_to= from the current URL, falling back to the workspace. */
export function readReturnToParam(): string {
  if (typeof window === 'undefined') return DEFAULT_AFTER_AUTH_PATH;
  const params = new URLSearchParams(window.location.search);
  return params.get('return_to') || DEFAULT_AFTER_AUTH_PATH;
}
