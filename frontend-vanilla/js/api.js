/**
 * PreOrder Vanilla JS API Client
 * Compatible with order-delight-main API contracts and token storage
 */

const API_BASE = window.location.port === "8000" ? "/api/v1" : "http://localhost:8000/api/v1";

const ACCESS_KEY = "pof_access_token";
const REFRESH_KEY = "pof_refresh_token";
const LEGACY_TOKEN_KEY = "auth_token";

const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access, refresh) {
    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
      localStorage.setItem(LEGACY_TOKEN_KEY, access);
    }
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    }
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem("auth_user");
  },
};

async function apiRequest(endpoint, options = {}) {
  const token = tokenStore.access;
  const headers = {
    ...(options.isForm ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const config = {
    ...options,
    headers,
  };

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, config);

    if (response.status === 204) {
      return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      let errorMsg = "Request failed";
      if (data) {
        if (typeof data.detail === "string") errorMsg = data.detail;
        else if (data.message) errorMsg = data.message;
        else if (Array.isArray(data.detail)) errorMsg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
        else errorMsg = JSON.stringify(data);
      }
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.error(`API Error [${endpoint}]:`, err);
    throw err;
  }
}

// ── Auth API ──
const authApi = {
  login: async (identifier, password) => {
    // Try form encoded first (OAuth2 standard)
    const form = new URLSearchParams();
    form.set("username", identifier);
    form.set("password", password);

    const tokens = await apiRequest("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      isForm: true,
    });

    tokenStore.set(tokens.access_token, tokens.refresh_token);
    const me = await authApi.getMe();
    localStorage.setItem("auth_user", JSON.stringify(me));
    return me;
  },

  register: async (payload) => {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  getMe: () => apiRequest("/auth/me"),

  updateProfile: (payload) =>
    apiRequest("/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  changePassword: (payload) =>
    apiRequest("/users/me/password", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  listAddresses: () => apiRequest("/addresses"),
  createAddress: (payload) =>
    apiRequest("/addresses", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  setDefaultAddress: (id) =>
    apiRequest(`/addresses/${id}/default`, {
      method: "PUT",
    }),
  deleteAddress: (id) =>
    apiRequest(`/addresses/${id}`, {
      method: "DELETE",
    }),
};

// ── Shops API ──
const shopsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.append("page", params.page);
    if (params.page_size) q.append("page_size", params.page_size);
    if (params.search || params.q) q.append("search", params.search || params.q);
    if (params.category || params.cuisine) q.append("category", params.category || params.cuisine);
    if (params.city) q.append("city", params.city);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest(`/shops${qs}`);
  },
  get: (shopId) => apiRequest(`/shops/${shopId}`),
  myShops: () => apiRequest("/shops/my"),
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

// ── Menu API ──
const menuApi = {
  listItems: (shopId) => apiRequest(`/menu/shops/${shopId}/items`),
  listVariants: (itemId) => apiRequest(`/menu/items/${itemId}/variants`),
  createItem: (shopId, payload) =>
    apiRequest(`/menu/shops/${shopId}/items`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateItem: (itemId, payload) =>
    apiRequest(`/menu/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteItem: (itemId) =>
    apiRequest(`/menu/items/${itemId}`, {
      method: "DELETE",
    }),
  createVariant: (itemId, payload) =>
    apiRequest(`/menu/items/${itemId}/variants`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteVariant: (variantId) =>
    apiRequest(`/menu/variants/${variantId}`, {
      method: "DELETE",
    }),
};

// ── Orders API ──
const ordersApi = {
  create: (payload) =>
    apiRequest("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.append("status", params.status);
    if (params.page) q.append("page", params.page);
    if (params.page_size) q.append("page_size", params.page_size);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest(`/orders/customer/me${qs}`).catch(() => apiRequest(`/orders${qs}`));
  },
  listMyOrders: () => apiRequest("/orders/customer/me").catch(() => apiRequest("/orders")),
  get: (orderId) => apiRequest(`/orders/${orderId}`),
  getTicket: (orderId) => apiRequest(`/orders/${orderId}`),
  updateStatus: (orderId, status, reason = "") =>
    apiRequest(`/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status, reason: reason || undefined }),
    }),
  listShopOrders: (shopId, params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.append("page", params.page);
    if (params.page_size) q.append("page_size", params.page_size);
    const qs = q.toString() ? `?${q.toString()}` : "";
    return apiRequest(`/orders/shop/${shopId}${qs}`);
  },
  submitReview: (shopId, payload) =>
    apiRequest(`/reviews/shop/${shopId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Reviews API ──
const reviewsApi = {
  list: (shopId) => apiRequest(`/reviews/shop/${shopId}`).catch(() => []),
  create: (shopId, payload) =>
    apiRequest(`/reviews/shop/${shopId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

// ── Coupons & Loyalty API ──
const couponsApi = {
  validate: (code, shopId) =>
    apiRequest(`/coupons/validate/${code}?shop_id=${shopId}&_t=${Date.now()}`),
  mint: (shopId, points) =>
    apiRequest("/coupons/mint", {
      method: "POST",
      body: JSON.stringify({ shop_id: shopId, points }),
    }),
};

const loyaltyApi = {
  me: (shopId) => apiRequest(`/loyalty/shops/${shopId}/balance`).catch(() => ({ points_balance: 0 })),
  transactions: (shopId) => apiRequest(`/loyalty/shops/${shopId}/transactions`).catch(() => []),
};

// ── Admin API ──
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

window.tokenStore = tokenStore;
window.api = {
  auth: authApi,
  shops: shopsApi,
  menu: menuApi,
  orders: ordersApi,
  reviews: reviewsApi,
  coupons: couponsApi,
  loyalty: loyaltyApi,
  admin: adminApi,
};
window.apiRequest = apiRequest;
