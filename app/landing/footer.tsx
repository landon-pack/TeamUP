import { LANDING_ROUTES } from './routes';

/** Simple footer links (same destinations as the hero CTAs). */
export function LandingFooter() {
  return (
    <footer className='landing-footer'>
      <a href={LANDING_ROUTES.signUp}>Create an account</a>
      <span aria-hidden='true'>·</span>
      {/* TODO(teammate): link to LANDING_ROUTES.signIn when wiring sign-in */}
      <span className='landing-footer-muted' title='Sign in link coming soon'>
        Sign in
      </span>
      <span aria-hidden='true'>·</span>
      <a href={LANDING_ROUTES.demo}>Demo</a>
    </footer>
  );
}
