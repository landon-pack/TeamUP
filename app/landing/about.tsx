/**
 * About section — structure only.
 *
 * TODO(teammate): replace the stub paragraph with final About Us copy.
 * You usually only need to edit the <h2> and the <p className="landing-about-body">.
 */
import { ChevronDown } from 'lucide-react';
import { LandingVisual } from './visual';

export function LandingAbout() {
  return (
    <section className='landing-about' id='about'>
      <div className='landing-about-row'>
        <div className='landing-about-copy'>
          <p className='landing-eyebrow'>ABOUT US</p>

          <h2>Built for student project groups</h2>

          <p className='landing-about-body'>
            [About us copy goes here.] TeamUP helps classmates coordinate group projects—shared tasks,
            milestones, availability, and files. Rewrite this paragraph with your team’s story.
          </p>
        </div>

        <LandingVisual />
      </div>

      <a
        className='landing-scroll-cue'
        href='#getting-started'
        aria-label='Scroll to Getting Started'
      >
        <span>Getting started</span>
        <ChevronDown size={22} aria-hidden='true' />
      </a>
    </section>
  );
}
