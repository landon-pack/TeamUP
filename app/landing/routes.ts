/**
 * Public URLs used by the marketing landing page.
 * Keep these in one place so CTA links stay consistent.
 */
export const LANDING_ROUTES = {
  /** Create an account (working). */
  signUp: '/signup',
  /** Existing account — opens /signin, then /workspace after success. */
  signIn: '/signin?return_to=%2Fworkspace',
  /** Local/demo workspace with no account required. */
  demo: '/demo',
  /** App home after a successful sign-up / sign-in. */
  workspace: '/workspace',
} as const;
