import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import {
  fetchPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  reportPaymentFailure,
  cancelPendingPayment,
} from '../../services/api';
import { ProductImage } from '../../services/media';

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

const loadRazorpay = () =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Secure payment checkout could not be loaded.'));
    document.body.appendChild(script);
  });

const Cart = () => {
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    updateQuantity,
    removeFromCart,
    orders,
    cancelOrder,
    clearCart,
    refreshOrdersFromDb,
  } = useCart();

  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const checkoutAttemptId = useRef('');

  // Active Tab: 'bag' | 'purchases'
  const [activeTab, setActiveTab] = useState('bag');

  // Checkout states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [lastPlacedOrder, setLastPlacedOrder] = useState(null);
  const [checkoutError, setCheckoutError] = useState('');
  const [shippingDetails, setShippingDetails] = useState({
    phone: '',
    address: '',
    city: '',
    postalCode: '',
  });

  // Cancellation Modal state
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [cancelNotice, setCancelNotice] = useState('');

  // Handle Checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      setCheckoutError('Please sign in before placing an order.');
      return;
    }
    if (!shippingDetails.phone.trim() || !shippingDetails.address.trim() ||
        !shippingDetails.city.trim() || !shippingDetails.postalCode.trim()) {
      setCheckoutError('Enter your contact number and complete shipping address to continue.');
      return;
    }
    setIsCheckingOut(true);
    setCheckoutError('');

    try {
      const [paymentConfig] = await Promise.all([fetchPaymentConfig(), loadRazorpay()]);
      if (!paymentConfig.enabled || !paymentConfig.key_id) {
        throw new Error('Secure checkout is not configured yet. Please contact the boutique.');
      }
      if (!checkoutAttemptId.current) {
        checkoutAttemptId.current = window.crypto.randomUUID();
      }

      const checkout = await createPaymentOrder({
        items: cartItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          metal: item.metal || '18k Yellow Gold',
          size: item.size || '',
        })),
        customer_phone: shippingDetails.phone.trim(),
        shipping_address: shippingDetails.address.trim(),
        shipping_city: shippingDetails.city.trim(),
        shipping_postal_code: shippingDetails.postalCode.trim(),
        shipping_country: 'India',
      }, checkoutAttemptId.current);

      const serverOrder = checkout.order;
      let paymentFinalized = false;
      const paymentWindow = new window.Razorpay({
        key: checkout.key_id,
        amount: checkout.amount,
        currency: checkout.currency,
        order_id: checkout.razorpay_order_id,
        name: 'Lumière Fine Jewelry',
        description: `Order ${serverOrder.order_number}`,
        prefill: {
          name: user?.name || user?.username || '',
          email: user?.email || '',
          contact: shippingDetails.phone.trim(),
        },
        notes: { order_number: serverOrder.order_number },
        theme: { color: '#75593a' },
        modal: {
          ondismiss: async () => {
            if (paymentFinalized) return;
            try {
              await cancelPendingPayment(serverOrder.id);
              paymentFinalized = true;
              checkoutAttemptId.current = '';
              await refreshOrdersFromDb();
              setCheckoutError('Checkout was cancelled. No payment was recorded.');
            } catch (error) {
              await refreshOrdersFromDb().catch(() => {});
              setCheckoutError(error.message || 'Payment is still processing; check your order history.');
            }
          },
        },
        handler: async (result) => {
          try {
            const verifiedOrder = await verifyPayment({
              order_id: serverOrder.id,
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            });
            if (verifiedOrder.payment_status !== 'Paid') {
              throw new Error(verifiedOrder.detail || 'Payment confirmation is still pending.');
            }
            paymentFinalized = true;
            checkoutAttemptId.current = '';
            clearCart();
            await refreshOrdersFromDb();
            setLastPlacedOrder({
              id: verifiedOrder.order_number,
              total: Number(verifiedOrder.total_price),
              deliveryEstimate: '2–3 Business Days (Complimentary Insured Overnight)',
            });
          } catch (error) {
            await refreshOrdersFromDb().catch(() => {});
            setCheckoutError(error.message || 'Payment is not yet confirmed. Check your order history before retrying.');
          }
        },
      });

      paymentWindow.on('payment.failed', async (result) => {
        const paymentId = result.error?.metadata?.payment_id;
        if (!paymentId) {
          setCheckoutError('The payment was not confirmed. Your order remains pending while we check its status.');
          await refreshOrdersFromDb().catch(() => {});
          return;
        }
        try {
          await reportPaymentFailure(serverOrder.id, paymentId);
          paymentFinalized = true;
          checkoutAttemptId.current = '';
          await refreshOrdersFromDb();
          setCheckoutError('Payment failed. No amount was recorded; you may try checkout again.');
        } catch (error) {
          setCheckoutError(error.message || 'Payment status could not be confirmed. Check your order history.');
          await refreshOrdersFromDb().catch(() => {});
        }
      });
      paymentWindow.open();
    } catch (err) {
      setCheckoutError(err.message || 'Unable to place order. Please review your bag and try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Confirm Order Cancellation
  const handleConfirmCancelOrder = async () => {
    if (orderToCancel) {
      const orderIdToCancel = orderToCancel.id;
      setOrderToCancel(null);
      try {
        await cancelOrder(orderIdToCancel);
        setCancelNotice(`Order #${orderIdToCancel} has been cancelled successfully.`);
      } catch (err) {
        setCancelNotice(`Cancellation notice: ${err.message || 'Could not complete cancellation.'}`);
      }
      setTimeout(() => setCancelNotice(''), 4000);
    }
  };

  const formattedSubtotal = `₹ ${cartSubtotal.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <div className="bg-background text-on-background antialiased selection:bg-primary-fixed selection:text-on-primary-fixed min-h-screen flex flex-col font-body">
      
      {/* Transactional / Cart Header */}
      <header className="w-full bg-surface py-6 px-margin-mobile md:px-margin-desktop border-b border-outline-variant/30 sticky top-0 z-50">
        <div className="max-w-container-max mx-auto flex justify-between items-center">
          <Link
            className="font-headline-sm text-headline-sm tracking-widest text-on-background uppercase hover:opacity-80 transition-opacity"
            to="/"
          >
            LUMIÈRE
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/shop"
              className="text-xs font-label-caps uppercase text-on-surface-variant hover:text-primary transition-colors hidden sm:inline-block"
            >
              Continue Shopping
            </Link>
            <div className="flex items-center gap-2 text-on-surface-variant font-label-caps text-label-caps uppercase text-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
              <span>Secure Checkout</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Cart Content */}
      <main className="flex-grow max-w-container-max mx-auto w-full px-margin-mobile md:px-margin-desktop py-stack-md md:py-stack-lg">
        
        {/* Navigation Tabs: Shopping Bag vs My Purchases */}
        <div className="flex items-center justify-between border-b border-outline-variant/40 mb-8 pb-3">
          <div className="flex gap-6 sm:gap-10">
            <button
              onClick={() => {
                setActiveTab('bag');
                setLastPlacedOrder(null);
              }}
              className={`pb-3 font-headline-sm text-lg sm:text-2xl transition-all duration-300 relative cursor-pointer ${
                activeTab === 'bag'
                  ? 'text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Shopping Bag ({cartCount})
              {activeTab === 'bag' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary -mb-3" />
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab('purchases');
                setLastPlacedOrder(null);
              }}
              className={`pb-3 font-headline-sm text-lg sm:text-2xl transition-all duration-300 relative cursor-pointer ${
                activeTab === 'purchases'
                  ? 'text-on-surface font-semibold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              My Purchases ({orders.length})
              {activeTab === 'purchases' && (
                <span className="absolute bottom-0 left-0 w-full h-[2px] bg-primary -mb-3" />
              )}
            </button>
          </div>

          <div className="text-xs text-on-surface-variant hidden md:block uppercase font-label-caps tracking-wider">
            {activeTab === 'bag' ? 'Ready to order' : 'Separate Order History'}
          </div>
        </div>

        {/* Global Alert Notification */}
        {checkoutError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-900 text-sm rounded-sm flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-rose-700">error</span>
              <span>{checkoutError}</span>
            </div>
            <button
              onClick={() => setCheckoutError('')}
              className="text-rose-800 hover:text-rose-950 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {cancelNotice && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm rounded-sm flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-amber-700">cancel</span>
              <span>{cancelNotice}</span>
            </div>
            <button
              onClick={() => setCancelNotice('')}
              className="text-amber-800 hover:text-amber-950 text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: SHOPPING BAG */}
        {/* ========================================================================= */}
        {activeTab === 'bag' && (
          <>
            {/* Checkout Success Screen */}
            {lastPlacedOrder ? (
              <div className="max-w-2xl mx-auto my-8 p-8 md:p-12 bg-surface-container-lowest border border-outline-variant/40 rounded-sm text-center shadow-sm animate-in fade-in">
                <span className="material-symbols-outlined text-[48px] text-emerald-700 mb-3">
                  check_circle
                </span>
                <span className="font-label-caps text-xs text-primary uppercase tracking-widest block mb-2">
                  Order Confirmed
                </span>
                <h2 className="font-headline-lg text-2xl md:text-3xl text-on-surface mb-2">
                  Thank You for Your Order
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mb-4">
                  Order <strong>#{lastPlacedOrder.id}</strong> has been saved into your purchase history.
                </p>
                <div className="bg-surface-container-low p-4 rounded-sm text-xs text-left mb-6 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Order Total:</span>
                    <span className="font-semibold text-on-surface">
                      ₹ {lastPlacedOrder.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Delivery:</span>
                    <span className="text-on-surface">{lastPlacedOrder.deliveryEstimate}</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => {
                      setLastPlacedOrder(null);
                      setActiveTab('purchases');
                    }}
                    className="bg-on-surface text-surface py-3.5 px-8 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors cursor-pointer"
                  >
                    View Purchased Products
                  </button>
                  <Link
                    to="/shop"
                    className="border border-outline-variant py-3.5 px-8 font-button text-xs uppercase tracking-widest hover:bg-surface-container-low text-on-surface transition-colors inline-block"
                  >
                    Continue Shopping
                  </Link>
                </div>
              </div>
            ) : cartItems.length === 0 ? (
              /* Empty Cart State */
              <div className="text-center py-20 border-t border-outline-variant/30">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
                  shopping_bag
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface mb-2">
                  Your Bag is Empty
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant mb-8 max-w-md mx-auto">
                  Discover our timeless fine jewelry collection and add your favorite creations.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link
                    to="/shop"
                    className="inline-block bg-on-surface text-surface py-4 px-8 font-button text-button uppercase tracking-widest hover:bg-on-surface-variant transition-colors"
                  >
                    Explore Collection
                  </Link>
                  {orders.length > 0 && (
                    <button
                      onClick={() => setActiveTab('purchases')}
                      className="inline-block border border-outline-variant text-on-surface py-4 px-8 font-button text-button uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
                    >
                      View Past Purchases ({orders.length})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Cart with Items */
              <div className="flex flex-col lg:flex-row gap-gutter">
                
                {/* Cart Items List (Left Column) */}
                <div className="flex-grow lg:w-2/3">
                  <div className="border-t border-outline-variant/50">
                    {cartItems.map((item) => {
                      const itemTotalFormatted = `₹ ${(item.price * item.quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`;
                      const detailsText = [item.metal, item.size ? `Size ${item.size}` : null]
                        .filter(Boolean)
                        .join(', ');

                      return (
                        <div
                          key={item.key}
                          className="py-stack-sm flex flex-col sm:flex-row gap-6 border-b border-outline-variant/30 items-start"
                        >
                          {/* Thumbnail */}
                          <div
                            onClick={() => navigate(`/product/${item.slug || item.id}`)}
                            className="w-full sm:w-32 h-32 bg-surface-container-low shrink-0 relative overflow-hidden group cursor-pointer border border-outline-variant/20 rounded-xs"
                          >
                            <ProductImage
                              alt={item.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                              src={item.image}
                            />
                          </div>

                          {/* Item Details */}
                          <div className="flex-grow flex flex-col justify-between h-full w-full">
                            <div className="flex justify-between items-start mb-4 sm:mb-0">
                              <div>
                                <h3
                                  onClick={() => navigate(`/product/${item.slug || item.id}`)}
                                  className="font-headline-sm text-headline-sm mb-1 hover:text-primary transition-colors cursor-pointer"
                                >
                                  {item.name}
                                </h3>
                                <p className="font-body-md text-body-md text-on-surface-variant text-sm">
                                  {detailsText || '18k Yellow Gold'}
                                </p>
                              </div>

                              <button
                                aria-label="Remove item"
                                onClick={() => removeFromCart(item.key)}
                                className="text-on-surface-variant hover:text-error transition-colors p-1 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[20px]">close</span>
                              </button>
                            </div>

                            {/* Quantity controls & Price */}
                            <div className="flex justify-between items-end mt-4">
                              <div className="flex items-center border border-outline-variant rounded-sm h-10 w-28">
                                <button
                                  aria-label="Decrease quantity"
                                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                                  className="w-1/3 h-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">remove</span>
                                </button>

                                <input
                                  aria-label="Quantity"
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => updateQuantity(item.key, e.target.value)}
                                  className="w-1/3 h-full bg-transparent border-none text-center font-body-md text-body-md p-0 focus:ring-0 text-on-surface focus:outline-none"
                                />

                                <button
                                  aria-label="Increase quantity"
                                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                                  className="w-1/3 h-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-[16px]">add</span>
                                </button>
                              </div>

                              <div className="font-body-lg text-body-lg text-on-background font-medium">
                                {itemTotalFormatted}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Authenticity & Warranty Guarantee Banner */}
                  <div className="mt-8 flex items-center gap-3 text-on-surface-variant bg-surface-container-low p-4 rounded-sm border border-outline-variant/20">
                    <span
                      className="material-symbols-outlined text-[24px] text-primary"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified_user
                    </span>
                    <p className="font-body-md text-body-md text-sm">
                      Every piece comes with a certificate of authenticity and a lifetime warranty.
                    </p>
                  </div>
                </div>

                {/* Order Summary (Right Column) */}
                <div className="w-full lg:w-1/3">
                  <div className="bg-surface p-6 sm:p-8 border border-outline-variant/30 sticky top-28 rounded-xs shadow-xs">
                    <h2 className="font-headline-md text-headline-md mb-6 text-on-surface">Order Summary</h2>

                    <div className="space-y-3 mb-7">
                      <p className="font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                        Insured Delivery Details
                      </p>
                      <input
                        aria-label="Contact phone number"
                        autoComplete="tel"
                        maxLength={25}
                        required
                        value={shippingDetails.phone}
                        onChange={(event) => setShippingDetails({ ...shippingDetails, phone: event.target.value })}
                        placeholder="Contact phone number"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-sm p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                      />
                      <textarea
                        aria-label="Shipping address"
                        autoComplete="street-address"
                        maxLength={2000}
                        required
                        rows={2}
                        value={shippingDetails.address}
                        onChange={(event) => setShippingDetails({ ...shippingDetails, address: event.target.value })}
                        placeholder="Full shipping address"
                        className="w-full bg-surface-container-low border border-outline-variant rounded-sm p-3 text-xs text-on-surface focus:outline-none focus:border-primary resize-y"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          aria-label="Shipping city"
                          autoComplete="address-level2"
                          maxLength={100}
                          required
                          value={shippingDetails.city}
                          onChange={(event) => setShippingDetails({ ...shippingDetails, city: event.target.value })}
                          placeholder="City"
                          className="w-full bg-surface-container-low border border-outline-variant rounded-sm p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                        />
                        <input
                          aria-label="Shipping postal code"
                          autoComplete="postal-code"
                          maxLength={20}
                          required
                          value={shippingDetails.postalCode}
                          onChange={(event) => setShippingDetails({ ...shippingDetails, postalCode: event.target.value })}
                          placeholder="Postal code"
                          className="w-full bg-surface-container-low border border-outline-variant rounded-sm p-3 text-xs text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>
                      {isAuthenticated ? (
                        <p className="text-[11px] text-on-surface-variant">
                          Order confirmation will be sent to {user?.email}.
                        </p>
                      ) : (
                        <p className="text-[11px] text-on-surface-variant">
                          <Link to="/login" className="underline text-primary">Sign in</Link> to place your order and view its status.
                        </p>
                      )}
                    </div>

                    <div className="space-y-4 mb-8 font-body-md text-body-md text-sm">
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">
                          Subtotal ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                        </span>
                        <span className="font-medium text-on-surface">{formattedSubtotal}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Insured Overnight Shipping</span>
                        <span className="text-on-background uppercase text-xs tracking-wider font-semibold text-emerald-800">
                          Complimentary
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-on-surface-variant">Sales Tax</span>
                        <span className="text-on-surface-variant text-xs italic">Included in price</span>
                      </div>
                    </div>

                    <div className="border-t border-outline-variant/50 pt-6 mb-8 flex justify-between items-end">
                      <span className="font-headline-sm text-headline-sm text-on-surface">Total</span>
                      <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                        {formattedSubtotal}
                      </span>
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={isCheckingOut}
                      className="w-full bg-[#1b1c1c] text-white font-button text-button uppercase py-4 px-6 hover:bg-[#303031] transition-colors duration-300 flex justify-center items-center gap-2 group cursor-pointer disabled:opacity-50"
                    >
                      {isCheckingOut ? 'SECURELY CONNECTING...' : 'PAY SECURELY WITH RAZORPAY'}
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform text-[18px]">
                        arrow_forward
                      </span>
                    </button>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center justify-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                        <span className="font-label-caps text-label-caps text-[10px]">COMPLIMENTARY INSURED SHIPPING</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-on-surface-variant">
                        <span className="material-symbols-outlined text-[18px]">lock</span>
                        <span className="font-label-caps text-label-caps text-[10px]">SECURE 256-BIT ENCRYPTED CHECKOUT</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: MY PURCHASES (SEPARATELY STORED PURCHASED PRODUCTS & CANCELLATION) */}
        {/* ========================================================================= */}
        {activeTab === 'purchases' && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-headline-lg-mobile md:font-headline-lg text-xl sm:text-2xl text-on-surface">
                  Purchased Products &amp; Order History
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant">
                  View and manage all your purchased luxury items. You can cancel active orders directly below.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('bag')}
                className="font-label-caps text-xs text-primary uppercase border-b border-primary hover:text-on-surface hover:border-on-surface transition-colors cursor-pointer"
              >
                Back to Shopping Bag ({cartCount})
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="text-center py-20 bg-surface-container-lowest border border-outline-variant/30 rounded-xs">
                <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">
                  receipt_long
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
                  No Purchases Yet
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6 max-w-md mx-auto">
                  When you purchase pieces from your shopping bag, they will be safely recorded in this section for your records and review privileges.
                </p>
                <Link
                  to="/shop"
                  className="inline-block bg-on-surface text-surface py-3.5 px-8 font-button text-xs uppercase tracking-widest hover:bg-on-surface-variant transition-colors"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => {
                  const isOrderCancelled = order.status === 'Cancelled';

                  return (
                    <div
                      key={order.id}
                      className={`bg-surface-container-lowest border rounded-xs p-6 md:p-8 transition-all ${
                        isOrderCancelled
                          ? 'border-outline-variant/30 opacity-75 bg-surface-container-low/40'
                          : 'border-outline-variant/60 shadow-xs'
                      }`}
                    >
                      {/* Order Card Header */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-6 border-b border-outline-variant/30 gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="font-headline-sm text-base text-on-surface font-semibold">
                              Order #{order.id}
                            </span>
                            <span
                              className={`font-label-caps text-[10px] uppercase px-2.5 py-0.5 rounded-full border ${
                                isOrderCancelled
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : order.payment_status === 'Paid'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-amber-50 text-amber-900 border-amber-200'
                              }`}
                            >
                              {isOrderCancelled
                                ? `Payment ${order.payment_status}`
                                : order.payment_status === 'Paid'
                                  ? `${order.status} • Payment received`
                                  : 'Awaiting payment'}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant font-body-md">
                            Placed on {order.formattedDate} • Insured Delivery: {order.deliveryEstimate || 'Overnight'}
                          </p>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs text-on-surface-variant block uppercase font-label-caps">
                              Order Total
                            </span>
                            <span className="font-headline-sm text-base text-on-surface font-semibold">
                              ₹ {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>

                          {isOrderCancelled ? (
                            <span className="text-xs text-rose-700 italic">
                              Cancelled on{' '}
                              {order.cancelledAt
                                ? new Date(order.cancelledAt).toLocaleDateString()
                                : 'Recent'}
                            </span>
                          ) : order.payment_status === 'Pending' ? (
                            <button
                              type="button"
                              onClick={() => setOrderToCancel(order)}
                              className="bg-transparent border border-rose-300 text-rose-700 hover:bg-rose-50 px-4 py-2 font-button text-[11px] uppercase tracking-wider transition-colors cursor-pointer rounded-xs"
                            >
                              Cancel Order
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {order.status}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Items inside this Order */}
                      <div className="divide-y divide-outline-variant/20 pt-4">
                        {order.items.map((item, idx) => {
                          return (
                            <div
                              key={item.key || idx}
                              className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                            >
                              <div className="flex items-center gap-4">
                                <div
                                  onClick={() => navigate(`/product/${item.slug || item.id}`)}
                                  className="w-16 h-16 bg-surface-container-low shrink-0 relative overflow-hidden border border-outline-variant/20 rounded-xs cursor-pointer"
                                >
                                  <ProductImage
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    src={item.image}
                                  />
                                </div>

                                <div>
                                  <h4
                                    onClick={() => navigate(`/product/${item.slug || item.id}`)}
                                    className="font-headline-sm text-sm text-on-surface hover:text-primary transition-colors cursor-pointer"
                                  >
                                    {item.name}
                                  </h4>
                                  <p className="text-xs text-on-surface-variant font-body-md">
                                    {item.metal} {item.size ? `• Size ${item.size}` : ''} • Qty: {item.quantity}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right font-body-md text-xs font-semibold text-on-surface">
                                  ₹ {(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>

                                <div className="flex gap-2">
                                  <Link
                                    to={`/product/${item.product_slug || item.slug || item.id || item.product}`}
                                    className="border border-outline-variant text-on-surface hover:border-primary hover:text-primary px-3 py-1.5 font-label-caps text-[10px] uppercase tracking-wider transition-colors inline-block"
                                  >
                                    View Piece &amp; Review
                                  </Link>

                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Cancel Order Confirmation Modal */}
      {orderToCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-surface border border-outline-variant max-w-md w-full p-6 md:p-8 rounded-xl shadow-2xl relative text-center">
            <button
              onClick={() => setOrderToCancel(null)}
              className="absolute top-4 right-4 text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <span className="material-symbols-outlined text-[44px] text-rose-600 mb-3">
              warning
            </span>

            <h3 className="font-headline-sm text-xl text-on-surface mb-2">
              Cancel Order #{orderToCancel.id}?
            </h3>

            <p className="font-body-md text-xs text-on-surface-variant mb-6">
              This cancels your unpaid checkout and returns reserved pieces to available stock. A payment already in progress cannot be cancelled here.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOrderToCancel(null)}
                className="flex-1 border border-outline-variant py-3 font-button text-xs uppercase tracking-widest text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelOrder}
                className="flex-1 bg-rose-600 text-white py-3 font-button text-xs uppercase tracking-widest hover:bg-rose-700 transition-colors cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant/30 mt-auto py-8">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            © 2024 Lumière Fine Jewelry. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Cart;
