/* ============================================================================
   PREORDER AUTHENTICATION & SESSION MANAGER
   Session Token Storage & Role Access Guards
   ============================================================================ */

const TOKEN_KEY = 'preorder_token';
const REFRESH_KEY = 'preorder_refresh';
const USER_KEY = 'preorder_user';

export const auth = {
  saveTokens(tokens) {
    if (tokens.access_token) {
      localStorage.setItem(TOKEN_KEY, tokens.access_token);
      localStorage.setItem('pof_access_token', tokens.access_token);
      localStorage.setItem('auth_token', tokens.access_token);
    }
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
      localStorage.setItem('pof_refresh_token', tokens.refresh_token);
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('pof_access_token') || localStorage.getItem('auth_token');
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY) || localStorage.getItem('pof_refresh_token');
  },

  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  getRole() {
    const user = this.getUser();
    return user ? user.role : null;
  },

  isLoggedIn() {
    return Boolean(this.getToken());
  },

  isOwner() {
    return this.getRole() === 'shop_owner';
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('pof_access_token');
    localStorage.removeItem('pof_refresh_token');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    window.location.href = '/login.html';
  },

  requireAuth(redirectUrl = window.location.href) {
    if (!this.isLoggedIn()) {
      window.location.href = `/login.html?redirect=${encodeURIComponent(redirectUrl)}`;
      return false;
    }
    return true;
  },

  requireOwner() {
    if (!this.requireAuth()) return false;
    if (this.getRole() !== 'shop_owner') {
      if (window.toast) {
        window.toast.info('User accounts cannot run a kitchen. If you want to run a kitchen, please create another account with the Kitchen Owner role.');
      }
      window.location.href = '/index.html';
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!this.requireAuth()) return false;
    if (!this.isAdmin()) {
      window.location.href = '/index.html';
      return false;
    }
    return true;
  }
};

window.auth = auth;
