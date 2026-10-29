/**
 * Marketing landing page (route: `/`).
 *
 * Who edits what:
 * - Hero CTAs / Sign up wiring → already set up
 * - About copy → app/landing/about.tsx
 * - Images → app/landing/visual.tsx (+ files in public/landing/)
 * - Sign in page look → app/signin/page.tsx
 *
 * Site map:
 *   /           → this landing page
 *   /signup     → create account (working)
 *   /signin     → sign in (functional; UI polish is a teammate task)
 *   /workspace  → main app after auth
 *   /demo       → try the app without an account
 */

import { LandingAbout } from './landing/about';
import { LandingFooter } from './landing/footer';
import { LandingHero } from './landing/hero';
import { LandingVisual } from './landing/visual';

export default function Landing() {
  return (
    <main className='landing-page'>
      <LandingHero />
      <LandingAbout />
      <LandingVisual />
      <LandingFooter />
    </main>
  );
}
