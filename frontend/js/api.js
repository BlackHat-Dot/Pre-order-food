/**
 * PreOrder Vanilla JS API Client
 * Replicates the API contracts in app/api/v1
 */

const API_BASE = "/api/v1";

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("auth_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    
    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.detail || data?.message || `Request failed with status ${response.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// API Modules
const authApi = {
  login: (email, password) => 
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  register: (payload) => 
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getMe: () => apiRequest("/auth/me"),
  updateProfile: (payload) => 
    apiRequest("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listAddresses: () => apiRequest("/auth/addresses"),
  createAddress: (payload) => 
    apiRequest("/auth/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteAddress: (id) => 
    apiRequest(`/auth/addresses/${id}`, {
      method: "DELETE",
    }),
};

const shopsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.append("page", params.page);
    if (params.page_size) q.append("page_size", params.page_size);
    if (params.search) q.append("search", params.search);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest(`/shops${qs}`);
  },
  get: (shopId) => apiRequest(`/shops/${shopId}`),
  listMyShops: () => apiRequest("/shops/my"),
  create: (payload) => 
    apiRequest("/shops", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (shopId, payload) => 
    apiRequest(`/shops/${shopId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
};

const menuApi = {
  listCategories: (shopId) => apiRequest(`/shops/${shopId}/categories`),
  createCategory: (shopId, payload) => 
    apiRequest(`/shops/${shopId}/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listItems: (shopId, categoryId = null) => {
    const qs = categoryId ? `?category_id=${categoryId}` : "";
    return apiRequest(`/shops/${shopId}/items${qs}`);
  },
  createItem: (shopId, payload) => 
    apiRequest(`/shops/${shopId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateItem: (shopId, itemId, payload) => 
    apiRequest(`/shops/${shopId}/items/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  deleteItem: (shopId, itemId) => 
    apiRequest(`/shops/${shopId}/items/${itemId}`, {
      method: "DELETE",
    }),
};

const ordersApi = {
  create: (payload) => 
    apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  listMyOrders: () => apiRequest("/orders"),
  get: (orderId) => apiRequest(`/orders/${orderId}`),
  cancel: (orderId, reason = "") => 
    apiRequest(`/orders/${orderId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  requestCancellation: (orderId, reason = "") => 
    apiRequest(`/orders/${orderId}/request-cancellation`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  updateStatus: (orderId, status) => 
    apiRequest(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  listShopOrders: (shopId) => apiRequest(`/orders/shop/${shopId}`),
};

const loyaltyApi = {
  getBalance: (shopId) => apiRequest(`/loyalty/shops/${shopId}/balance`),
  getMyAccounts: () => apiRequest("/loyalty/my"),
};

const paymentsApi = {
  createPayment: (orderId) => 
    apiRequest("/payments/create", {
      method: "POST",
      body: JSON.stringify({ order_id: orderId }),
    }),
  verifyPayment: (payload) => 
    apiRequest("/payments/verify", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

const adminApi = {
  countUsers: () => apiRequest("/admin/users/count"),
  countShops: () => apiRequest("/admin/shops/count"),
  listUsers: (page = 1) => apiRequest(`/admin/users?page=${page}`),
  listShops: (page = 1) => apiRequest(`/admin/shops?page=${page}`),
  verifyShop: (shopId) => 
    apiRequest(`/admin/shops/${shopId}/verify`, {
      method: "PATCH",
    }),
};

window.api = {
  auth: authApi,
  shops: shopsApi,
  menu: menuApi,
  orders: ordersApi,
  loyalty: loyaltyApi,
  payments: paymentsApi,
  admin: adminApi,
};
