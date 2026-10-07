import { jsx, jsxs } from "react/jsx-runtime";
import { createRootRoute, Link, Outlet, HeadContent, Scripts, createFileRoute, lazyRouteComponent, createRouter, useRouter } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { useState, useCallback, useEffect, useMemo, createContext, useContext } from "react";
import { Toaster as Toaster$1 } from "sonner";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
const Toaster = ({ ...props }) => {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
};
function cn(...inputs) {
  return twMerge(clsx(inputs));
}
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ jsx(TooltipPrimitive.Portal, { children: /* @__PURE__ */ jsx(
  TooltipPrimitive.Content,
  {
    ref,
    sideOffset,
    className: cn(
      "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)",
      className
    ),
    ...props
  }
) }));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
const API_BASE_URL = "http://127.0.0.1:8000";
const ACCESS_KEY = "pof_access_token";
const REFRESH_KEY = "pof_refresh_token";
const tokenStore = {
  get access() {
    return null;
  },
  get refresh() {
    return null;
  },
  set(access, refresh) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
};
class ApiError extends Error {
  status;
  detail;
  constructor(status, message, detail) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}
async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    query,
    auth = true,
    accessToken: explicitToken,
    retries = 0,
    isForm = false
  } = options;
  const base = API_BASE_URL;
  const url = new URL(`${base}${path}`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== null && v !== void 0) url.searchParams.set(k, String(v));
    }
  }
  const headers = {};
  const token = explicitToken ?? (auth ? tokenStore.access : null);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body !== void 0) headers["Content-Type"] = "application/json";
  const init = {
    method,
    headers,
    body: body instanceof URLSearchParams ? body.toString() : body !== void 0 ? isForm ? body.toString() : JSON.stringify(body) : void 0
  };
  if (isForm && body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = body.toString();
  }
  async function attempt(triesLeft) {
    const res = await fetch(url.toString(), init);
    if (res.status === 401 && auth && triesLeft === 0) {
      const refreshToken = tokenStore.refresh;
      if (refreshToken) {
        try {
          const ref = await fetch(`${base}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken })
          });
          if (ref.ok) {
            const data = await ref.json();
            tokenStore.set(data.access_token, data.refresh_token);
            headers["Authorization"] = `Bearer ${data.access_token}`;
            const retried = await fetch(url.toString(), { ...init, headers });
            if (retried.ok || retried.status === 204) {
              if (retried.status === 204) return void 0;
              return retried.json();
            }
          }
        } catch {
        }
      }
      tokenStore.clear();
    }
    if (res.status === 204) return void 0;
    if (!res.ok) {
      let detail = null;
      let message = `${res.status} ${res.statusText}`;
      try {
        const err = await res.json();
        detail = err;
        if (res.status >= 500) {
          message = "Something went wrong";
        } else if (err?.detail) {
          if (Array.isArray(err.detail)) {
            const first = err.detail[0];
            const locs = Array.isArray(first?.loc) ? first.loc.map((l) => String(l).toLowerCase()) : [];
            if (locs.includes("image_url")) {
              message = "Please enter a valid image URL";
            } else if (locs.includes("pincode")) {
              message = "Please enter a valid pincode";
            } else if (locs.includes("phone")) {
              message = "Please enter a valid phone number";
            } else {
              message = "Please check your input";
            }
          } else if (typeof err.detail === "string") {
            message = err.detail;
          } else if (typeof err.detail === "object" && err.detail !== null) {
            const d = err.detail;
            message = typeof d.message === "string" ? d.message : JSON.stringify(err.detail);
          } else {
            message = JSON.stringify(err.detail);
          }
        } else if (err?.message) {
          message = String(err.message);
        }
      } catch {
        if (res.status >= 500) {
          message = "Something went wrong";
        }
      }
      const lowerMsg = message.toLowerCase();
      const technicalPatterns = ["traceback", "sqlalchemy", "asyncpg", "internal server error"];
      if (technicalPatterns.some((p) => lowerMsg.includes(p))) {
        message = "Something went wrong";
      }
      if (triesLeft > 0) return attempt(triesLeft - 1);
      console.error("[API ERROR]", {
        path,
        status: res.status,
        detail,
        message
      });
      throw new ApiError(res.status, message, detail);
    }
    return res.json();
  }
  return attempt(retries);
}
function mapShopFromBackend(s) {
  const parts = [s.address_line, s.city, s.state, s.pincode].filter(Boolean);
  return {
    id: s.id,
    owner_id: s.owner_id,
    name: s.name,
    phone: s.phone,
    description: s.description,
    address: parts.join(", "),
    cuisine: s.category,
    image_url: s.image_url,
    is_verified: s.is_verified,
    is_active: s.is_active,
    is_open: s.is_open,
    is_accepting_orders: s.is_accepting_orders,
    rating: s.rating_avg,
    total_reviews: s.rating_count,
    loyalty_discount_per_point: s.loyalty_discount_per_point,
    created_at: s.created_at
  };
}
function parseAddress(raw) {
  if (!raw) return { address_line: "NA", city: "NA", state: "NA", pincode: "" };
  const pincodeMatch = raw.match(/\b(\d{5,6})\b/);
  const pincode = pincodeMatch?.[1] ?? "";
  const clean = pincode ? raw.replace(pincode, "").replace(/,\s*,/, ",").trim() : raw;
  const parts = clean.split(",").map((s) => s.trim()).filter(Boolean);
  const address_line = parts[0] ?? raw;
  const city = parts.length >= 2 ? parts[1] : "NA";
  const state = parts.length >= 3 ? parts[2].replace(pincode, "").trim() : "NA";
  return { address_line, city, state: state || "NA", pincode };
}
const authApi = {
  register: (body) => apiRequest("/api/v1/auth/register", { method: "POST", body, auth: false }),
  login: (body) => {
    const form = new URLSearchParams();
    form.set("username", body.username);
    form.set("password", body.password);
    return apiRequest("/api/v1/auth/login", { method: "POST", body: form, auth: false, isForm: true });
  },
  refresh: (refresh_token) => apiRequest("/api/v1/auth/refresh", { method: "POST", body: { refresh_token }, auth: false }),
  me: () => apiRequest("/api/v1/auth/me"),
  logout: (accessToken) => apiRequest("/api/v1/auth/logout", { method: "POST", accessToken }),
  checkPhone: (phone) => apiRequest(
    "/api/v1/auth/check-phone",
    {
      auth: false,
      query: { phone }
    }
  )
};
const otpApi = {
  sendOtp: (body) => apiRequest("/api/v1/send-otp", { method: "POST", body, auth: body.purpose === "profile_email" }),
  verifyOtp: (body) => apiRequest("/api/v1/verify-otp", { method: "POST", body, auth: body.purpose === "profile_email" })
};
const usersApi = {
  me: () => apiRequest("/api/v1/users/me"),
  updateProfile: (body) => apiRequest("/api/v1/users/me", { method: "PATCH", body }),
  updatePassword: (body) => apiRequest("/api/v1/users/me/password", { method: "PATCH", body }),
  get: (id) => apiRequest(`/api/v1/users/${id}`)
};
const shopsApi = {
  create: async (body) => {
    const addr = parseAddress(body.address);
    const payload = {
      name: body.name ?? "",
      phone: body.phone ?? "",
      description: body.description ?? null,
      address_line: addr.address_line,
      city: addr.city,
      state: addr.state,
      pincode: body.pincode?.trim() || addr.pincode || "",
      category: body.cuisine?.trim() || null,
      opening_hours: null,
      image_url: body.image_url ?? null,
      loyalty_discount_per_point: body.loyalty_discount_per_point ?? 0.1
    };
    const created = await apiRequest("/api/v1/shops", { method: "POST", body: payload });
    return mapShopFromBackend(created);
  },
  list: async (params = {}) => {
    const backendQuery = {
      page: params.page,
      page_size: params.page_size,
      q: params.search,
      category: params.cuisine,
      city: params.city
    };
    const rows = await apiRequest("/api/v1/shops", { query: backendQuery, auth: false, retries: 2 });
    return rows.map(mapShopFromBackend);
  },
  get: async (id) => {
    const shop = await apiRequest(`/api/v1/shops/${id}`, { auth: false });
    return mapShopFromBackend(shop);
  },
  update: async (id, body) => {
    const payload = {};
    if (body.name !== void 0) payload.name = body.name;
    if (body.description !== void 0) payload.description = body.description;
    if (body.phone !== void 0) payload.phone = body.phone;
    if (body.cuisine !== void 0) payload.category = body.cuisine?.trim() || null;
    if (body.image_url !== void 0) payload.image_url = body.image_url;
    if (body.loyalty_discount_per_point !== void 0) payload.loyalty_discount_per_point = body.loyalty_discount_per_point;
    if (body.address !== void 0) {
      const addr = parseAddress(body.address);
      payload.address_line = addr.address_line;
      payload.city = addr.city;
      payload.state = addr.state;
      payload.pincode = body.pincode?.trim() || addr.pincode || "";
    } else if (body.pincode !== void 0) {
      payload.pincode = body.pincode.trim();
    }
    if (body.is_open !== void 0) payload.is_open = body.is_open;
    if (body.is_accepting_orders !== void 0) payload.is_accepting_orders = body.is_accepting_orders;
    const updated = await apiRequest(`/api/v1/shops/${id}`, { method: "PATCH", body: payload });
    return mapShopFromBackend(updated);
  },
  myShops: async () => {
    const rows = await apiRequest("/api/v1/shops/me/list");
    return rows.map(mapShopFromBackend);
  },
  setStatus: async (id, body) => {
    const current = await apiRequest(`/api/v1/shops/${id}`);
    const payload = {
      is_open: body.is_open ?? current.is_open,
      is_accepting_orders: body.is_accepting_orders ?? current.is_accepting_orders
    };
    const updated = await apiRequest(`/api/v1/shops/${id}`, { method: "PATCH", body: payload });
    return mapShopFromBackend(updated);
  },
  dashboard: async (id) => {
    return apiRequest(`/api/v1/shops/${id}/dashboard`);
  },
  stats: async (id) => {
    return apiRequest(`/api/v1/shops/${id}/stats`);
  }
};
const menuApi = {
  listItems: (shopId) => apiRequest(`/api/v1/menu/shops/${shopId}/items`, { auth: false }),
  createItem: (shopId, body) => apiRequest(`/api/v1/menu/shops/${shopId}/items`, { method: "POST", body }),
  updateItem: (itemId, body) => apiRequest(`/api/v1/menu/items/${itemId}`, { method: "PATCH", body }),
  deleteItem: (itemId) => apiRequest(`/api/v1/menu/items/${itemId}`, { method: "DELETE" }),
  listVariants: (itemId) => apiRequest(`/api/v1/menu/items/${itemId}/variants`, { auth: false }),
  createVariant: (itemId, body) => apiRequest(`/api/v1/menu/items/${itemId}/variants`, { method: "POST", body }),
  updateVariant: (variantId, body) => apiRequest(`/api/v1/menu/variants/${variantId}`, { method: "PATCH", body }),
  deleteVariant: (variantId) => apiRequest(`/api/v1/menu/variants/${variantId}`, { method: "DELETE" })
};
const ordersApi = {
  create: (body) => apiRequest("/api/v1/orders", { method: "POST", body }),
  list: (params = {}) => apiRequest("/api/v1/orders/customer/me", { query: params }),
  get: (id) => apiRequest(`/api/v1/orders/${id}`),
  updateStatus: (id, status, reason) => apiRequest(`/api/v1/orders/${id}/status`, {
    method: "PATCH",
    body: { status, reason }
  }),
  cancel: (id) => apiRequest(`/api/v1/orders/${id}/cancel`, { method: "PATCH" }),
  shopOrders: (shopId, params = {}) => apiRequest(`/api/v1/orders/shops/${shopId}`, { query: params }),
  submitReview: (shopId, data) => apiRequest(`/api/v1/reviews/shops/${shopId}`, { method: "POST", body: data }),
  getTicket: (orderId) => apiRequest(`/api/v1/orders/ticket/${orderId}`, { method: "GET" })
};
const reviewsApi = {
  list: (shopId) => apiRequest(`/api/v1/reviews/shops/${shopId}`, { auth: false }),
  create: (body) => apiRequest(`/api/v1/reviews`, { method: "POST", body })
};
const loyaltyApi = {
  me: (shop_id) => apiRequest("/api/v1/loyalty/me", { query: { shop_id } }),
  transactions: (shop_id) => apiRequest("/api/v1/loyalty/me/transactions", { query: { shop_id } }),
  redeem: (body) => apiRequest("/api/v1/loyalty/me/redeem", { method: "POST", body }),
  adminAdjust: (customerId, body) => apiRequest(`/api/v1/admin/loyalty/adjust/${customerId}`, { method: "POST", body })
};
const adminApi = {
  analytics: (days) => apiRequest("/api/v1/admin/analytics/trends", { query: days ? { days } : void 0 }),
  trends: (days) => apiRequest("/api/v1/admin/analytics/trends", { query: days ? { days } : void 0 }),
  topShops: (limit = 10) => apiRequest("/api/v1/admin/analytics/top-shops", { query: { limit } }),
  recentOrders: (limit = 10) => apiRequest("/api/v1/admin/analytics/recent-orders", { query: { limit } }),
  revenueByCategory: () => apiRequest("/api/v1/admin/analytics/revenue-by-category"),
  users: (params = {}) => apiRequest("/api/v1/admin/users", { query: params }),
  listUsers: (params = {}) => apiRequest("/api/v1/admin/users", { query: params }),
  countUsers: () => apiRequest("/api/v1/admin/users/count"),
  setUserActive: (userId, body) => apiRequest(
    `/api/v1/admin/users/${userId}/active`,
    { method: "PATCH", query: { is_active: body.is_active } }
  ),
  changeUserRole: (userId, body) => apiRequest(
    `/api/v1/admin/users/${userId}/role`,
    { method: "PATCH", query: { role: body.role } }
  ),
  updateUser: (userId, body) => apiRequest(`/api/v1/admin/users/${userId}`, { method: "PATCH", body }),
  createUser: (body) => apiRequest("/api/v1/admin/users", { method: "POST", body }),
  shops: (params = {}) => apiRequest("/api/v1/admin/shops", { query: params }),
  listShops: (params = {}) => apiRequest("/api/v1/admin/shops", { query: params }),
  countShops: () => apiRequest("/api/v1/admin/shops/count"),
  verifyShop: (shopId, body) => apiRequest(
    `/api/v1/admin/shops/${shopId}/verify`,
    {
      method: "PATCH",
      query: { verified: body.is_verified },
      body: { is_verified: body.is_verified }
    }
  ),
  setShopActive: (shopId, body) => apiRequest(
    `/api/v1/admin/shops/${shopId}/active`,
    {
      method: "PATCH",
      query: { is_active: body.is_active },
      body: { is_active: body.is_active }
    }
  ),
  updateShop: (shopId, body) => apiRequest(`/api/v1/admin/shops/${shopId}`, { method: "PATCH", body }),
  listOrders: (params = {}) => apiRequest("/api/v1/admin/orders", { query: params }),
  orders: (params = {}) => apiRequest("/api/v1/admin/orders", { query: params }),
  updateOrderStatus: (orderId, status) => apiRequest(
    `/api/v1/admin/orders/${orderId}/status`,
    {
      method: "PUT",
      query: { status }
    }
  ),
  loyalty: (userId, body) => apiRequest(
    `/api/v1/loyalty/admin/adjust/${userId}`,
    {
      method: "POST",
      query: {
        shop_id: body.shopId,
        points: body.points
      }
    }
  )
};
const healthApi = {
  check: () => apiRequest("/health")
};
const AuthContext = createContext(null);
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    const access = tokenStore.access;
    const refreshToken = tokenStore.refresh;
    if (!access && !refreshToken) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      if (!access && refreshToken) {
        const tokens = await authApi.refresh(refreshToken);
        tokenStore.set(tokens.access_token, tokens.refresh_token);
      }
      const me = await authApi.me();
      setUser(me);
    } catch {
      tokenStore.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  const login = useCallback(async (identifier, password) => {
    const tokens = await authApi.login({ username: identifier, password });
    tokenStore.set(tokens.access_token, tokens.refresh_token);
    const me = await authApi.me();
    setUser(me);
    return me;
  }, []);
  const register = useCallback(
    async (body) => {
      await authApi.register(body);
      const loginId = body.phone || (typeof body.email === "string" ? body.email.trim() : "");
      const tokens = await authApi.login({ username: loginId, password: body.password });
      tokenStore.set(tokens.access_token, tokens.refresh_token);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    []
  );
  const logout = useCallback(async () => {
    const accessToken = tokenStore.access;
    tokenStore.clear();
    setUser(null);
    setLoading(false);
    try {
      if (accessToken) {
        await authApi.logout(accessToken);
      }
    } catch {
    }
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      refresh,
      login,
      register,
      logout
    }),
    [user, loading, refresh, login, register, logout]
  );
  return /* @__PURE__ */ jsx(AuthContext.Provider, { value, children });
}
function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
const appCss = "/assets/styles-eNZ2Woo7.css";
function NotFoundComponent() {
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("h1", { className: "text-7xl font-bold text-foreground", children: "404" }),
    /* @__PURE__ */ jsx("h2", { className: "mt-4 text-xl font-semibold", children: "Page not found" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "The page you're looking for doesn't exist." }),
    /* @__PURE__ */ jsx(
      Link,
      {
        to: "/",
        className: "mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90",
        children: "Go home"
      }
    )
  ] }) });
}
const Route$l = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "PreOrder — Skip the line" },
      { name: "description", content: "Pre-order your favorite food and skip the queue." },
      { name: "theme-color", content: "#0F0F14" }
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍽️</text></svg>" }
    ]
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent
});
function RootShell({ children }) {
  return /* @__PURE__ */ jsxs("html", { lang: "en", className: "dark", children: [
    /* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }),
    /* @__PURE__ */ jsxs("body", { className: "min-h-screen bg-background text-foreground antialiased", children: [
      children,
      /* @__PURE__ */ jsx(Scripts, {})
    ] })
  ] });
}
function RootComponent() {
  const [queryClient] = useState(
    () => new QueryClient({
      defaultOptions: {
        queries: { staleTime: 3e4, retry: 1, refetchOnWindowFocus: false }
      }
    })
  );
  return /* @__PURE__ */ jsx(QueryClientProvider, { client: queryClient, children: /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsxs(TooltipProvider, { delayDuration: 150, children: [
    /* @__PURE__ */ jsx(Outlet, {}),
    /* @__PURE__ */ jsx(Toaster, { richColors: true, position: "top-right", theme: "dark" })
  ] }) }) });
}
const $$splitComponentImporter$k = () => import("./unauthorized-CQVoyrf1.js");
const Route$k = createFileRoute("/unauthorized")({
  component: lazyRouteComponent($$splitComponentImporter$k, "component")
});
const $$splitComponentImporter$j = () => import("./register-pKsz24o0.js");
const Route$j = createFileRoute("/register")({
  component: lazyRouteComponent($$splitComponentImporter$j, "component"),
  head: () => ({
    meta: [{
      title: "Create account — PreOrder"
    }]
  })
});
const $$splitComponentImporter$i = () => import("./login-Ty8oNRn-.js");
const Route$i = createFileRoute("/login")({
  component: lazyRouteComponent($$splitComponentImporter$i, "component"),
  head: () => ({
    meta: [{
      title: "Sign in — PreOrder"
    }]
  })
});
const $$splitComponentImporter$h = () => import("./checkout-BwYu1R7O.js");
const Route$h = createFileRoute("/checkout")({
  component: lazyRouteComponent($$splitComponentImporter$h, "component")
});
const $$splitComponentImporter$g = () => import("./cart-BZPIfq_u.js");
const Route$g = createFileRoute("/cart")({
  component: lazyRouteComponent($$splitComponentImporter$g, "component")
});
const $$splitComponentImporter$f = () => import("./_app-Cyo3Mnwf.js");
const Route$f = createFileRoute("/_app")({
  component: lazyRouteComponent($$splitComponentImporter$f, "component")
});
const $$splitComponentImporter$e = () => import("./index-BdthR3nw.js");
const Route$e = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter$e, "component"),
  head: () => ({
    meta: [{
      title: "PreOrder — Order ahead, skip the line"
    }, {
      name: "description",
      content: "Browse shops, pre-order your favorites and pick up without waiting."
    }]
  })
});
const $$splitComponentImporter$d = () => import("./shops._shopId-DvsU3mxa.js");
const Route$d = createFileRoute("/shops/$shopId")({
  component: lazyRouteComponent($$splitComponentImporter$d, "component")
});
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return /* @__PURE__ */ jsx(Comp, { className: cn(buttonVariants({ variant, size, className })), ref, ...props });
  }
);
Button.displayName = "Button";
const $$splitComponentImporter$c = () => import("./profile-kNUFneTb.js");
const Route$c = createFileRoute("/_app/profile")({
  component: lazyRouteComponent($$splitComponentImporter$c, "component")
});
const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Overlay,
  {
    ref,
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props
  }
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsxs(DialogPortal, { children: [
  /* @__PURE__ */ jsx(DialogOverlay, {}),
  /* @__PURE__ */ jsxs(
    DialogPrimitive.Content,
    {
      ref,
      className: cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      ),
      ...props,
      children: [
        children,
        /* @__PURE__ */ jsxs(DialogPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] })
      ]
    }
  )
] }));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", { className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className), ...props });
DialogHeader.displayName = "DialogHeader";
const DialogFooter = ({ className, ...props }) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
    ...props
  }
);
DialogFooter.displayName = "DialogFooter";
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold leading-none tracking-tight", className),
    ...props
  }
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  DialogPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
const Textarea = React.forwardRef(
  ({ className, ...props }, ref) => {
    return /* @__PURE__ */ jsx(
      "textarea",
      {
        className: cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        ),
        ref,
        ...props
      }
    );
  }
);
Textarea.displayName = "Textarea";
const $$splitComponentImporter$b = () => import("./orders-BYDfPmRk.js");
const Route$b = createFileRoute("/_app/orders")({
  component: lazyRouteComponent($$splitComponentImporter$b, "component")
});
const $$splitComponentImporter$a = () => import("./loyalty-DDD8CeI7.js");
const Route$a = createFileRoute("/_app/loyalty")({
  component: lazyRouteComponent($$splitComponentImporter$a, "component")
});
const $$splitComponentImporter$9 = () => import("./index-CcfLWYBP.js");
const Route$9 = createFileRoute("/_app/owner/")({
  component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
const $$splitComponentImporter$8 = () => import("./index-CvT2D-MG.js");
const Route$8 = createFileRoute("/_app/admin/")({
  component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
const $$splitComponentImporter$7 = () => import("./orders._orderId-3nuKfjmT.js");
const Route$7 = createFileRoute("/_app/orders/$orderId")({
  component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
const $$splitComponentImporter$6 = () => import("./users-CSjQ7SJG.js");
const Route$6 = createFileRoute("/_app/admin/users")({
  component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
const $$splitComponentImporter$5 = () => import("./shops-kJ5AfkmP.js");
const Route$5 = createFileRoute("/_app/admin/shops")({
  component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
const $$splitComponentImporter$4 = () => import("./orders-BXEOGJ3R.js");
const Route$4 = createFileRoute("/_app/admin/orders")({
  component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
const $$splitComponentImporter$3 = () => import("./loyalty-CYkaVyp2.js");
const Route$3 = createFileRoute("/_app/admin/loyalty")({
  component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
const $$splitComponentImporter$2 = () => import("./escalations-CjxiDVZ_.js");
const Route$2 = createFileRoute("/_app/admin/escalations")({
  component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
const $$splitComponentImporter$1 = () => import("./shops.new-UE_0Q2ML.js");
const Route$1 = createFileRoute("/_app/owner/shops/new")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./shops._shopId-Ce10ngFO.js");
const Route = createFileRoute("/_app/owner/shops/$shopId")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const UnauthorizedRoute = Route$k.update({
  id: "/unauthorized",
  path: "/unauthorized",
  getParentRoute: () => Route$l
});
const RegisterRoute = Route$j.update({
  id: "/register",
  path: "/register",
  getParentRoute: () => Route$l
});
const LoginRoute = Route$i.update({
  id: "/login",
  path: "/login",
  getParentRoute: () => Route$l
});
const CheckoutRoute = Route$h.update({
  id: "/checkout",
  path: "/checkout",
  getParentRoute: () => Route$l
});
const CartRoute = Route$g.update({
  id: "/cart",
  path: "/cart",
  getParentRoute: () => Route$l
});
const AppRoute = Route$f.update({
  id: "/_app",
  getParentRoute: () => Route$l
});
const IndexRoute = Route$e.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$l
});
const ShopsShopIdRoute = Route$d.update({
  id: "/shops/$shopId",
  path: "/shops/$shopId",
  getParentRoute: () => Route$l
});
const AppProfileRoute = Route$c.update({
  id: "/profile",
  path: "/profile",
  getParentRoute: () => AppRoute
});
const AppOrdersRoute = Route$b.update({
  id: "/orders",
  path: "/orders",
  getParentRoute: () => AppRoute
});
const AppLoyaltyRoute = Route$a.update({
  id: "/loyalty",
  path: "/loyalty",
  getParentRoute: () => AppRoute
});
const AppOwnerIndexRoute = Route$9.update({
  id: "/owner/",
  path: "/owner/",
  getParentRoute: () => AppRoute
});
const AppAdminIndexRoute = Route$8.update({
  id: "/admin/",
  path: "/admin/",
  getParentRoute: () => AppRoute
});
const AppOrdersOrderIdRoute = Route$7.update({
  id: "/$orderId",
  path: "/$orderId",
  getParentRoute: () => AppOrdersRoute
});
const AppAdminUsersRoute = Route$6.update({
  id: "/admin/users",
  path: "/admin/users",
  getParentRoute: () => AppRoute
});
const AppAdminShopsRoute = Route$5.update({
  id: "/admin/shops",
  path: "/admin/shops",
  getParentRoute: () => AppRoute
});
const AppAdminOrdersRoute = Route$4.update({
  id: "/admin/orders",
  path: "/admin/orders",
  getParentRoute: () => AppRoute
});
const AppAdminLoyaltyRoute = Route$3.update({
  id: "/admin/loyalty",
  path: "/admin/loyalty",
  getParentRoute: () => AppRoute
});
const AppAdminEscalationsRoute = Route$2.update({
  id: "/admin/escalations",
  path: "/admin/escalations",
  getParentRoute: () => AppRoute
});
const AppOwnerShopsNewRoute = Route$1.update({
  id: "/owner/shops/new",
  path: "/owner/shops/new",
  getParentRoute: () => AppRoute
});
const AppOwnerShopsShopIdRoute = Route.update({
  id: "/owner/shops/$shopId",
  path: "/owner/shops/$shopId",
  getParentRoute: () => AppRoute
});
const AppOrdersRouteChildren = {
  AppOrdersOrderIdRoute
};
const AppOrdersRouteWithChildren = AppOrdersRoute._addFileChildren(
  AppOrdersRouteChildren
);
const AppRouteChildren = {
  AppLoyaltyRoute,
  AppOrdersRoute: AppOrdersRouteWithChildren,
  AppProfileRoute,
  AppAdminEscalationsRoute,
  AppAdminLoyaltyRoute,
  AppAdminOrdersRoute,
  AppAdminShopsRoute,
  AppAdminUsersRoute,
  AppAdminIndexRoute,
  AppOwnerIndexRoute,
  AppOwnerShopsShopIdRoute,
  AppOwnerShopsNewRoute
};
const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren);
const rootRouteChildren = {
  IndexRoute,
  AppRoute: AppRouteWithChildren,
  CartRoute,
  CheckoutRoute,
  LoginRoute,
  RegisterRoute,
  UnauthorizedRoute,
  ShopsShopIdRoute
};
const routeTree = Route$l._addFileChildren(rootRouteChildren)._addFileTypes();
function DefaultErrorComponent({ error, reset }) {
  const router2 = useRouter();
  return /* @__PURE__ */ jsx("div", { className: "flex min-h-screen items-center justify-center bg-background px-4", children: /* @__PURE__ */ jsxs("div", { className: "max-w-md text-center", children: [
    /* @__PURE__ */ jsx("div", { className: "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10", children: /* @__PURE__ */ jsx(
      "svg",
      {
        xmlns: "http://www.w3.org/2000/svg",
        className: "h-8 w-8 text-destructive",
        fill: "none",
        viewBox: "0 0 24 24",
        stroke: "currentColor",
        strokeWidth: 2,
        children: /* @__PURE__ */ jsx(
          "path",
          {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            d: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          }
        )
      }
    ) }),
    /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Something went wrong" }),
    /* @__PURE__ */ jsx("p", { className: "mt-2 text-sm text-muted-foreground", children: "An unexpected error occurred. Please try again." }),
    false,
    /* @__PURE__ */ jsxs("div", { className: "mt-6 flex items-center justify-center gap-3", children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            router2.invalidate();
            reset();
          },
          className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          children: "Try again"
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: "/",
          className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
          children: "Go home"
        }
      )
    ] })
  ] }) });
}
const getRouter = () => {
  const router2 = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultErrorComponent
  });
  return router2;
};
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  ApiError as A,
  Button as B,
  Dialog as D,
  Route$d as R,
  Textarea as T,
  apiRequest as a,
  TooltipProvider as b,
  Tooltip as c,
  TooltipTrigger as d,
  TooltipContent as e,
  DialogContent as f,
  DialogHeader as g,
  DialogTitle as h,
  DialogDescription as i,
  DialogFooter as j,
  cn as k,
  healthApi as l,
  menuApi as m,
  usersApi as n,
  ordersApi as o,
  otpApi as p,
  loyaltyApi as q,
  reviewsApi as r,
  shopsApi as s,
  adminApi as t,
  useAuth as u,
  Route$7 as v,
  DialogTrigger as w,
  Route as x,
  authApi as y,
  router as z
};
