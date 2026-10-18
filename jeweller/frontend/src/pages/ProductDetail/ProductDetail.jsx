import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProductDetail, fetchProducts, createReview, checkProductPurchased } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { ProductImage } from '../../services/media';
import { getMediaUrl } from '../../services/mediaUrl';

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const { addToCart, isProductPurchased } = useCart();

  // Scroll to top when product changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  // 1. Product Data from Backend Database
  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => fetchProductDetail(slug),
  });

  // 2. Curated / Related Products from Database
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => fetchProducts(),
  });

  // Selection states
  const [imageSelection, setImageSelection] = useState(null);
  const selectedImage = imageSelection?.slug === slug ? imageSelection.image : null;
  const [selectedMetal, setSelectedMetal] = useState('18k Yellow Gold');
  const [selectedSize, setSelectedSize] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);

  // Review Modal and Purchase Verification states
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [purchaseNotice, setPurchaseNotice] = useState(null); // Notice message if not purchased/logged in
  const [reviewFormData, setReviewFormData] = useState({
    author_name: user?.name || user?.first_name || '',
    rating: 5,
    title: '',
    comment: '',
  });
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Update author name if user auth state changes
  // Extract ONLY database images (no hardcoded/dummy images)
  const productImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      const urls = product.images.filter(Boolean).map(getMediaUrl);
      if (urls.length > 0) return urls;
    }
    if (product.image) {
      return [getMediaUrl(product.image)];
    }
    return [getMediaUrl(null)];
  }, [product]);


  // Check if current user has purchased this product (non-cancelled orders)
  const checkHasPurchased = () => {
    if (!product) return false;
    if (typeof isProductPurchased === 'function') {
      return isProductPurchased(product.slug) || isProductPurchased(product.id);
    }
    try {
      const purchased = JSON.parse(localStorage.getItem('lumiere_purchased_products') || '[]');
      const productSlug = String(product.slug || '');
      const productId = String(product.id || '');
      return purchased.includes(productSlug) || purchased.includes(productId);
    } catch {
      return false;
    }
  };

  // Handle "Write a Review" click with backend purchase check
  const handleOpenReviewModal = async () => {
    setPurchaseNotice(null);
    setReviewError('');
    setReviewMessage('');

    // If not authenticated, prompt user
    if (!isAuthenticated) {
      setPurchaseNotice({
        type: 'auth_required',
        message: 'Please sign in to verify your purchase and leave a review.',
      });
      return;
    }

    // Check if user has purchased this piece
    let hasPurchased = checkHasPurchased();
    if (!hasPurchased && product?.slug) {
      try {
        const res = await checkProductPurchased(product.slug);
        hasPurchased = Boolean(res && res.has_purchased);
      } catch {
        hasPurchased = false;
      }
    }

    if (!hasPurchased) {
      setPurchaseNotice({
        type: 'not_purchased',
        message: 'Only verified purchasers of this luxury piece are eligible to submit a review.',
      });
      return;
    }

    // Open review modal for verified purchaser
    setIsReviewModalOpen(true);
  };

  // Submit Review Mutation
  const reviewMutation = useMutation({
    mutationFn: (data) => createReview(slug, data),
    onSuccess: () => {
      setReviewMessage('Thank you! Your verified review has been submitted.');
      queryClient.invalidateQueries({ queryKey: ['product', slug] });
      setTimeout(() => {
        setIsReviewModalOpen(false);
        setReviewMessage('');
        setReviewFormData({
          author_name: user?.name || user?.first_name || '',
          rating: 5,
          title: '',
          comment: '',
        });
      }, 1500);
    },
    onError: (err) => {
      setReviewError(err.message || 'Failed to submit review. Please try again.');
    },
  });

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    setReviewError('');
    setReviewMessage('');
    if (!reviewFormData.title.trim() || !reviewFormData.comment.trim()) {
      setReviewError('Please complete all required fields.');
      return;
    }
    reviewMutation.mutate(reviewFormData);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, 1, { metal: selectedMetal, size: selectedSize });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center py-24 text-on-surface">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-label-caps text-label-caps tracking-widest uppercase text-on-surface-variant">
          Loading Luxury Piece...
        </p>
      </div>
    );
  }

  // Error / Not Found State
  if (isError || !product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center py-20 px-4 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">diamond</span>
        <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Product Not Found</h2>
        <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-md">
          {error?.message || 'The selected luxury item could not be found in our collection.'}
        </p>
        <Link
          to="/shop"
          className="bg-on-surface text-surface py-3 px-8 font-button text-button uppercase tracking-widest hover:bg-on-surface-variant transition-colors"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const activeMainImage = selectedImage || (productImages.length > 0 ? productImages[0] : null);

  const formattedPrice =
    typeof product.price === 'number' || !isNaN(product.price)
      ? `₹ ${parseFloat(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : product.price;

  // Reviews from database
  const reviewsList = product.reviews || [];
  const hasReviews = reviewsList.length > 0;
  const avgRating = product.avg_rating || 5.0;

  // Curated related products (excluding current product)
  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="bg-surface text-on-surface antialiased selection:bg-primary-fixed selection:text-on-primary-fixed">
      {/* Main Content Canvas */}
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-stack-md pb-stack-xl">
        
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex text-on-surface-variant font-label-caps text-label-caps uppercase mb-12">
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link className="hover:text-primary transition-colors" to="/">Home</Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="material-symbols-outlined text-[14px] mx-1">chevron_right</span>
                <Link className="hover:text-primary transition-colors" to="/shop">Shop</Link>
              </div>
            </li>
            {product.category_name && (
              <li>
                <div className="flex items-center">
                  <span className="material-symbols-outlined text-[14px] mx-1">chevron_right</span>
                  <Link className="hover:text-primary transition-colors" to={`/shop?category=${product.category_slug || ''}`}>
                    {product.category_name}
                  </Link>
                </div>
              </li>
            )}
            <li aria-current="page">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-[14px] mx-1">chevron_right</span>
                <span className="text-on-surface font-semibold">{product.name}</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Product Section: Gallery & Info */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-stack-xl">
          
          {/* Left: Image Gallery (Span 7) */}
          <div className="md:col-span-7 flex flex-col md:flex-row gap-6">
            
            {/* Thumbnails: ONLY shown if multiple images exist in the database */}
            {productImages.length > 1 && (
              <div className="order-2 md:order-1 flex md:flex-col gap-4 overflow-x-auto md:overflow-visible hide-scrollbar w-full md:w-24 shrink-0">
                {productImages.map((imgSrc, idx) => (
                  <button
                    key={idx}
                    onClick={() => setImageSelection({ slug, image: imgSrc })}
                    className={`gallery-thumb-container w-20 md:w-full aspect-square bg-surface-container-low border focus:outline-none transition-all duration-300 cursor-pointer ${
                      activeMainImage === imgSrc
                        ? 'border-primary shadow-sm'
                        : 'border-outline-variant hover:border-primary opacity-80 hover:opacity-100'
                    }`}
                  >
                    <ProductImage
                      alt={`${product.name} Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                      src={imgSrc}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Main Hero Image (Database Only) */}
            <div className={`order-1 md:order-2 w-full bg-surface-container-lowest relative aspect-[4/5] md:aspect-auto overflow-hidden ${
              productImages.length <= 1 ? 'min-h-[480px] md:min-h-[580px]' : ''
            }`}>
              {activeMainImage ? (
                <ProductImage
                  alt={`${product.name} - Main View`}
                  className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  id="main-product-image"
                  src={activeMainImage}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center text-on-surface-variant bg-surface-container-low">
                  <span className="material-symbols-outlined text-[48px] text-primary mb-2">diamond</span>
                  <p className="font-headline-sm text-sm uppercase tracking-wider">{product.name}</p>
                </div>
              )}

              {/* Wishlist FAB on main image */}
              <button
                aria-label={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                onClick={() => setIsWishlisted((prev) => !prev)}
                className="absolute top-4 right-4 bg-surface/80 backdrop-blur-sm p-3 rounded-full hover:bg-surface transition-colors border border-outline-variant flex items-center justify-center text-on-surface group cursor-pointer shadow-xs"
              >
                <span className={`material-symbols-outlined transition-colors ${isWishlisted ? 'fill-icon text-error' : 'group-hover:text-primary'}`}>
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Right: Product Info & Actions (Span 5) */}
          <div className="md:col-span-5 flex flex-col justify-center lg:pl-12">
            
            {/* Headers */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-caps text-label-caps uppercase text-primary tracking-widest">
                  {product.category_name || 'Bridal & Fine Jewelry'}
                </span>
              </div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface mb-4">
                {product.name}
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant font-medium">
                {formattedPrice}
              </p>
            </div>

            {/* Description */}
            <div className="mb-10 font-body-md text-body-md text-on-surface-variant space-y-4">
              <p>
                {product.description ||
                  'A testament to enduring elegance. This piece features a meticulously selected, ethically sourced center stone set in a sculptural solid gold band. Designed to capture light from every angle, it is a modern heirloom crafted with uncompromising precision.'}
              </p>
            </div>

            {/* Selectors */}
            <div className="space-y-6 mb-10">
              
              {/* Metal Type */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface">
                    Metal: <span className="font-normal text-on-surface-variant ml-1">{selectedMetal}</span>
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    aria-label="18k Yellow Gold"
                    onClick={() => setSelectedMetal('18k Yellow Gold')}
                    className={`w-10 h-10 rounded-full bg-[#E8D19F] flex items-center justify-center focus:outline-none cursor-pointer transition-all ${
                      selectedMetal === '18k Yellow Gold' ? 'border-2 border-on-surface scale-105' : 'border border-outline-variant hover:border-outline'
                    }`}
                  >
                    {selectedMetal === '18k Yellow Gold' && (
                      <span className="material-symbols-outlined text-[16px] text-on-surface">check</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="18k White Gold"
                    onClick={() => setSelectedMetal('18k White Gold')}
                    className={`w-10 h-10 rounded-full bg-[#E5E7EB] flex items-center justify-center focus:outline-none cursor-pointer transition-all ${
                      selectedMetal === '18k White Gold' ? 'border-2 border-on-surface scale-105' : 'border border-outline-variant hover:border-outline'
                    }`}
                  >
                    {selectedMetal === '18k White Gold' && (
                      <span className="material-symbols-outlined text-[16px] text-on-surface">check</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="18k Rose Gold"
                    onClick={() => setSelectedMetal('18k Rose Gold')}
                    className={`w-10 h-10 rounded-full bg-[#E6B8A2] flex items-center justify-center focus:outline-none cursor-pointer transition-all ${
                      selectedMetal === '18k Rose Gold' ? 'border-2 border-on-surface scale-105' : 'border border-outline-variant hover:border-outline'
                    }`}
                  >
                    {selectedMetal === '18k Rose Gold' && (
                      <span className="material-symbols-outlined text-[16px] text-on-surface">check</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Size Selector */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-label-caps text-label-caps uppercase text-on-surface">Ring Size</span>
                  <button
                    type="button"
                    onClick={() => setIsSizeGuideOpen(true)}
                    className="text-primary font-label-caps text-[10px] uppercase border-b border-primary hover:text-on-surface hover:border-on-surface transition-colors cursor-pointer"
                  >
                    Size Guide
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full bg-transparent border-b border-outline-variant py-3 font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-0 appearance-none rounded-none cursor-pointer pr-8"
                  >
                    <option value="">Select Size</option>
                    <option value="4">Size 4</option>
                    <option value="4.5">Size 4.5</option>
                    <option value="5">Size 5</option>
                    <option value="5.5">Size 5.5</option>
                    <option value="6">Size 6</option>
                    <option value="6.5">Size 6.5</option>
                    <option value="7">Size 7</option>
                    <option value="7.5">Size 7.5</option>
                    <option value="8">Size 8</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Actions */}
            <div className="flex flex-col gap-4 mb-8">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full bg-on-surface text-surface py-5 font-button text-button uppercase tracking-widest hover:bg-surface hover:text-on-surface hover:border-on-surface border border-transparent transition-all duration-300 cursor-pointer flex items-center justify-center gap-2"
              >
                {addedToCart ? (
                  <>
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Added to Bag
                  </>
                ) : (
                  'Add to Cart'
                )}
              </button>

              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">location_on</span>
                <button
                  type="button"
                  onClick={() => setIsStoreModalOpen(true)}
                  className="font-label-caps text-label-caps text-on-surface-variant uppercase hover:text-primary transition-colors border-b border-transparent hover:border-primary pb-0.5 cursor-pointer"
                >
                  Find in Store
                </button>
              </div>
            </div>

            {/* Accordion Specs */}
            <div className="border-t border-outline-variant divide-y divide-outline-variant">
              <details className="group py-4" open>
                <summary className="flex justify-between items-center font-label-caps text-label-caps uppercase cursor-pointer list-none text-on-surface">
                  <span>Details &amp; Specifications</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </span>
                </summary>
                <div className="text-on-surface-variant font-body-md text-body-md mt-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-on-surface">Material</span>
                    <span>{product.material || selectedMetal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface">Center Stone</span>
                    <span>{product.gemstone || '1.5 Carat Diamond'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface">Clarity / Color</span>
                    <span>VS1 / G</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface">Origin</span>
                    <span>Ethically Sourced &amp; Certified</span>
                  </div>
                </div>
              </details>

              <details className="group py-4">
                <summary className="flex justify-between items-center font-label-caps text-label-caps uppercase cursor-pointer list-none text-on-surface">
                  <span>Shipping &amp; Returns</span>
                  <span className="transition-transform duration-300 group-open:rotate-180">
                    <span className="material-symbols-outlined text-[20px]">expand_more</span>
                  </span>
                </summary>
                <div className="text-on-surface-variant font-body-md text-body-md mt-4">
                  <p>
                    Complimentary insured overnight shipping on all fine jewelry orders. Returns &amp; exchanges accepted within 30 days in original, unworn condition.
                  </p>
                </div>
              </details>
            </div>

            {/* Review Eligibility Banner / Prompt */}
            {purchaseNotice && (
              <div className="mt-6 p-4 bg-surface-container-low border border-outline-variant/60 rounded-md text-xs space-y-2">
                <div className="flex items-start gap-2 text-on-surface">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0">info</span>
                  <div>
                    <p className="font-semibold">{purchaseNotice.message}</p>
                    {purchaseNotice.type === 'auth_required' && (
                      <div className="mt-2 flex gap-3">
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                          Sign In
                        </Link>
                        <span className="text-outline">|</span>
                        <Link to="/register" className="text-primary font-semibold hover:underline">
                          Create Account
                        </Link>
                      </div>
                    )}
                    {purchaseNotice.type === 'not_purchased' && (
                      <p className="mt-1 text-on-surface-variant text-[11px]">
                        Purchase this piece or complete an order to unlock client review privileges.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Write a Review Trigger in Info column if no reviews section is showing */}
            {!hasReviews && (
              <div className="mt-8 pt-6 border-t border-outline-variant/40 flex justify-between items-center">
                <span className="text-xs font-label-caps uppercase text-on-surface-variant">Verified Purchaser?</span>
                <button
                  type="button"
                  onClick={handleOpenReviewModal}
                  className="font-label-caps text-label-caps uppercase text-primary border-b border-primary hover:text-on-surface hover:border-on-surface transition-colors cursor-pointer"
                >
                  Write a Review
                </button>
              </div>
            )}

          </div>
        </section>

        {/* Customer Reviews Section: ONLY rendered when reviews exist in the database */}
        {hasReviews && (
          <section className="mb-stack-xl border-t border-outline-variant pt-stack-lg">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
              <div>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Client Testimonials
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex text-primary">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-[18px] ${
                          star <= Math.round(avgRating) ? 'fill-icon' : ''
                        }`}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <span className="font-body-md text-on-surface-variant">
                    {avgRating} / 5 ({reviewsList.length} {reviewsList.length === 1 ? 'Review' : 'Reviews'})
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenReviewModal}
                className="hidden md:block font-label-caps text-label-caps uppercase text-on-surface border-b border-on-surface pb-1 hover:text-primary hover:border-primary transition-colors cursor-pointer"
              >
                Write a Review
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-surface-container-lowest p-8 border border-outline-variant/50">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex text-primary">
                      {[...Array(rev.rating || 5)].map((_, i) => (
                        <span key={i} className="material-symbols-outlined fill-icon text-[14px]">
                          star
                        </span>
                      ))}
                    </div>
                    {rev.is_verified !== false && (
                      <span className="font-label-caps text-[10px] text-surface-tint border border-surface-tint px-2 py-1 rounded-sm uppercase">
                        Verified
                      </span>
                    )}
                  </div>
                  <h3 className="font-headline-sm text-headline-sm mb-3 text-on-surface">
                    {rev.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 italic">
                    "{rev.comment}"
                  </p>
                  <div className="font-label-caps text-label-caps text-on-surface">
                    {rev.author_name}{' '}
                    {rev.created_at && (
                      <span className="text-on-surface-variant ml-2 font-normal">
                        {new Date(rev.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleOpenReviewModal}
              className="mt-8 md:hidden w-full py-4 border border-on-surface font-label-caps text-label-caps uppercase text-on-surface text-center cursor-pointer"
            >
              Write a Review
            </button>
          </section>
        )}

        {/* You May Also Like / Curated for You (Database items) */}
        {relatedProducts.length > 0 && (
          <section className="mb-stack-xl">
            <h2 className="font-headline-md text-headline-md text-center text-on-surface mb-12">
              Curated for You
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-gutter">
              {relatedProducts.map((relItem) => {
                const relPrice =
                  typeof relItem.price === 'number' || !isNaN(relItem.price)
                    ? `₹ ${parseFloat(relItem.price).toLocaleString()}`
                    : relItem.price;

                return (
                  <div
                    key={relItem.id}
                    onClick={() => navigate(`/product/${relItem.slug || relItem.id}`)}
                    className="group cursor-pointer"
                  >
                    <div className="relative bg-surface-container-low aspect-[4/5] mb-4 overflow-hidden">
                      <ProductImage
                        alt={relItem.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        src={relItem.image}
                      />
                      <button
                        type="button"
                        aria-label="Add to Wishlist"
                        onClick={(e) => e.stopPropagation()}
                        className="absolute top-3 right-3 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined">favorite</span>
                      </button>
                    </div>
                    <div className="text-center">
                      <h3 className="font-headline-sm text-[18px] text-on-surface mb-1 line-clamp-1">
                        {relItem.name}
                      </h3>
                      <p className="font-body-md text-on-surface-variant">{relPrice}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

      </main>

      {/* Ring Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface border border-outline-variant max-w-md w-full p-6 md:p-8 rounded-xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <h3 className="font-headline-sm text-headline-sm mb-4 text-on-surface">
              Ring Size Guide
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mb-4">
              To find your ideal fit, wrap a strip of paper comfortably around the base of your finger and measure the millimeter circumference.
            </p>
            <div className="border border-outline-variant/50 divide-y divide-outline-variant/50 text-xs">
              <div className="grid grid-cols-2 p-2 font-semibold bg-surface-container-low">
                <span>US Ring Size</span>
                <span>Inside Circumference</span>
              </div>
              <div className="grid grid-cols-2 p-2"><span>Size 4</span><span>46.8 mm</span></div>
              <div className="grid grid-cols-2 p-2"><span>Size 5</span><span>49.3 mm</span></div>
              <div className="grid grid-cols-2 p-2"><span>Size 6</span><span>51.9 mm</span></div>
              <div className="grid grid-cols-2 p-2"><span>Size 7</span><span>54.4 mm</span></div>
              <div className="grid grid-cols-2 p-2"><span>Size 8</span><span>57.0 mm</span></div>
            </div>
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="w-full mt-6 bg-on-surface text-surface py-3 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer"
            >
              Close Guide
            </button>
          </div>
        </div>
      )}

      {/* Find in Store Modal */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface border border-outline-variant max-w-md w-full p-6 md:p-8 rounded-xl shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setIsStoreModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>
            <span className="material-symbols-outlined text-[36px] text-primary mb-3">storefront</span>
            <h3 className="font-headline-sm text-headline-sm mb-2 text-on-surface">
              Boutique Availability
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mb-6">
              The <strong className="text-on-surface">{product.name}</strong> is available for private viewing and fitting at our flagship boutique.
            </p>
            <div className="bg-surface-container-low p-4 rounded-md text-left text-xs space-y-2 mb-6">
              <p className="font-semibold text-on-surface">Lumière Flagship Maison</p>
              <p className="text-on-surface-variant">540 Madison Avenue, New York, NY 10022</p>
              <p className="text-on-surface-variant">Mon – Sat: 10:00 AM – 7:00 PM</p>
            </div>
            <button
              type="button"
              onClick={() => setIsStoreModalOpen(false)}
              className="w-full bg-on-surface text-surface py-3 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Write a Verified Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface border border-outline-variant max-w-lg w-full p-6 md:p-8 rounded-xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-caps text-[10px] text-surface-tint border border-surface-tint px-2 py-0.5 rounded-sm uppercase">
                Verified Purchaser Review
              </span>
            </div>

            <h3 className="font-headline-sm text-headline-sm mb-1 text-on-surface">
              Write a Client Review
            </h3>
            <p className="font-body-md text-xs text-on-surface-variant mb-6">
              Share your personal experience with the {product.name}.
            </p>

            {reviewMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded text-center">
                {reviewMessage}
              </div>
            )}
            {reviewError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded text-center">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={reviewFormData.author_name}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, author_name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  Rating
                </label>
                <div className="flex gap-2 text-primary">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setReviewFormData({ ...reviewFormData, rating: star })}
                      className="cursor-pointer transition-transform hover:scale-110"
                    >
                      <span className={`material-symbols-outlined text-[24px] ${star <= reviewFormData.rating ? 'fill-icon' : ''}`}>
                        star
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  Headline / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Absolutely Breathtaking"
                  value={reviewFormData.title}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, title: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe the craftsmanship, quality, and your overall experience..."
                  value={reviewFormData.comment}
                  onChange={(e) => setReviewFormData({ ...reviewFormData, comment: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline-variant rounded p-2.5 text-xs text-on-surface focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="w-full bg-on-surface text-surface py-3 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer disabled:opacity-50"
                >
                  {reviewMutation.isPending ? 'Submitting Review...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
