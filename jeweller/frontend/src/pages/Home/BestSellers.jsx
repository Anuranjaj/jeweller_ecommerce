import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../../services/api';
import { ProductImage } from '../../services/media';

// ─── Star Rating ────────────────────────────────────────────────────────────
const StarRating = ({ count, reviewCount }) => (
  <div className="flex items-center gap-1 mt-1 text-[14px]">
    {Array.from({ length: count }).map((_, i) => (
      <span key={i} className="material-symbols-outlined icon-fill text-[16px] text-[var(--color-primary-container)]">
        star
      </span>
    ))}
    <span className="text-[var(--color-on-surface-variant)] text-[12px] ml-1">({reviewCount})</span>
  </div>
);

// ─── Product Card ────────────────────────────────────────────────────────────
const ProductCard = ({ product }) => {
  const [wishlisted, setWishlisted] = useState(false);
  const price = Number(product.price || 0);

  return (
    <Link to={`/product/${product.slug || product.id}`} className="group cursor-pointer block">
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-[var(--color-surface-container-low)] mb-4 overflow-hidden">

        {/* Wishlist Button */}
        <button
          aria-label={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setWishlisted((prev) => !prev);
          }}
          className={`absolute top-4 right-4 z-10 transition-colors ${wishlisted
              ? 'text-[var(--color-error)]'
              : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-error)]'
            }`}
        >
          <span className={`material-symbols-outlined ${wishlisted ? 'icon-fill' : ''}`}>
            favorite
          </span>
        </button>

        {/* Product Image */}
        <ProductImage
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out"
          loading="lazy"
        />
      </div>

      {/* Product Info */}
      <div className="flex flex-col gap-1">
        <h3
          className="text-[18px] font-normal text-[var(--color-on-background)] line-clamp-1"
          style={{ fontFamily: 'var(--font-headline)' }}
        >
          {product.name}
        </h3>
        <p
          className="text-[16px] text-[var(--color-on-surface-variant)]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          ₹ {price.toLocaleString('en-IN')}
        </p>
        <StarRating count={Math.round(product.avg_rating || 5)} reviewCount={product.review_count || 0} />
      </div>
    </Link>
  );
};

// ─── Best Sellers Section ────────────────────────────────────────────────────
const BestSellers = () => {
  const { data: catalog = [], isLoading, isError } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
  });
  const featuredProducts = catalog.filter((product) => product.is_featured);
  const products = (featuredProducts.length ? featuredProducts : catalog).slice(0, 4);

  return (
    <section className="py-[var(--spacing-stack-xl)] bg-[var(--color-surface)]">
      <div className="max-w-[var(--spacing-container-max)] mx-auto px-[var(--spacing-margin-mobile)] md:px-[var(--spacing-margin-desktop)]">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-4">
          <div>
            <span
              className="text-xs font-semibold tracking-[0.1em] text-[var(--color-primary)] uppercase mb-2 block"
              style={{ fontFamily: 'var(--font-label)' }}
            >
              Best Sellers
            </span>
            <h2
              className="text-[32px] md:text-[48px] font-normal leading-[1.2] text-[var(--color-on-background)]"
              style={{ fontFamily: 'var(--font-headline)' }}
            >
              Our Most Loved Pieces
            </h2>
          </div>

          <Link
            to="/shop"
            className="text-sm font-medium tracking-[0.05em] uppercase text-[var(--color-on-background)] border-b border-[var(--color-on-background)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)] transition-colors pb-1 inline-flex items-center gap-2 group"
            style={{ fontFamily: 'var(--font-button)' }}
          >
            View All Products
            <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </Link>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">Loading the collection…</p>
        ) : isError ? (
          <p className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">The collection is temporarily unavailable.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        )}

      </div>
    </section>
  );
};

export default BestSellers;
