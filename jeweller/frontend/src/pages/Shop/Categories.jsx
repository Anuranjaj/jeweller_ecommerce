import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../../services/api';
import { Heart, ChevronDown, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { ProductImage } from '../../services/media';

const Categories = ({ selectedCategorySlug, setSelectedCategorySlug, searchTerm, onClearSearch }) => {
  // Include both category AND searchTerm in the queryKey so React Query
  // automatically refetches whenever either value changes
  const { data: products = [], isLoading, isError, error } = useQuery({
    queryKey: ['products', selectedCategorySlug, searchTerm],
    queryFn: () => fetchProducts(selectedCategorySlug, searchTerm),
  });

  return (
    <main className="flex-1">
      {/* Active Filters Bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-2">

          {/* Search term badge */}
          {searchTerm && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#75593a]/10 rounded-full text-xs text-[#75593a] border border-[#75593a]/30">
              🔍 "{searchTerm}"
              <X
                size={12}
                className="cursor-pointer hover:text-black"
                onClick={onClearSearch}
              />
            </span>
          )}

          {/* Category badge */}
          {selectedCategorySlug && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-700 border border-gray-200 capitalize">
              {selectedCategorySlug}
              <X
                size={12}
                className="cursor-pointer hover:text-black"
                onClick={() => setSelectedCategorySlug(null)}
              />
            </span>
          )}

          {/* Clear all when any filter is active */}
          {(searchTerm || selectedCategorySlug) && (
            <button
              onClick={() => { setSelectedCategorySlug(null); onClearSearch?.(); }}
              className="text-xs text-gray-400 underline hover:text-black"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
          <span>Sort by:</span>
          <span className="font-semibold text-gray-900 flex items-center gap-1">
            Recommended <ChevronDown size={14} />
          </span>
        </div>
      </div>

      {/* Loading & Error States */}
      {isLoading && (
        <div className="text-center py-16 text-gray-400 font-serif">
          Loading luxury items...
        </div>
      )}

      {isError && (
        <div className="text-center py-16 text-red-500 text-sm">
          Error loading catalog: {error?.message || 'Failed to load products'}
        </div>
      )}

      {/* Product Display Grid */}
      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {products.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <p className="text-4xl mb-4">💎</p>
              <p className="text-gray-800 font-medium text-base" style={{ fontFamily: "'Playfair Display', serif" }}>
                No results found
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {searchTerm
                  ? `No products match "${searchTerm}"${selectedCategorySlug ? ` in ${selectedCategorySlug}` : ''}.`
                  : `No products found in "${selectedCategorySlug}".`}
              </p>
              <button
                onClick={() => { setSelectedCategorySlug(null); onClearSearch?.(); }}
                className="mt-4 text-xs text-[#75593a] underline hover:text-black"
              >
                Clear filters
              </button>
            </div>
          ) : (
            products.map((item) => {
              const productTitle = item.title || item.name || 'Untitled Product';
              const productTag = item.tag || item.material;
              const productBadge = item.badge || (item.is_featured ? 'FEATURED' : null);
              const productRating = item.rating || 5;

              const formattedPrice =
                typeof item.price === 'number' || !isNaN(item.price)
                  ? `₹${parseFloat(item.price).toLocaleString()}`
                  : item.price;

              return (
                <Link
                  key={item.id}
                  to={`/product/${item.slug || item.id}`}
                  className="group cursor-pointer block"
                >
                  <div className="relative aspect-square bg-gray-50 overflow-hidden mb-4">
                    {productTag && (
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-gray-400 tracking-widest uppercase">
                        {productTag}
                      </span>
                    )}
                    {productBadge && (
                      <span className="absolute top-3 left-3 bg-black text-white text-[10px] font-semibold px-2 py-0.5 tracking-wider">
                        {productBadge}
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      className="absolute top-3 right-3 text-gray-700 hover:text-black transition-colors z-10 cursor-pointer"
                    >
                      <Heart size={18} strokeWidth={1.5} />
                    </button>
                    <ProductImage
                      src={item.image}
                      alt={productTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  <div className="text-center space-y-1">
                    <h4
                      className="font-serif text-sm text-gray-900"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {productTitle}
                    </h4>
                    <p className="text-xs text-gray-600 font-medium">{formattedPrice}</p>

                    {productRating && (
                      <div className="flex justify-center gap-0.5 text-[#C49A6C] pt-1">
                        {[...Array(productRating)].map((_, i) => (
                          <Star key={i} size={12} fill="currentColor" stroke="none" />
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 text-xs">
        <button className="p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-600">
          <ChevronLeft size={14} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center bg-[#634832] text-white font-medium rounded">
          1
        </button>
        <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
          2
        </button>
        <button className="w-8 h-8 flex items-center justify-center border border-gray-200 rounded text-gray-600 hover:bg-gray-50">
          3
        </button>
        <span className="px-1 text-gray-400">...</span>
        <button className="p-2 border border-gray-200 rounded hover:bg-gray-50 text-gray-600">
          <ChevronRight size={14} />
        </button>
      </div>
    </main>
  );
};

export default Categories;