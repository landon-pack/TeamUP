/** Product preview image showing the kind of collaboration TeamUP supports. */
export function LandingVisual() {
  return (
    <section className='landing-visual' aria-label='Product preview'>
      <figure className='landing-visual-frame'>
        <img
          src='/landing/group-collaboration.jpg'
          alt='A diverse group of students working together around a laptop.'
          loading='lazy'
          width='1800'
          height='1200'
        />
        <figcaption>
          Students collaborating on a shared project. Photo by{' '}
          <a href='https://unsplash.com/photos/diverse-group-of-students-gathered-around-a-laptop-8gAbl776pc0'>
            Vitaly Gariev on Unsplash
          </a>
          .
        </figcaption>
      </figure>
    </section>
  );
}
