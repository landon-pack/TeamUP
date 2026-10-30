/**
 * Hardcoded localhost test account.
 *
 * Only accepted when the request host is localhost / 127.0.0.1.
 * Never works on the live Cloudflare URL.
 *
 * Sign in with either:
 *   username: admin
 *   email:    admin@teamup.local
 *   password: teamup
 */

export const LOCAL_DEV_ACCOUNT = {
  email: 'admin@teamup.local',
  username: 'admin',
  password: 'teamup',
  firstName: 'Local',
  lastName: 'Admin',
  name: 'Local Admin',
} as const;

/** True only for local Vite / Wrangler preview hosts. */
export function isLocalDevHost(req: Request) {
  const host = new URL(req.url).hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/** Whether this login+password matches the hardcoded local account. */
export function matchesLocalDevAccount(login: string, password: string) {
  const normalized = login.trim().toLowerCase();
  return (
    password === LOCAL_DEV_ACCOUNT.password &&
    (normalized === LOCAL_DEV_ACCOUNT.email || normalized === LOCAL_DEV_ACCOUNT.username)
  );
}
