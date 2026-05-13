// API client for PreOrder Food backend
// import.meta.env.SSR is statically replaced by Vite at build time (true on server, false on client),
// so it never causes an SSR/hydration mismatch the way `typeof window` does.
// SSR: reach the backend directly via localhost (same container).
// Browser: use relative paths → Vite dev-proxy (or prod reverse-proxy) forwards to the backend.
export const API_BASE_URL: string = import.meta.env.SSR
  ? ((import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "http://127.0.0.1:8000")
  : ((import.meta.env.VITE_PUBLIC_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ?? "");

const ACCESS_KEY = "pof_access_token";
const REFRESH_KEY = "pof_refresh_token";

export const tokenStore = {
  get access() {
    if (import.meta.env.SSR) return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (import.meta.env.SSR) return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// ── Request helper ─────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  auth?: boolean;
  accessToken?: string | null;
  retries?: number;
  isForm?: boolean;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    auth = true,
    accessToken: explicitToken,
    retries = 0,
    isForm = false,
  } = options;

  const base = API_BASE_URL;
  const url = new URL(`${base}${path}`, typeof window !== "undefined" ? window.location.origin : "http://localhost");
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== null && v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  const token = explicitToken ?? (auth ? tokenStore.access : null);
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = {
    method,
    headers,
    body: body instanceof URLSearchParams
      ? body.toString()
      : body !== undefined
        ? isForm
          ? (body as URLSearchParams).toString()
          : JSON.stringify(body)
        : undefined,
  };
  if (isForm && body instanceof URLSearchParams) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = body.toString();
  }

  async function attempt(triesLeft: number): Promise<T> {
    const res = await fetch(url.toString(), init);

    // Handle 401 + automatic token refresh (only once, no retry loop)
    if (res.status === 401 && auth && triesLeft === 0) {
      const refreshToken = tokenStore.refresh;
      if (refreshToken) {
        try {
          const ref = await fetch(`${base}/api/v1/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (ref.ok) {
            const data = (await ref.json()) as { access_token: string; refresh_token: string };
            tokenStore.set(data.access_token, data.refresh_token);
            headers["Authorization"] = `Bearer ${data.access_token}`;
            const retried = await fetch(url.toString(), { ...init, headers });
            if (retried.ok || retried.status === 204) {
              if (retried.status === 204) return undefined as T;
              return retried.json() as Promise<T>;
            }
          }
        } catch { /* fall through */ }
      }
      tokenStore.clear();
    }

    if (res.status === 204) return undefined as T;

    if (!res.ok) {
      let detail: unknown = null;
      let message = `${res.status} ${res.statusText}`;
      try {
        const err = await res.json();
        detail = err;
        if (err?.detail) {
          if (typeof err.detail === "string") message = err.detail;
          else if (typeof err.detail === "object" && err.detail !== null) {
            const d = err.detail as Record<string, unknown>;
            message = typeof d.message === "string" ? d.message : JSON.stringify(err.detail);
          } else {
            message = JSON.stringify(err.detail);
          }
        } else if (err?.message) {
          message = String(err.message);
        }
      } catch { /* non-JSON error body */ }
      if (triesLeft > 0) return attempt(triesLeft - 1);
      throw new ApiError(res.status, message, detail);
    }

    return res.json() as Promise<T>;
  }

  return attempt(retries);
}

// ── Types ──────────────────────────────────────────────────────────────────────

export type Role = "customer" | "shop_owner" | "admin";

export interface UserOut {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email: string | null;
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ShopOut {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  description: string | null;
  address: string;
  cuisine: string;
  image_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_open: boolean;
  is_accepting_orders: boolean;
  rating: number;
  total_reviews: number;
  loyalty_discount_per_point: number;
  created_at: string;
}

interface BackendShopOut {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string | null;
  pincode: string | null;
  category: string;
  image_url: string | null;
  is_verified: boolean;
  is_active: boolean;
  is_open: boolean;
  is_accepting_orders: boolean;
  rating: number;
  total_reviews: number;
  loyalty_discount_per_point: number;
  created_at: string;
}

function mapShopFromBackend(s: BackendShopOut): ShopOut {
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
    rating: s.rating,
    total_reviews: s.total_reviews,
    loyalty_discount_per_point: s.loyalty_discount_per_point,
    created_at: s.created_at,
  };
}

export interface MenuItemVariantOut {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface MenuItemOut {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  base_price: number;
  image_url: string | null;
  is_available: boolean;
  category: string | null;
  variants: MenuItemVariantOut[];
}

export interface CartItem {
  menu_item_id: string;
  variant_id: string | null;
  quantity: number;
  name: string;
  variant_name: string | null;
  unit_price: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export interface OrderItemOut {
  id: string;
  menu_item_id: string;
  variant_id: string | null;
  name: string;
  variant_name: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentOut {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  created_at: string;
}

export interface OrderOut {
  id: string;
  shop_id: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: number;
  notes: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItemOut[];
  payment: PaymentOut | null;
  loyalty_points_earned: number;
  loyalty_points_used: number;
  customer_name?: string;
  shop_name?: string;
}

export interface ReviewOut {
  id: string;
  shop_id: string;
  customer_id: string;
  order_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  customer_name?: string;
}

export interface LoyaltyAccountOut {
  id: string;
  user_id: string;
  points_balance: number;
  total_earned: number;
  total_redeemed: number;
  updated_at: string;
}

export interface LoyaltyTransactionOut {
  id: string;
  account_id: string;
  delta: number;
  balance_after: number;
  reason: string;
  order_id: string | null;
  created_at: string;
}

// ── Address parser (used by shop APIs) ────────────────────────────────────────

function parseAddress(raw: string | null | undefined): {
  address_line: string;
  city: string;
  state: string;
  pincode: string;
} {
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

// ── Auth API ───────────────────────────────────────────────────────────────────

export const authApi = {
  register: (body: {
    name: string;
    email?: string | null;
    phone: string;
    password: string;
    role?: Role;
    phone_verification_token: string;
  }) => apiRequest<UserOut>("/api/v1/auth/register", { method: "POST", body, auth: false }),
  login: (body: { username: string; password: string }) => {
    const form = new URLSearchParams();
    form.set("username", body.username);
    form.set("password", body.password);
    return apiRequest<TokenResponse>("/api/v1/auth/login", { method: "POST", body: form, auth: false, isForm: true });
  },
  refresh: (refresh_token: string) =>
    apiRequest<TokenResponse>("/api/v1/auth/refresh", { method: "POST", body: { refresh_token }, auth: false }),
  me: () => apiRequest<UserOut>("/api/v1/auth/me"),
  logout: (accessToken?: string | null) => apiRequest<void>("/api/v1/auth/logout", { method: "POST", accessToken }),
};

// ── OTP API (email verification) ───────────────────────────────────────────────

export type OtpPurpose = "signup_phone" | "profile_email";

export interface SendOtpResponse {
  ok: boolean;
  expires_at?: string;
  expires_in_seconds?: number;
  resend_available_at?: string;
  resend_in_seconds?: number;
  cooldown_seconds?: number;
  max_sends_remaining?: number;
  error?: string;
  message?: string;
}

export interface VerifyOtpResponse {
  ok: boolean;
  verification_token?: string;
  token_expires_in_seconds?: number;
  channel?: string;
  error?: string;
  message?: string;
}

export const otpApi = {
  sendOtp: (body: { channel: "phone" | "email"; purpose: OtpPurpose; phone?: string; email?: string | null }) =>
    apiRequest<SendOtpResponse>("/api/v1/send-otp", { method: "POST", body, auth: body.purpose === "profile_email" }),
  verifyOtp: (body: { channel: "phone" | "email"; purpose: OtpPurpose; code: string; phone?: string; email?: string | null }) =>
    apiRequest<VerifyOtpResponse>("/api/v1/verify-otp", { method: "POST", body, auth: body.purpose === "profile_email" }),
};

// ── MSG91 API ──────────────────────────────────────────────────────────────────

export interface Msg91VerifyResponse {
  ok: boolean;
  verification_token: string;
  token_expires_in_seconds: number;
  phone: string;
}

/** Exchange a MSG91 widget access_token for our server-issued proof JWT. */
export const msg91Api = {
  verify: (body: { access_token: string; phone: string; purpose: "signup_phone" | "profile_phone" }) =>
    apiRequest<Msg91VerifyResponse>("/api/v1/verify-msg91", {
      method: "POST",
      body,
      auth: body.purpose === "profile_phone",
    }),
};

// ── Users API ──────────────────────────────────────────────────────────────────

export const usersApi = {
  me: () => apiRequest<UserOut>("/api/v1/users/me"),
  updateProfile: (
    body: Partial<Pick<UserOut, "name" | "phone" | "email">> & {
      email_verification_token?: string | null;
      phone_verification_token?: string | null;
      current_password?: string | null;
    },
  ) => apiRequest<UserOut>("/api/v1/users/me", { method: "PATCH", body }),
  updatePassword: (body: { current_password: string; new_password: string }) =>
    apiRequest<void>("/api/v1/users/me/password", { method: "PATCH", body }),
  get: (id: string) => apiRequest<UserOut>(`/api/v1/users/${id}`),
};

// ── Shops API ──────────────────────────────────────────────────────────────────

export const shopsApi = {
  create: async (body: Partial<ShopOut>) => {
    const addr = parseAddress(body.address);
    const payload = {
      name: body.name ?? "",
      phone: body.phone ?? "",
      description: body.description ?? null,
      address_line: addr.address_line,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode,
      category: body.cuisine ?? "General",
      opening_hours: null as string | null,
      image_url: body.image_url ?? null,
      loyalty_discount_per_point: body.loyalty_discount_per_point ?? 0.1,
    };
    const created = await apiRequest<BackendShopOut>("/api/v1/shops", { method: "POST", body: payload });
    return mapShopFromBackend(created);
  },
  list: async (params: { page?: number; page_size?: number; search?: string; cuisine?: string; city?: string } = {}) => {
    const backendQuery = {
      page: params.page,
      page_size: params.page_size,
      q: params.search,
      category: params.cuisine,
      city: params.city,
    };
    const rows = await apiRequest<BackendShopOut[]>("/api/v1/shops", { query: backendQuery, auth: false, retries: 2 });
    return rows.map(mapShopFromBackend);
  },
  get: async (id: string) => {
    const shop = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}`, { auth: false });
    return mapShopFromBackend(shop);
  },
  update: async (id: string, body: Partial<ShopOut>) => {
    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.phone !== undefined) payload.phone = body.phone;
    if (body.cuisine !== undefined) payload.category = body.cuisine;
    if (body.image_url !== undefined) payload.image_url = body.image_url;
    if (body.loyalty_discount_per_point !== undefined) payload.loyalty_discount_per_point = body.loyalty_discount_per_point;
    if (body.address !== undefined) {
      const addr = parseAddress(body.address);
      payload.address_line = addr.address_line;
      payload.city = addr.city;
      payload.state = addr.state;
      payload.pincode = addr.pincode;
    }
    if (body.is_open !== undefined) payload.is_open = body.is_open;
    if (body.is_accepting_orders !== undefined) payload.is_accepting_orders = body.is_accepting_orders;
    const updated = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}`, { method: "PATCH", body: payload });
    return mapShopFromBackend(updated);
  },
  myShops: async () => {
    const rows = await apiRequest<BackendShopOut[]>("/api/v1/shops/me/list");
    return rows.map(mapShopFromBackend);
  },
  setStatus: async (id: string, body: { is_open?: boolean; is_accepting_orders?: boolean }) => {
    const current = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}`);
    const payload = {
      is_open: body.is_open ?? current.is_open,
      is_accepting_orders: body.is_accepting_orders ?? current.is_accepting_orders,
    };
    const updated = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}`, { method: "PATCH", body: payload });
    return mapShopFromBackend(updated);
  },
};

// ── Menu API ───────────────────────────────────────────────────────────────────

export const menuApi = {
  list: (shopId: string) =>
    apiRequest<MenuItemOut[]>(`/api/v1/shops/${shopId}/menu`, { auth: false }),
  create: (shopId: string, body: Partial<MenuItemOut>) =>
    apiRequest<MenuItemOut>(`/api/v1/shops/${shopId}/menu`, { method: "POST", body }),
  update: (shopId: string, itemId: string, body: Partial<MenuItemOut>) =>
    apiRequest<MenuItemOut>(`/api/v1/shops/${shopId}/menu/${itemId}`, { method: "PATCH", body }),
  delete: (shopId: string, itemId: string) =>
    apiRequest<void>(`/api/v1/shops/${shopId}/menu/${itemId}`, { method: "DELETE" }),
  addVariant: (shopId: string, itemId: string, body: Partial<MenuItemVariantOut>) =>
    apiRequest<MenuItemVariantOut>(`/api/v1/shops/${shopId}/menu/${itemId}/variants`, { method: "POST", body }),
  updateVariant: (shopId: string, itemId: string, variantId: string, body: Partial<MenuItemVariantOut>) =>
    apiRequest<MenuItemVariantOut>(`/api/v1/shops/${shopId}/menu/${itemId}/variants/${variantId}`, { method: "PATCH", body }),
  deleteVariant: (shopId: string, itemId: string, variantId: string) =>
    apiRequest<void>(`/api/v1/shops/${shopId}/menu/${itemId}/variants/${variantId}`, { method: "DELETE" }),
};

// ── Orders API ─────────────────────────────────────────────────────────────────

export const ordersApi = {
  create: (body: {
    shop_id: string;
    items: CartItem[];
    notes?: string | null;
    scheduled_at?: string | null;
    loyalty_points_to_use?: number;
  }) => apiRequest<OrderOut>("/api/v1/orders", { method: "POST", body }),
  list: (params: { status?: OrderStatus; page?: number; page_size?: number } = {}) =>
    apiRequest<OrderOut[]>("/api/v1/orders", { query: params }),
  get: (id: string) => apiRequest<OrderOut>(`/api/v1/orders/${id}`),
  updateStatus: (id: string, status: OrderStatus) =>
    apiRequest<OrderOut>(`/api/v1/orders/${id}/status`, { method: "PATCH", body: { status } }),
  shopOrders: (shopId: string, params: { status?: OrderStatus; page?: number; page_size?: number } = {}) =>
    apiRequest<OrderOut[]>(`/api/v1/shops/${shopId}/orders`, { query: params }),
};

// ── Payments API ───────────────────────────────────────────────────────────────

export const paymentsApi = {
  create: (body: { order_id: string; provider?: string }) =>
    apiRequest<PaymentOut>("/api/v1/payments", { method: "POST", body }),
  get: (id: string) => apiRequest<PaymentOut>(`/api/v1/payments/${id}`),
  confirm: (id: string, body: { status: string }) =>
    apiRequest<PaymentOut>(`/api/v1/payments/${id}/confirm`, { method: "PATCH", body }),
};

// ── Reviews API ────────────────────────────────────────────────────────────────

export const reviewsApi = {
  list: (shopId: string) => apiRequest<ReviewOut[]>(`/api/v1/shops/${shopId}/reviews`, { auth: false }),
  create: (shopId: string, body: { order_id: string; rating: number; comment?: string | null }) =>
    apiRequest<ReviewOut>(`/api/v1/shops/${shopId}/reviews`, { method: "POST", body }),
};

// ── Loyalty API ────────────────────────────────────────────────────────────────

export const loyaltyApi = {
  me: () => apiRequest<LoyaltyAccountOut>("/api/v1/loyalty/me"),
  transactions: () => apiRequest<LoyaltyTransactionOut[]>("/api/v1/loyalty/me/transactions"),
};

// ── Admin API ──────────────────────────────────────────────────────────────────

export interface AdminAnalytics {
  total_revenue: number;
  total_orders: number;
  total_users: number;
  total_shops: number;
  revenue_by_day: { date: string; revenue: number; orders: number }[];
  top_shops: { shop_id: string; name: string; revenue: number; orders: number }[];
  orders_by_status: { status: string; count: number }[];
  revenue_by_category: { category: string; revenue: number }[];
  new_signups_by_day: { date: string; signups: number }[];
}

export interface AdminUserOut extends UserOut {
  shop_count?: number;
}

export const adminApi = {
  analytics: (days?: number) =>
    apiRequest<AdminAnalytics>("/api/v1/admin/analytics", { query: days ? { days } : undefined }),
  users: (params: { search?: string; role?: string; page?: number; page_size?: number } = {}) =>
    apiRequest<AdminUserOut[]>("/api/v1/admin/users", { query: params }),
  updateUser: (userId: string, body: { role?: string; is_active?: boolean }) =>
    apiRequest<AdminUserOut>(`/api/v1/admin/users/${userId}`, { method: "PATCH", body }),
  createUser: (body: { name: string; phone: string; email?: string; password: string; role: string }) =>
    apiRequest<AdminUserOut>("/api/v1/admin/users", { method: "POST", body }),
  shops: (params: { search?: string; is_verified?: boolean; page?: number; page_size?: number } = {}) =>
    apiRequest<ShopOut[]>("/api/v1/admin/shops", { query: params }),
  updateShop: (shopId: string, body: { is_verified?: boolean; is_active?: boolean }) =>
    apiRequest<ShopOut>(`/api/v1/admin/shops/${shopId}`, { method: "PATCH", body }),
  orders: (params: { status?: OrderStatus; page?: number; page_size?: number } = {}) =>
    apiRequest<OrderOut[]>("/api/v1/admin/orders", { query: params }),
  loyalty: (userId: string, body: { delta: number; reason: string }) =>
    apiRequest<LoyaltyAccountOut>(`/api/v1/admin/loyalty/${userId}`, { method: "POST", body }),
};

// ── Health ─────────────────────────────────────────────────────────────────────

export const healthApi = {
  check: () => apiRequest<{ status: string }>("/health"),
};
