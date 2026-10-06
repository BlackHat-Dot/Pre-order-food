/**
 * PreOrder Authentication State & Storage Manager
 */

const Auth = {
  getToken() {
    return localStorage.getItem("auth_token");
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

  async login(email, password) {
    const res = await window.api.auth.login(email, password);
    if (res.access_token) {
      localStorage.setItem("auth_token", res.access_token);
      // Fetch full profile
      const user = await window.api.auth.getMe();
      localStorage.setItem("auth_user", JSON.stringify(user));
      return user;
    }
    throw new Error("Invalid login response");
  },

  async register(payload) {
    const res = await window.api.auth.register(payload);
    if (res.access_token) {
      localStorage.setItem("auth_token", res.access_token);
      const user = await window.api.auth.getMe();
      localStorage.setItem("auth_user", JSON.stringify(user));
      return user;
    }
    return res;
  },

  logout() {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "login.html";
  },

  getLandingPage(role) {
    if (role === "admin") return "admin.html";
    if (role === "shop_owner") return "owner.html";
    return "orders.html";
  }
};

window.auth = Auth;
