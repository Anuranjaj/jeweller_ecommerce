import { Link } from 'react-router-dom';

// Hero section high-resolution jewelry banner
const HERO_IMAGE = '/images/hero/hero-banner.webp';


const HeroSection = () => {
  return (
    <section className="relative w-full min-h-[819px] md:min-h-[921px] flex items-center bg-[var(--color-surface-container-low)] overflow-hidden pt-12 md:pt-0">

      {/* Background Image — full width on mobile, right 60% on desktop */}
      <div
        className="absolute inset-0 w-full h-full md:w-[60%] md:left-auto md:right-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${HERO_IMAGE}')` }}
        role="img"
        aria-label="A dazzling diamond engagement ring set in polished rose gold on warm silk"
      />

      {/* Gradient overlay on mobile so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-surface-container-low)] via-[var(--color-surface-container-low)]/80 to-transparent md:hidden z-0" />

      {/* Content */}
      <div className="max-w-[var(--spacing-container-max)] mx-auto w-full px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)] relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="col-span-1 md:col-span-6 lg:col-span-5 flex flex-col justify-center py-16 md:py-0">

            {/* Eyebrow label */}
            <span className="text-xs font-semibold tracking-[0.1em] text-[var(--color-primary)] uppercase mb-4"
              style={{ fontFamily: 'var(--font-label)' }}>
              Timeless Elegance
            </span>

            {/* Headline */}
            <h1
              className="text-[42px] md:text-[64px] font-normal leading-[1.1] tracking-[-0.02em] text-[var(--color-on-background)] mb-6"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Crafted to<br />Shine Forever
            </h1>

            {/* Subtitle */}
            <p className="text-lg font-light leading-relaxed text-[var(--color-on-surface-variant)] mb-10 max-w-md"
              style={{ fontFamily: 'var(--font-body)' }}>
              Discover exquisite jewelry pieces designed to celebrate life's most precious moments.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center bg-[var(--color-on-background)] text-[var(--color-surface)] px-8 py-4 text-sm font-medium tracking-[0.05em] uppercase hover:bg-[var(--color-on-background)]/90 transition-colors w-full sm:w-auto gap-2"
                style={{ fontFamily: 'var(--font-button)' }}
              >
                Shop Collection
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>

              <button
                className="inline-flex items-center gap-3 text-sm font-medium tracking-[0.05em] text-[var(--color-on-background)] uppercase hover:text-[var(--color-primary)] transition-colors group"
                style={{ fontFamily: 'var(--font-button)' }}
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-full border border-[var(--color-outline)] group-hover:border-[var(--color-primary)] transition-colors">
                  <span className="material-symbols-outlined text-[20px] ml-0.5">play_arrow</span>
                </span>
                Explore the Story
              </button>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
