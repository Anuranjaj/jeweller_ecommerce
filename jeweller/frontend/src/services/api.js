// src/services/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';

const getAuthHeaders = (additionalHeaders = {}) => {
  const token = localStorage.getItem('lumiere_token');
  const headers = { ...additionalHeaders };
  if (token) {
    headers['Authorization'] = `Token ${token}`;
  }
  return headers;
};

const handleResponse = async (response, defaultErrorMessage = 'Request failed') => {
  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized: could mean expired or invalidated token
      const isPublicEndpoint = response.url.includes('/login/') || response.url.includes('/register/');
      if (!isPublicEndpoint && localStorage.getItem('lumiere_token')) {
        localStorage.removeItem('lumiere_token');
        localStorage.removeItem('lumiere_user');
      }
    }
    const errorData = await response.json().catch(() => ({}));
    let errMsg = errorData.detail || errorData.message;
    if (!errMsg && typeof errorData === 'object') {
      const firstKey = Object.keys(errorData)[0];
      if (firstKey) {
        const val = errorData[firstKey];
        errMsg = Array.isArray(val) ? val[0] : String(val);
      }
    }
    throw new Error(errMsg || defaultErrorMessage);
  }
  if (response.status === 204) return true;
  return response.json();
};

export const fetchProducts = async (category = null, search = '') => {
  const params = new URLSearchParams();

  if (category) {
    params.append('category', category);
  }

  if (search && search.trim() !== '') {
    params.append('search', search.trim());
  }

  const queryString = params.toString();
  const url = queryString
    ? `${API_BASE_URL}/products/?${queryString}`
    : `${API_BASE_URL}/products/`;

  const response = await fetch(url);
  return handleResponse(response, 'Failed to fetch products from server');
};

export const fetchCategories = async () => {
  const response = await fetch(`${API_BASE_URL}/categories/`);
  return handleResponse(response, 'Failed to fetch categories');
};

export const createCategory = async (categoryData) => {
  const response = await fetch(`${API_BASE_URL}/categories/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response, 'Failed to create category');
};

export const fetchProductDetail = async (slugOrId) => {
  const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/`);
  return handleResponse(response, 'Failed to fetch product details');
};

export const createProduct = async (productData) => {
  const isFormData = productData instanceof FormData;
  const headers = getAuthHeaders(isFormData ? {} : { 'Content-Type': 'application/json' });

  const response = await fetch(`${API_BASE_URL}/products/`, {
    method: 'POST',
    headers,
    body: isFormData ? productData : JSON.stringify(productData),
  });
  return handleResponse(response, 'Failed to add product');
};

export const updateProduct = async (slugOrId, productData) => {
  const isFormData = productData instanceof FormData;
  const headers = getAuthHeaders(isFormData ? {} : { 'Content-Type': 'application/json' });

  const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/`, {
    method: 'PATCH',
    headers,
    body: isFormData ? productData : JSON.stringify(productData),
  });
  return handleResponse(response, 'Failed to update product');
};

export const deleteProduct = async (slugOrId) => {
  const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response, 'Failed to delete product');
};

export const fetchReviews = async (slugOrId) => {
  const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/reviews/`);
  return handleResponse(response, 'Failed to fetch reviews');
};

export const createReview = async (slugOrId, reviewData) => {
  const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/reviews/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(reviewData),
  });
  return handleResponse(response, 'Failed to submit review');
};

export const checkProductPurchased = async (slugOrId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${slugOrId}/check-purchased/`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) return { purchased: false, authenticated: false };
    return response.json();
  } catch {
    return { purchased: false, authenticated: false };
  }
};

// Orders API (Securely Authenticated)
export const fetchOrders = async () => {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response, 'Failed to fetch orders');
};

export const createOrder = async (orderData) => {
  const response = await fetch(`${API_BASE_URL}/orders/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(orderData),
  });
  return handleResponse(response, 'Failed to create order');
};

export const updateOrderStatus = async (orderId, newStatus) => {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status: newStatus }),
  });
  return handleResponse(response, 'Failed to update order status');
};

export const fetchPaymentConfig = async () => {
  const response = await fetch(`${API_BASE_URL}/payments/config/`);
  return handleResponse(response, 'Unable to check payment availability');
};

export const createPaymentOrder = async (orderData, idempotencyKey) => {
  const response = await fetch(`${API_BASE_URL}/payments/orders/`, {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    }),
    body: JSON.stringify(orderData),
  });
  return handleResponse(response, 'Unable to start secure checkout');
};

export const verifyPayment = async (paymentData) => {
  const response = await fetch(`${API_BASE_URL}/payments/verify/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(paymentData),
  });
  return handleResponse(response, 'Unable to verify payment');
};

export const reportPaymentFailure = async (orderId, paymentId) => {
  const response = await fetch(`${API_BASE_URL}/payments/failure/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ order_id: orderId, razorpay_payment_id: paymentId }),
  });
  return handleResponse(response, 'Unable to verify payment failure');
};

export const cancelPendingPayment = async (orderId) => {
  const response = await fetch(`${API_BASE_URL}/payments/orders/${orderId}/cancel/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
  });
  return handleResponse(response, 'Unable to cancel pending checkout');
};

// Stock Movements & Admin Stats (Admin Only)
export const fetchStockMovements = async (days = 14) => {
  const response = await fetch(`${API_BASE_URL}/stock/movements/?days=${days}`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response, 'Failed to fetch stock movements');
};

export const fetchAdminStats = async () => {
  const response = await fetch(`${API_BASE_URL}/admin/stats/`, {
    headers: getAuthHeaders(),
  });
  return handleResponse(response, 'Failed to fetch admin stats');
};

// User Profile & Password Change
export const updateUserProfile = async (userData) => {
  const response = await fetch(`${API_BASE_URL}/user/`, {
    method: 'PATCH',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(userData),
  });
  return handleResponse(response, 'Failed to update profile');
};

export const changeUserPassword = async ({ oldPassword, newPassword }) => {
  const response = await fetch(`${API_BASE_URL}/change-password/`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
  return handleResponse(response, 'Failed to change password');
};