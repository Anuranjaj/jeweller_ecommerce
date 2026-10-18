import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchOrders as apiFetchOrders, cancelPendingPayment } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { token } = useAuth();
  // 1. Cart Items State (persisted in localStorage for temporary bag)
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('lumiere_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Order history is loaded from the authenticated backend, never trusted from local storage.
  const [orders, setOrders] = useState([]);

  // Sync Cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('lumiere_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to persist cart items', e);
    }
  }, [cartItems]);

  const fetchOrdersFromDb = useCallback(async () => {
    if (!token) return [];
    const dbOrders = await apiFetchOrders();
    if (Array.isArray(dbOrders)) {
      return dbOrders.map((ord) => ({
          id: ord.order_number || ord.id,
          dbId: ord.id,
          order_number: ord.order_number,
          createdAt: ord.created_at,
          formattedDate: ord.created_at
            ? new Date(ord.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'Recent',
          items: (ord.items || []).map((it) => ({
            id: it.product,
            product: it.product,
            key: `${it.product}-${it.metal}-${it.size}`,
            name: it.product_name,
            product_name: it.product_name,
            price: parseFloat(it.price || 0),
            quantity: it.quantity,
            image: it.product_image,
            product_image: it.product_image,
            metal: it.metal,
            size: it.size,
            status: it.status || ord.status || 'Confirmed',
          })),
          total: parseFloat(ord.total_price || 0),
          total_price: parseFloat(ord.total_price || 0),
          status: ord.status || 'Confirmed',
          payment_status: ord.payment_status || 'Pending',
          customer_name: ord.customer_name,
          customer_email: ord.customer_email,
          deliveryEstimate: '2–3 Business Days (Complimentary Insured Overnight)',
      }));
    }
    return [];
  }, [token]);

  const refreshOrdersFromDb = useCallback(async () => {
    const formatted = await fetchOrdersFromDb();
    setOrders(formatted);
    return formatted;
  }, [fetchOrdersFromDb]);

  useEffect(() => {
    let active = true;
    fetchOrdersFromDb()
      .then((formatted) => {
        if (active) setOrders(formatted);
      })
      .catch((error) => {
        console.error('Could not sync orders from backend:', error.message);
      });
    return () => {
      active = false;
    };
  }, [fetchOrdersFromDb]);

  // Add Item to Cart
  const addToCart = (product, quantity = 1, options = {}) => {
    const metal = options.metal || '18k Yellow Gold';
    const size = options.size || '';
    const itemKey = `${product.id}-${metal}-${size}`;

    const numPrice =
      typeof product.price === 'number'
        ? product.price
        : parseFloat(String(product.price).replace(/[^0-9.]/g, '')) || 0;

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.key === itemKey);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            key: itemKey,
            id: product.id,
            slug: product.slug,
            name: product.name || product.title,
            price: numPrice,
            image: product.image,
            metal,
            size,
            quantity: Math.max(1, quantity),
          },
        ];
      }
    });
  };

  // Remove Item from Cart
  const removeFromCart = (itemKey) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.key !== itemKey));
  };

  // Update Item Quantity
  const updateQuantity = (itemKey, quantity) => {
    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.key === itemKey ? { ...item, quantity: numQty } : item
      )
    );
  };

  // Clear Cart
  const clearCart = () => {
    setCartItems([]);
  };

  // Cancel an unpaid order only after the backend confirms its provider state.
  const cancelOrder = async (orderId) => {
    const targetOrder = orders.find((o) => o.id === orderId || o.order_number === orderId);
    if (!targetOrder?.dbId) throw new Error('The pending order could not be found.');
    await cancelPendingPayment(targetOrder.dbId);
    await refreshOrdersFromDb();
  };

  // Check if a product has been purchased in an active (non-cancelled) order
  const isProductPurchased = (slugOrId) => {
    if (!slugOrId) return false;
    const lookup = String(slugOrId);
    return orders.some(
      (order) =>
        order.payment_status === 'Paid' &&
        order.status !== 'Cancelled' &&
        (order.items || []).some(
          (item) =>
            item.status !== 'Cancelled' &&
            (String(item.slug) === lookup || String(item.id) === lookup || String(item.product) === lookup)
        )
    );
  };

  // Calculated properties
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'Cancelled').length;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        orders,
        activeOrdersCount,
        cancelOrder,
        isProductPurchased,
        refreshOrdersFromDb,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
