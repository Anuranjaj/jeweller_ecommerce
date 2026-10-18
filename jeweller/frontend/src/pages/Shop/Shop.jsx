// src/pages/Shop.jsx
import { useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Categories from '../Shop/Categories';
import Options from '../Shop/Options';
import { Search, X } from 'lucide-react';

const Shop = () => {
  // Read search & category from URL params
  const [searchParams, setSearchParams] = useSearchParams();
  const searchTerm = searchParams.get('search') || '';
  const selectedCategorySlug = searchParams.get('category') || null;

  // Local input state — debounced into the URL
  const [inputValue, setInputValue] = useState(searchTerm);

  // Update URL ?search= param as user types (with a small debounce via useEffect)
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);
      if (inputValue.trim()) {
        newParams.set('search', inputValue.trim());
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams, { replace: true });
    }, 350); // 350ms debounce
    return () => clearTimeout(timer);
  }, [inputValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCategoryChange = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug) {
      newParams.set('category', slug);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const handleClearSearch = () => {
    setInputValue('');
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('search');
    setSearchParams(newParams);
  };

  return (
    <section className="bg-white text-gray-800 pb-16">
      <div className="max-w-7xl mx-auto px-6 mt-8">

        {/* ── Search Bar ── */}
        <div className="relative mb-8">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search rings, earrings, bracelets..."
            className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#75593a] text-gray-800 placeholder-gray-400 transition-colors"
          />
          {/* Clear button — only visible when there is text */}
          {inputValue && (
            <button
              onClick={handleClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ── Sidebar + Product Grid ── */}
        <div className="flex flex-col md:flex-row gap-12 mt-6">
          <Options
            selectedCategorySlug={selectedCategorySlug}
            setSelectedCategorySlug={handleCategoryChange}
          />
          <Categories
            selectedCategorySlug={selectedCategorySlug}
            setSelectedCategorySlug={handleCategoryChange}
            searchTerm={searchTerm}
            onClearSearch={handleClearSearch}
          />
        </div>
      </div>
    </section>
  );
};

export default Shop;