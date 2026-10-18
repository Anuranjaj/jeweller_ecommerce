import { Link } from 'react-router-dom';

// Category data with high-resolution curated boutique jewelry imagery
const categories = [
  {
    title: 'Necklaces',
    href: '/shop?category=necklaces',
    image: '/images/categories/necklaces.webp',
    alt: 'Fine diamond and gold necklaces',
  },
  {
    title: 'Rings',
    href: '/shop?category=rings',
    image: '/images/categories/rings.webp',
    alt: 'Solitaire and eternity rings',
  },
  {
    title: 'Earrings',
    href: '/shop?category=earrings',
    image: '/images/categories/earrings.webp',
    alt: 'Diamond and gold drop earrings',
  },
  {
    title: 'Bracelets',
    href: '/shop?category=bracelets',
    image: '/images/categories/bracelets.webp',
    alt: 'Luxury diamond bracelets and cuffs',
  },
  {
    title: 'Heritage',
    href: '/shop?category=necklaces',
    image: '/images/categories/mangalsutra.webp',
    alt: 'Traditional handcrafted heritage jewelry',
  },
];


const ShopByCategory = () => {
  return (
    <section className="py-[var(--spacing-stack-xl)]">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)]">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <span
              className="text-xs font-semibold tracking-[0.1em] text-[var(--color-primary)] uppercase mb-2 block"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Collections
            </span>
            <h2
              className="text-[32px] md:text-[48px] font-normal leading-[1.2] text-[var(--color-on-background)]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Shop by Category
            </h2>
          </div>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-[var(--spacing-gutter)]">
          {categories.map((category) => (
            <Link
              key={category.title}
              to={category.href}
              className="group flex flex-col relative overflow-hidden rounded-lg bg-[var(--color-surface-container-low)] transition-all duration-700 hover:shadow-sm"
            >
              {/* Image */}
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={category.image}
                  alt={category.alt}
                  className="w-full h-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-110"
                  loading="lazy"
                />
              </div>

              {/* Label */}
              <div className="p-6 flex flex-col items-center text-center">
                <h4
                  className="text-[20px] font-normal text-[var(--color-on-background)] mb-2"
                  style={{ fontFamily: 'var(--font-headline)' }}
                >
                  {category.title}
                </h4>
                {/* Animated underline indicator */}
                <div className="w-8 h-px bg-[var(--color-outline-variant)] group-hover:w-12 group-hover:bg-[var(--color-primary)] transition-all duration-300" />
              </div>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ShopByCategory;
