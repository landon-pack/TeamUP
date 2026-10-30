import { LANDING_ROUTES } from './routes';

/** First screen: brand, headline, and main buttons. */
export function LandingHero() {
  return (
    <section className='landing-hero'>
      <nav className='landing-nav' aria-label='Main navigation'>
        <a href='#about'>About Us</a>
      </nav>
      <div className='landing-hero-copy'>
        <p className='landing-brand'>
          teamup<span>.</span>
        </p>

        <h1>Your group, on the same page.</h1>

        <p className='landing-lede'>
          Plan tasks, find overlapping time, and keep assignment deadlines visible—without the
          group-chat chaos.
        </p>

        <div className='landing-cta-row'>
          {/* Working — creates an account via /signup */}
          <a className='btn primary' href={LANDING_ROUTES.signUp}>
            Sign up
          </a>

          <a className='btn' href={LANDING_ROUTES.signIn}>
            Sign in
          </a>

          <a className='btn subtle' href={LANDING_ROUTES.demo}>
            Try demo
          </a>
        </div>
      </div>
    </section>
  );
}
