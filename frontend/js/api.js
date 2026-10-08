/* ============================================================================
   PREORDER REST CLIENT
   Direct Interface to PreOrder FastAPI Backend (/api/v1)
   ============================================================================ */

import { auth } from './auth.js';
import { toast } from './toast.js';

const RAILWAY_API_URL = 'https://pre-order-food-production.up.railway.app/api/v1';

const BASE_URL = (() => {
  if (typeof window !== 'undefined') {
    if (window.PREORDER_API_URL) return window.PREORDER_API_URL;
    if (localStorage.getItem('preorder_api_url')) return localStorage.getItem('preorder_api_url');
    if (window.location.hostname.includes('railway.app') || window.location.hostname.includes('vercel.app')) {
      return `${window.location.origin}/api/v1`;
    }
    if ((window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port === '8000') {
      return `${window.location.origin}/api/v1`;
    }
  }
  return RAILWAY_API_URL;
})();

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};

  const token = auth.getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/verify-msg91')) {
        auth.logout();
        throw new Error('Authentication expired. Please log in.');
      }
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMsg = (data && (data.detail || data.message || data.error)) || `HTTP ${response.status} Error`;
      throw new Error(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
    }

    return data;
  } catch (err) {
    console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
    throw err;
  }
}

export const api = {
  // ── Authentication ──
  async login(phone, password) {
    let p = String(phone || '').trim();
    if (!p.startsWith('+')) {
      const digits = p.replace(/\D/g, '');
      if (digits.length === 10) p = '+91' + digits;
      else if (digits.length > 0) p = '+' + digits;
    }
    const formData = new URLSearchParams();
    formData.append('username', p);
    formData.append('password', password);

    const data = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    auth.saveTokens(data);
    const user = await this.getMe();
    auth.setUser(user);
    return { tokens: data, user };
  },

  async verifyPhone(phone, accessToken = 'direct_verify') {
    return request('/verify-msg91', {
      method: 'POST',
      body: JSON.stringify({
        access_token: accessToken,
        phone: phone,
        purpose: 'signup_phone'
      })
    });
  },

  async register(payload) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getMe() {
    return request('/auth/me');
  },

  async getCurrentUser() {
    return this.getMe();
  },

  // ── Users ──
  async getUserProfile() {
    return request('/users/me');
  },

  async updateUserProfile(payload) {
    return request('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async updatePassword(oldPassword, newPassword) {
    return request('/users/me/password', {
      method: 'PATCH',
      body: JSON.stringify({ current_password: oldPassword, old_password: oldPassword, new_password: newPassword })
    });
  },

  // ── Shops ──
  async getShops(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.append('page', params.page);
    if (params.page_size) q.append('page_size', params.page_size);
    if (params.q) q.append('q', params.q);
    if (params.category) q.append('category', params.category);
    if (params.city) q.append('city', params.city);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/shops${qs}`);
  },

  async getShop(id) {
    return request(`/shops/${id}`);
  },

  async getMyShops() {
    return request('/shops/my');
  },

  async createShop(payload) {
    return request('/shops', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateShop(id, payload) {
    return request(`/shops/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async updateShopStatus(id, { is_open, is_accepting_orders }) {
    return request(`/shops/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ is_open, is_accepting_orders })
    });
  },

  // ── Menu Items & Variants ──
  async getMenuItems(shopId) {
    return request(`/menu/shops/${shopId}/items`);
  },

  async createMenuItem(shopId, payload) {
    return request(`/menu/shops/${shopId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateMenuItem(itemId, payload) {
    return request(`/menu/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async deleteMenuItem(itemId) {
    return request(`/menu/items/${itemId}`, {
      method: 'DELETE'
    });
  },

  async createVariant(itemId, payload) {
    return request(`/menu/items/${itemId}/variants`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  // ── Orders ──
  async createOrder(payload) {
    return request('/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getCustomerOrders(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.page) q.append('page', params.page);
    if (params.page_size) q.append('page_size', params.page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/orders/customer/me${qs}`);
  },

  async getShopOrders(shopId, params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.append('status', params.status);
    if (params.page) q.append('page', params.page);
    if (params.page_size) q.append('page_size', params.page_size);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request(`/orders/shops/${shopId}${qs}`).catch(async () => {
      return request(`/orders/shop/${shopId}${qs}`);
    });
  },

  async getOrder(orderId) {
    return request(`/orders/${orderId}`);
  },

  async updateOrderStatus(orderId, { status, reason }) {
    return request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason })
    });
  },

  // ── Loyalty & Coupons ──
  async validateCoupon(code, shopId) {
    return request(`/coupons/validate/${encodeURIComponent(code)}?shop_id=${encodeURIComponent(shopId)}`);
  },

  async mintCoupon(shopId, points) {
    return request('/coupons/mint', {
      method: 'POST',
      body: JSON.stringify({ shop_id: shopId, points: Number(points) })
    });
  },

  async getLoyaltyAccount(shopId) {
    return request(`/loyalty/me?shop_id=${encodeURIComponent(shopId)}`);
  },

  async getLoyaltyTransactions(shopId, page = 1, pageSize = 20) {
    return request(`/loyalty/me/transactions?shop_id=${encodeURIComponent(shopId)}&page=${page}&page_size=${pageSize}`);
  },

  // ── Reviews ──
  async getShopReviews(shopId, page = 1, pageSize = 20) {
    return request(`/reviews/shops/${shopId}?page=${page}&page_size=${pageSize}`);
  },

  async createShopReview(shopId, { rating, comment }) {
    return request(`/reviews/shops/${shopId}`, {
      method: 'POST',
      body: JSON.stringify({ rating, comment })
    });
  },

  async createOrderReview({ order_id, rating, comment }) {
    return request('/reviews', {
      method: 'POST',
      body: JSON.stringify({ order_id, rating, comment })
    });
  },

  // ── Addresses ──
  async getAddresses() {
    return request('/addresses');
  },

  async createAddress(payload) {
    return request('/addresses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async setDefaultAddress(id) {
    return request(`/addresses/${id}/default`, {
      method: 'PUT'
    });
  },

  async deleteAddress(id) {
    return request(`/addresses/${id}`, {
      method: 'DELETE'
    });
  },

  // ── Admin ──
  async getAdminStats() {
    try {
      const data = await request('/admin/analytics/overview');
      return {
        total_users: data.users ?? data.total_users ?? 0,
        total_shops: data.shops ?? data.total_shops ?? 0,
        total_orders: data.orders ?? data.total_orders ?? 0,
        total_gmv: data.total_revenue ?? data.total_gmv ?? 0,
        ...data
      };
    } catch {
      return request('/admin/stats');
    }
  },

  async getAdminShops(page = 1, pageSize = 50) {
    return request(`/admin/shops?page=${page}&page_size=${pageSize}`);
  },

  async verifyAdminShop(shopId, verified = true) {
    const isV = Boolean(verified);
    return request(`/admin/shops/${shopId}/verify?verified=${isV}`, {
      method: 'PATCH',
      body: JSON.stringify({ verified: isV })
    });
  },

  // ── Notifications ──
  async getNotifications() {
    return request('/notifications/me');
  },

  async markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PATCH'
    });
  },

  async markAllNotificationsRead() {
    return request('/notifications/read-all', {
      method: 'POST'
    });
  }
};

window.api = api;
