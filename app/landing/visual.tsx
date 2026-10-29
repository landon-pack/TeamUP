/**
 * Visual / image section — structure only.
 *
 * TODO(teammate): add real images.
 * 1. Put files in public/landing/ (example: public/landing/group.jpg)
 * 2. Replace the placeholder div with:
 *    <img src="/landing/group.jpg" alt="Students collaborating on a project" />
 */
export function LandingVisual() {
  return (
    <section className='landing-visual' aria-label='Product preview'>
      <div className='landing-visual-frame'>
        {/* Placeholder until a teammate drops in final imagery */}
        <div className='landing-visual-placeholder'>
          <p>Image placeholder</p>
          <small>Add a photo of a productive group working together</small>
        </div>
      </div>
    </section>
  );
}
