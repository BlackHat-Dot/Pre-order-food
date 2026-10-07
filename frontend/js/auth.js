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
    }
    if (tokens.refresh_token) {
      localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
    }
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_KEY);
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
    return this.getRole() === 'shop_owner' || this.getRole() === 'admin';
  },

  isAdmin() {
    return this.getRole() === 'admin';
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
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
    if (!this.isOwner()) {
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
