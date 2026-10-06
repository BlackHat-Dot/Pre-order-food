/**
 * PreOrder Authentication State & Storage Manager
 */

const Auth = {
  getToken() {
    return window.tokenStore ? window.tokenStore.access : localStorage.getItem("pof_access_token");
  },

  getUser() {
    try {
      const data = localStorage.getItem("auth_user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  isLoggedIn() {
    return !!this.getToken() && !!this.getUser();
  },

  async login(identifier, password) {
    const user = await window.api.auth.login(identifier, password);
    return user;
  },

  async register(payload) {
    const res = await window.api.auth.register(payload);
    return res;
  },

  async refresh() {
    try {
      if (this.getToken()) {
        const me = await window.api.auth.getMe();
        localStorage.setItem("auth_user", JSON.stringify(me));
        return me;
      }
    } catch {
      this.logout();
    }
    return null;
  },

  logout() {
    if (window.tokenStore) window.tokenStore.clear();
    localStorage.removeItem("auth_user");
    localStorage.removeItem("pof_access_token");
    localStorage.removeItem("pof_refresh_token");
    localStorage.removeItem("auth_token");
    window.location.href = "login.html";
  },

  getLandingPage(role) {
    if (role === "admin") return "admin.html";
    if (role === "shop_owner") return "owner.html";
    return "orders.html";
  },
};

window.auth = Auth;
