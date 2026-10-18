 import { useQuery } from '@tanstack/react-query';
import { fetchCategories } from '../../services/api';

const Options = ({ selectedCategorySlug, setSelectedCategorySlug }) => {
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Fallback to static list if API isn't populated yet
  const categoryList = categories.length > 0 ? categories : [
    { name: "Rings", slug: "rings" },
    { name: "Necklaces", slug: "necklaces" },
    { name: "Earrings", slug: "earrings" },
    { name: "Bracelets", slug: "bracelets" },
  ];

  return (
    <aside className="w-full md:w-56 shrink-0 space-y-8">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-4">
          Categories
        </h3>
        <ul className="space-y-3 text-sm text-gray-600">
          {categoryList.map((cat) => (
            <li
              key={cat.id || cat.slug}
              onClick={() =>
                setSelectedCategorySlug(
                  selectedCategorySlug === cat.slug ? null : cat.slug
                )
              }
              className="flex items-center gap-3 cursor-pointer select-none hover:text-gray-900"
            >
              <input
                type="checkbox"
                checked={selectedCategorySlug === cat.slug}
                readOnly
                className="rounded border-gray-300 accent-[#634832] cursor-pointer"
              />
              <span className={selectedCategorySlug === cat.slug ? "font-semibold text-gray-900" : ""}>
                {cat.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};

export default Options;