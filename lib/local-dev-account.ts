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
  firstName: 'Admin',
  lastName: 'User',
  /** Shown in the workspace sidebar (bottom-left). */
  name: 'admin',
} as const;

/** sessionStorage key so the UI can show "admin" even if the HttpOnly cookie isn't readable. */
export const LOCAL_ADMIN_SESSION_KEY = 'teamup_local_admin';

export function rememberLocalAdminSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(LOCAL_ADMIN_SESSION_KEY, '1');
}

export function clearLocalAdminSession() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
}

export function hasLocalAdminSession() {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(LOCAL_ADMIN_SESSION_KEY) === '1';
}

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

export function localAdminUser() {
  return {
    id: 'user:' + LOCAL_DEV_ACCOUNT.email,
    name: LOCAL_DEV_ACCOUNT.name,
    username: LOCAL_DEV_ACCOUNT.username,
    email: LOCAL_DEV_ACCOUNT.email,
  };
}
