import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCategories, createCategory, createProduct, deleteProduct, updateProduct } from '../../services/api';
import { ProductImage } from '../../services/media';

const AdminAddProduct = ({ products = [] }) => {
  const queryClient = useQueryClient();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    new_category_name: '',
    price: '',
    stock: 15,
    material: '18k Yellow Gold',
    gemstone: '1.5 Carat Diamond',
    description: '',
    is_featured: false,
  });

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Quick edit stock state
  const [editingStockId, setEditingStockId] = useState(null);
  const [tempStockVal, setTempStockVal] = useState(0);

  // Search filter for existing catalog
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  });

  // Handle Image File selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Create Product Mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      let catId = formData.category_id;

      // If user typed a new category, create it first
      if (isAddingCategory && formData.new_category_name.trim()) {
        const newCat = await createCategory({ name: formData.new_category_name.trim() });
        catId = newCat.id;
        queryClient.invalidateQueries({ queryKey: ['categories'] });
      }

      if (!catId && categories.length > 0) {
        catId = categories[0].id;
      }

      // Build payload (FormData if image file attached)
      const data = new FormData();
      data.append('name', formData.name.trim());
      if (catId) data.append('category', catId);
      data.append('price', parseFloat(formData.price) || 0);
      data.append('stock', parseInt(formData.stock, 10) || 10);
      data.append('material', formData.material);
      data.append('gemstone', formData.gemstone);
      data.append('description', formData.description || 'A timeless heirloom handcrafted with ethically sourced materials.');
      data.append('is_featured', formData.is_featured);

      if (imageFile) {
        data.append('image', imageFile);
      }

      return createProduct(data);
    },
    onSuccess: () => {
      setStatusMessage({
        type: 'success',
        text: `Product "${formData.name}" added successfully and logged into inventory!`,
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });

      // Reset form
      setFormData({
        name: '',
        category_id: '',
        new_category_name: '',
        price: '',
        stock: 15,
        material: '18k Yellow Gold',
        gemstone: '1.5 Carat Diamond',
        description: '',
        is_featured: false,
      });
      setImageFile(null);
      setImagePreview('');
      setIsAddingCategory(false);

      setTimeout(() => setStatusMessage({ type: '', text: '' }), 4000);
    },
    onError: (err) => {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to create product. Please check your inputs.',
      });
    },
  });

  // Delete Product Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      setStatusMessage({ type: 'success', text: 'Product removed from catalog.' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 3000);
    },
    onError: () => {
      setStatusMessage({ type: 'error', text: 'Failed to delete product.' });
    },
  });

  // Update Stock Mutation
  const updateStockMutation = useMutation({
    mutationFn: ({ id, stock }) => updateProduct(id, { stock }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockMovements'] });
      setEditingStockId(null);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });
    if (!formData.name.trim() || !formData.price) {
      setStatusMessage({ type: 'error', text: 'Please provide product name and price.' });
      return;
    }
    addProductMutation.mutate();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.category_name && p.category_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-12">
      {/* ── Top Add Product Form ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 p-6 md:p-8 rounded-xs shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b border-outline-variant/30 gap-2">
          <div>
            <span className="font-label-caps text-xs text-primary uppercase tracking-widest block mb-1">
              Catalog Management
            </span>
            <h3 className="font-headline-md text-xl md:text-2xl text-on-surface">
              Add New Fine Jewelry Piece
            </h3>
          </div>
          <span className="text-xs text-on-surface-variant italic">
            Instantly synced to live storefront &amp; inventory
          </span>
        </div>

        {/* Feedback Alert */}
        {statusMessage.text && (
          <div
            className={`mb-6 p-4 rounded-xs text-xs font-medium flex items-center gap-2 animate-in fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {statusMessage.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{statusMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column: Core Details */}
            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Celestial Diamond Solitaire"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* Category Selector */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface">
                    Category *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                    className="text-[11px] text-primary hover:underline font-label-caps uppercase cursor-pointer"
                  >
                    {isAddingCategory ? 'Select Existing Category' : '+ Add New Category'}
                  </button>
                </div>

                {isAddingCategory ? (
                  <input
                    type="text"
                    placeholder="Enter new category name (e.g. Brooches, Tiara)"
                    value={formData.new_category_name}
                    onChange={(e) => setFormData({ ...formData, new_category_name: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                ) : (
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Price & Initial Stock */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 45000"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                    Initial Stock Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Material & Gemstone */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                    Material
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 18k Yellow Gold"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                    Center Stone / Gemstone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 1.5 Carat Diamond"
                    value={formData.gemstone}
                    onChange={(e) => setFormData({ ...formData, gemstone: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Image & Description */}
            <div className="space-y-4">
              {/* Image Upload with Preview */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                  Product Image (Database Upload)
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex-1 border-2 border-dashed border-outline-variant rounded p-4 text-center cursor-pointer hover:border-primary transition-colors bg-surface-container-low">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <span className="material-symbols-outlined text-[28px] text-primary block mb-1">
                      add_photo_alternate
                    </span>
                    <span className="text-xs text-on-surface font-medium block">
                      {imageFile ? imageFile.name : 'Click to Upload High-Res Photo'}
                    </span>
                    <span className="text-[10px] text-on-surface-variant block mt-0.5">
                      JPG, PNG or WebP accepted
                    </span>
                  </label>

                  {imagePreview && (
                    <div className="w-24 h-24 shrink-0 bg-surface-container-low border border-outline-variant rounded overflow-hidden relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview('');
                        }}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1 text-on-surface">
                  Description &amp; Heritage Story
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe the silhouette, setting, cut, and craftsmanship..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-3 text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Featured Checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="rounded border-outline-variant text-primary focus:ring-0 cursor-pointer"
                />
                <label htmlFor="is_featured" className="text-xs text-on-surface cursor-pointer select-none">
                  Highlight as Featured Piece on Homepage
                </label>
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-outline-variant/30 flex justify-end">
            <button
              type="submit"
              disabled={addProductMutation.isPending}
              className="bg-on-surface text-surface py-3.5 px-8 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {addProductMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                  Publishing Piece...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">publish</span>
                  Publish &amp; Add to Catalog
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── Existing Products List & Stock Manager ── */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 p-6 md:p-8 rounded-xs shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-outline-variant/30">
          <div>
            <h3 className="font-headline-md text-xl text-on-surface">
              Existing Catalog &amp; Quick Stock Control
            </h3>
            <p className="text-xs text-on-surface-variant">
              Manage inventory levels and view all published products
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant rounded py-2 pl-8 pr-3 text-xs text-on-surface focus:outline-none focus:border-primary"
            />
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute left-2.5 top-2.5">
              search
            </span>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-8 text-center italic">
            No products match your search criteria.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-container-low font-label-caps uppercase text-on-surface-variant">
                  <th className="p-3">Piece</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock Level</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredProducts.map((prod) => {
                  const isLow = (prod.stock || 0) <= 5;
                  const isEditingStock = editingStockId === prod.id;

                  return (
                    <tr key={prod.id} className="hover:bg-surface-container-low/50 transition-colors">
                      {/* Product Preview */}
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-container-low rounded border border-outline-variant/40 overflow-hidden shrink-0">
                            <ProductImage src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <span className="font-semibold text-on-surface block">{prod.name}</span>
                            <span className="text-[10px] text-on-surface-variant">
                              {prod.material} {prod.gemstone ? `• ${prod.gemstone}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="p-3 text-on-surface-variant">
                        <span className="bg-surface-container px-2 py-0.5 rounded text-[11px]">
                          {prod.category_name || 'Jewelry'}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="p-3 font-semibold text-on-surface">
                        ₹ {parseFloat(prod.price || 0).toLocaleString()}
                      </td>

                      {/* Stock Level with In-place Edit */}
                      <td className="p-3">
                        {isEditingStock ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              value={tempStockVal}
                              onChange={(e) => setTempStockVal(e.target.value)}
                              className="w-16 p-1 border border-primary rounded text-xs text-center"
                            />
                            <button
                              onClick={() =>
                                updateStockMutation.mutate({
                                  id: prod.id,
                                  stock: parseInt(tempStockVal, 10) || 0,
                                })
                              }
                              className="bg-primary text-white p-1 rounded hover:opacity-90"
                              title="Save"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span>
                            </button>
                            <button
                              onClick={() => setEditingStockId(null)}
                              className="border border-outline-variant p-1 rounded hover:bg-surface-container-low"
                              title="Cancel"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-semibold ${
                                isLow ? 'text-rose-700 font-bold' : 'text-on-surface'
                              }`}
                            >
                              {prod.stock || 0} units
                            </span>
                            {isLow && (
                              <span className="text-[9px] bg-rose-50 text-rose-800 border border-rose-200 px-1.5 py-0.2 rounded font-label-caps uppercase">
                                Low
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingStockId(prod.id);
                                setTempStockVal(prod.stock || 0);
                              }}
                              className="text-on-surface-variant hover:text-primary transition-colors ml-1 cursor-pointer"
                              title="Quick Adjust Stock"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            if (window.confirm(`Delete "${prod.name}" from catalog?`)) {
                              deleteMutation.mutate(prod.id);
                            }
                          }}
                          className="text-rose-600 hover:text-rose-800 p-1 font-label-caps uppercase text-[10px] cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAddProduct;
