// API client for PreOrder Food backend
const DEFAULT_BASE = "http://127.0.0.1:8000";
export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || DEFAULT_BASE;

const ACCESS_KEY = "pof_access_token";
const REFRESH_KEY = "pof_refresh_token";

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
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

function extractMessage(detail: unknown, fallback: string): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const first = detail[0] as { msg?: string; loc?: unknown[] } | undefined;
    if (first?.msg) {
      const loc = Array.isArray(first.loc) ? first.loc.slice(1).join(".") : "";
      return loc ? `${loc}: ${first.msg}` : first.msg;
    }
  }
  if (typeof detail === "object" && detail && "detail" in detail) {
    return extractMessage((detail as any).detail, fallback);
  }
  return fallback;
}

let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh_token = tokenStore.refresh;
  if (!refresh_token) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token }),
    });
    if (!res.ok) {
      tokenStore.clear();
      return null;
    }
    const data = (await res.json()) as { access_token: string; refresh_token?: string };
    tokenStore.set(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    return null;
  }
}

interface RequestOpts {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  auth?: boolean;
  isForm?: boolean;
}

const REQUEST_TIMEOUT_MS = 15000;

export async function apiRequest<T = unknown>(path: string, opts: RequestOpts = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, isForm = false } = opts;
  const url = new URL(`${API_BASE_URL}${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }

  const headers: Record<string, string> = {};
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";
  if (isForm && body !== undefined) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (auth && tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers,
      signal: controller.signal,
      body: body === undefined ? undefined : isForm ? (body as BodyInit) : JSON.stringify(body),
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timeout. Please try again.");
    }
    throw error;
  }

  if (res.status === 401 && auth && tokenStore.refresh) {
    refreshPromise = refreshPromise ?? doRefresh();
    const newToken = await refreshPromise;
    refreshPromise = null;
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      try {
        res = await fetch(url.toString(), {
          method,
          headers,
          signal: controller.signal,
          body: body === undefined ? undefined : isForm ? (body as BodyInit) : JSON.stringify(body),
        });
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new ApiError(408, "Request timeout. Please try again.");
        }
        throw error;
      }
    }
  }
  clearTimeout(timeoutId);

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? safeJson(text) : undefined;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data, res.statusText || "Request failed"), data);
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ───────────── Types (mirror OpenAPI) ─────────────
export type Role = "customer" | "shop_owner" | "admin";

export interface UserOut {
  id: string;
  role: Role;
  name: string;
  phone: string;
  email?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type?: string;
}

export interface ShopOut {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  address?: string | null; // UI-friendly combined address
  phone?: string | null;
  image_url?: string | null;
  cuisine?: string | null; // UI-friendly alias of backend `category`
  loyalty_discount_per_point?: number;
  is_open?: boolean;
  is_accepting_orders?: boolean;
  is_active?: boolean;
  is_verified?: boolean;
  rating?: number | null;
  rating_count?: number | null;
  created_at?: string;
}

export interface VariantOut {
  id: string;
  item_id: string;
  name: string;
  price: number;
  prep_time_minutes?: number;
  is_available?: boolean;
}

export interface MenuItemOut {
  id: string;
  shop_id: string;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category?: string | null;
  dietary_type?: "veg" | "non_veg" | "vegan" | string;
  prep_time_minutes?: number;
  is_featured?: boolean;
  is_available?: boolean;
  variants?: VariantOut[];
}

export type OrderStatus =
  | "pending"
  | "confirmed" // mapped from backend `accepted`
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export interface OrderItemOut {
  id: string;
  item_id: string;
  variant_id?: string | null;
  name?: string;
  variant_name?: string | null;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  notes?: string | null;
}

export interface OrderOut {
  id: string;
  customer_id: string;
  shop_id: string;
  status: OrderStatus;
  total: number;
  notes?: string | null;
  pickup_time?: string | null;
  created_at: string;
  items: OrderItemOut[];
  payment_method?: string;
  payment_status?: string;
  prep_time_minutes?: number;
  loyalty_points_used?: number;
  loyalty_discount_amount?: number;
  loyalty_points_earned?: number;
}

export interface PaymentOut {
  id: string;
  order_id: string;
  amount: number;
  status: string;
  method?: string;
  reference?: string | null;
  created_at: string;
}

export interface ReviewOut {
  id: string;
  shop_id: string;
  customer_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  customer_name?: string;
}

export interface LoyaltyAccountOut {
  shop_id: string;
  customer_id: string;
  points: number;
  tier?: string | null;
  updated_at?: string;
}

export interface LoyaltyTransactionOut {
  id: string;
  customer_id: string;
  points: number;
  type: string;
  reason?: string | null;
  created_at: string;
}

// ───────────── Endpoint wrappers ─────────────

type BackendShopOut = {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string;
  pincode: string;
  category: string;
  opening_hours: string | null;
  image_url: string | null;
  loyalty_discount_per_point: number;
  is_open: boolean;
  is_accepting_orders: boolean;
  is_verified: boolean;
  is_active: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
};

type BackendVariantOut = {
  id: string;
  item_id: string;
  name: string;
  price: number;
  prep_time_minutes: number;
  is_available: boolean;
  created_at: string;
};

type BackendMenuItemOut = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  dietary_type: string;
  prep_time_minutes: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  created_at: string;
  variants: BackendVariantOut[];
};

type BackendOrderItemOut = {
  id: string;
  order_id: string;
  item_id: string | null;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  item_name_snapshot: string;
  variant_name_snapshot: string | null;
};

type BackendOrderOut = {
  id: string;
  customer_id: string;
  shop_id: string;
  status: string;
  total_price: number;
  prep_time_minutes: number;
  scheduled_at: string | null;
  instructions: string | null;
  payment_method: string;
  payment_status: string;
  loyalty_points_used: number;
  loyalty_discount_amount: number;
  loyalty_points_earned: number;
  created_at: string;
  items: BackendOrderItemOut[];
};

type BackendLoyaltyAccountOut = {
  id: string;
  customer_id: string;
  shop_id: string;
  points_balance: number;
  tier: string;
  updated_at: string;
};

type BackendLoyaltyTransactionOut = {
  id: string;
  account_id: string;
  order_id?: string | null;
  points: number;
  action: string;
  created_at: string;
};

function mapOrderStatusFromBackend(s: string): OrderStatus {
  return s === "accepted" ? "confirmed" : (s as OrderStatus);
}

function mapOrderStatusToBackend(s: OrderStatus): string {
  return s === "confirmed" ? "accepted" : s;
}

function mapShopFromBackend(s: BackendShopOut): ShopOut {
  const address = [s.address_line, s.city, s.state, s.pincode].filter(Boolean).join(", ");
  return {
    id: s.id,
    owner_id: s.owner_id,
    name: s.name,
    description: s.description ?? null,
    address,
    phone: s.phone,
    image_url: s.image_url ?? null,
    cuisine: s.category ?? null,
    loyalty_discount_per_point: s.loyalty_discount_per_point,
    is_open: s.is_open,
    is_accepting_orders: s.is_accepting_orders,
    is_active: s.is_active,
    is_verified: s.is_verified,
    rating: typeof s.rating_avg === "number" ? s.rating_avg : null,
    rating_count: typeof s.rating_count === "number" ? s.rating_count : null,
    created_at: s.created_at,
  };
}

function mapMenuItemFromBackend(m: BackendMenuItemOut): MenuItemOut {
  return {
    id: m.id,
    shop_id: m.shop_id,
    name: m.name,
    description: m.description ?? null,
    price: m.price,
    image_url: m.image_url ?? null,
    category: m.category ?? null,
    dietary_type: m.dietary_type,
    prep_time_minutes: m.prep_time_minutes,
    is_available: m.is_available,
    is_featured: m.is_featured,
    variants: (m.variants ?? []).map((v) => ({
      id: v.id,
      item_id: v.item_id,
      name: v.name,
      price: v.price,
      prep_time_minutes: v.prep_time_minutes,
      is_available: v.is_available,
    })),
  };
}

function mapOrderFromBackend(o: BackendOrderOut): OrderOut {
  return {
    id: o.id,
    customer_id: o.customer_id,
    shop_id: o.shop_id,
    status: mapOrderStatusFromBackend(o.status),
    total: o.total_price,
    notes: o.instructions ?? null,
    pickup_time: o.scheduled_at ?? null,
    created_at: o.created_at,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    prep_time_minutes: o.prep_time_minutes,
    loyalty_points_used: o.loyalty_points_used,
    loyalty_discount_amount: o.loyalty_discount_amount,
    loyalty_points_earned: o.loyalty_points_earned,
    items: (o.items ?? []).map((it) => ({
      id: it.id,
      item_id: it.item_id ?? "",
      variant_id: it.variant_id,
      name: it.item_name_snapshot,
      variant_name: it.variant_name_snapshot,
      quantity: it.quantity,
      unit_price: it.unit_price,
      subtotal: it.unit_price * it.quantity,
    })),
  };
}

function parseAddress(address: string | undefined | null): { address_line: string; city: string; state: string; pincode: string } {
  const raw = (address ?? "").trim();
  if (!raw) return { address_line: "NA", city: "NA", state: "NA", pincode: "0000" };

  // Try to pull pincode-like digits (4-12) from the end.
  const pinMatch = raw.match(/(\d{4,12})(?!.*\d)/);
  const pincode = pinMatch?.[1] ?? "0000";

  // Split by commas; best-effort mapping.
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const address_line = parts[0] ?? raw;
  const city = parts.length >= 2 ? parts[1] : "NA";
  const state = parts.length >= 3 ? parts[2].replace(pincode, "").trim() : "NA";
  return { address_line, city, state: state || "NA", pincode };
}

export const authApi = {
  register: (body: { name: string; email: string; phone: string; password: string; role?: Role }) =>
    apiRequest<UserOut>("/api/v1/auth/register", { method: "POST", body, auth: false }),
  // Backend expects OAuth2PasswordRequestForm (application/x-www-form-urlencoded)
  login: (body: { username: string; password: string }) => {
    const form = new URLSearchParams();
    form.set("username", body.username);
    form.set("password", body.password);
    return apiRequest<TokenResponse>("/api/v1/auth/login", { method: "POST", body: form, auth: false, isForm: true });
  },
  refresh: (refresh_token: string) =>
    apiRequest<TokenResponse>("/api/v1/auth/refresh", {
      method: "POST",
      body: { refresh_token },
      auth: false,
    }),
  me: () => apiRequest<UserOut>("/api/v1/auth/me"),
  logout: () => apiRequest<void>("/api/v1/auth/logout", { method: "POST" }),
};

export const usersApi = {
  me: () => apiRequest<UserOut>("/api/v1/users/me"),
  updateProfile: (body: Partial<Pick<UserOut, "name" | "phone" | "email">>) =>
    apiRequest<UserOut>("/api/v1/users/me", { method: "PATCH", body }),
  updatePassword: (body: { current_password: string; new_password: string }) =>
    apiRequest<void>("/api/v1/users/me/password", { method: "PATCH", body }),
  get: (id: string) => apiRequest<UserOut>(`/api/v1/users/${id}`),
};

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
    const rows = await apiRequest<BackendShopOut[]>("/api/v1/shops", { query: backendQuery, auth: false });
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
    // Backend requires both fields; preserve the existing value if UI only toggles one.
    const current = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}`);
    const payload = {
      is_open: body.is_open ?? current.is_open,
      is_accepting_orders: body.is_accepting_orders ?? current.is_accepting_orders,
    };
    const updated = await apiRequest<BackendShopOut>(`/api/v1/shops/${id}/status`, { method: "PATCH", body: payload });
    return mapShopFromBackend(updated);
  },
  dashboard: (id: string) => apiRequest<any>(`/api/v1/shops/${id}/dashboard`),
  stats: (id: string) => apiRequest<any>(`/api/v1/shops/${id}/stats`),
};

export const menuApi = {
  createItem: async (shop_id: string, body: Partial<MenuItemOut>) => {
    const payload = {
      name: body.name ?? "",
      description: body.description ?? null,
      price: body.price ?? 0,
      category: body.category ?? "General",
      dietary_type: body.dietary_type ?? "veg",
      prep_time_minutes: body.prep_time_minutes ?? 15,
      image_url: body.image_url ?? null,
    };
    const created = await apiRequest<BackendMenuItemOut>(`/api/v1/menu/shops/${shop_id}/items`, { method: "POST", body: payload });
    return mapMenuItemFromBackend(created);
  },
  listItems: async (shop_id: string) => {
    const rows = await apiRequest<BackendMenuItemOut[]>(`/api/v1/menu/shops/${shop_id}/items`, { auth: false });
    return rows.map(mapMenuItemFromBackend);
  },
  getItem: async (id: string) => {
    const item = await apiRequest<BackendMenuItemOut>(`/api/v1/menu/items/${id}`, { auth: false });
    return mapMenuItemFromBackend(item);
  },
  updateItem: async (id: string, body: Partial<MenuItemOut>) => {
    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.description !== undefined) payload.description = body.description;
    if (body.price !== undefined) payload.price = body.price;
    if (body.category !== undefined) payload.category = body.category;
    if (body.dietary_type !== undefined) payload.dietary_type = body.dietary_type;
    if (body.prep_time_minutes !== undefined) payload.prep_time_minutes = body.prep_time_minutes;
    if (body.image_url !== undefined) payload.image_url = body.image_url;
    if (body.is_available !== undefined) payload.is_available = body.is_available;
    if (body.is_featured !== undefined) payload.is_featured = body.is_featured;
    const updated = await apiRequest<BackendMenuItemOut>(`/api/v1/menu/items/${id}`, { method: "PATCH", body: payload });
    return mapMenuItemFromBackend(updated);
  },
  deleteItem: (id: string) =>
    apiRequest<void>(`/api/v1/menu/items/${id}`, { method: "DELETE" }),
  createVariant: async (item_id: string, body: Partial<VariantOut>) => {
    const payload = {
      name: body.name ?? "",
      price: body.price ?? 0,
      prep_time_minutes: body.prep_time_minutes ?? 15,
      is_available: body.is_available ?? true,
    };
    const created = await apiRequest<BackendVariantOut>(`/api/v1/menu/items/${item_id}/variants`, { method: "POST", body: payload });
    return {
      id: created.id,
      item_id: created.item_id,
      name: created.name,
      price: created.price,
      prep_time_minutes: created.prep_time_minutes,
      is_available: created.is_available,
    };
  },
  listVariants: async (item_id: string) => {
    const rows = await apiRequest<BackendVariantOut[]>(`/api/v1/menu/items/${item_id}/variants`, { auth: false });
    return rows.map((v) => ({
      id: v.id,
      item_id: v.item_id,
      name: v.name,
      price: v.price,
      prep_time_minutes: v.prep_time_minutes,
      is_available: v.is_available,
    }));
  },
  updateVariant: async (id: string, body: Partial<VariantOut>) => {
    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = body.name;
    if (body.price !== undefined) payload.price = body.price;
    if (body.prep_time_minutes !== undefined) payload.prep_time_minutes = body.prep_time_minutes;
    if (body.is_available !== undefined) payload.is_available = body.is_available;
    const updated = await apiRequest<BackendVariantOut>(`/api/v1/menu/variants/${id}`, { method: "PATCH", body: payload });
    return {
      id: updated.id,
      item_id: updated.item_id,
      name: updated.name,
      price: updated.price,
      prep_time_minutes: updated.prep_time_minutes,
      is_available: updated.is_available,
    };
  },
  deleteVariant: (id: string) =>
    apiRequest<void>(`/api/v1/menu/variants/${id}`, { method: "DELETE" }),
};

export interface OrderItemInput {
  item_id: string;
  variant_id?: string | null;
  quantity: number;
  notes?: string | null;
}

export const ordersApi = {
  create: async (body: { shop_id: string; items: OrderItemInput[]; notes?: string; pickup_time?: string; redeem_loyalty_points?: number }) => {
    const payload = {
      shop_id: body.shop_id,
      items: body.items.map((it) => ({
        item_id: it.item_id ?? null,
        variant_id: it.variant_id ?? null,
        quantity: it.quantity,
      })),
      scheduled_at: body.pickup_time ?? null,
      instructions: body.notes ?? null,
      payment_method: "cod",
      redeem_loyalty_points: body.redeem_loyalty_points ?? 0,
    };
    const created = await apiRequest<BackendOrderOut>("/api/v1/orders", { method: "POST", body: payload });
    return mapOrderFromBackend(created);
  },
  get: async (id: string) => {
    const order = await apiRequest<BackendOrderOut>(`/api/v1/orders/${id}`);
    return mapOrderFromBackend(order);
  },
  remove: (id: string) => apiRequest<void>(`/api/v1/orders/${id}`, { method: "DELETE" }),
  myOrders: async (params: { page?: number; page_size?: number; status?: string } = {}) => {
    const rows = await apiRequest<BackendOrderOut[]>("/api/v1/orders/customer/me", { query: params });
    return rows.map(mapOrderFromBackend);
  },
  shopOrders: (
    shop_id: string,
    params: { page?: number; page_size?: number; status?: string } = {},
  ) =>
    apiRequest<BackendOrderOut[]>(`/api/v1/orders/shops/${shop_id}`, { query: params }).then((rows) => rows.map(mapOrderFromBackend)),
  updateStatus: async (id: string, body: { status: OrderStatus }) => {
    const updated = await apiRequest<BackendOrderOut>(`/api/v1/orders/${id}/status`, {
      method: "PATCH",
      body: { status: mapOrderStatusToBackend(body.status) },
    });
    return mapOrderFromBackend(updated);
  },
  cancel: (id: string, body: { reason?: string } = {}) =>
    apiRequest<BackendOrderOut>(`/api/v1/orders/${id}/cancel`, { method: "PATCH", body }).then(mapOrderFromBackend),
};

export const paymentsApi = {
  create: (body: { order_id: string; method?: string }) =>
    apiRequest<any>("/api/v1/payments/create", { method: "POST", body }),
  verify: (body: Record<string, unknown>) =>
    apiRequest<PaymentOut>("/api/v1/payments/verify", { method: "POST", body }),
  list: (order_id: string) => apiRequest<PaymentOut[]>(`/api/v1/payments/orders/${order_id}`),
};

export const reviewsApi = {
  create: (body: { order_id: string; rating: number; comment?: string }) =>
    apiRequest<ReviewOut>("/api/v1/reviews", { method: "POST", body }),
  list: (shop_id: string) =>
    apiRequest<ReviewOut[]>(`/api/v1/reviews/shops/${shop_id}`, { auth: false }),
  update: (id: string, body: { rating?: number; comment?: string }) =>
    apiRequest<ReviewOut>(`/api/v1/reviews/${id}`, { method: "PATCH", body }),
  remove: (id: string) => apiRequest<void>(`/api/v1/reviews/${id}`, { method: "DELETE" }),
};

export const loyaltyApi = {
  me: async (shop_id: string) => {
    const data = await apiRequest<BackendLoyaltyAccountOut>("/api/v1/loyalty/me", { query: { shop_id } });
    return {
      customer_id: data.customer_id,
      shop_id: data.shop_id,
      points: data.points_balance,
      tier: data.tier,
      updated_at: data.updated_at,
    } as LoyaltyAccountOut;
  },
  myTransactions: async (shop_id: string) => {
    const rows = await apiRequest<BackendLoyaltyTransactionOut[]>("/api/v1/loyalty/me/transactions", { query: { shop_id } });
    return rows.map((r) => ({
      id: r.id,
      customer_id: "",
      points: r.points,
      type: r.action,
      reason: r.order_id ?? undefined,
      created_at: r.created_at,
    })) as LoyaltyTransactionOut[];
  },
  redeem: (body: { shop_id: string; points: number }) =>
    apiRequest<any>("/api/v1/loyalty/me/redeem", { method: "POST", body }),
  adjust: (customer_id: string, body: { shop_id: string; points: number }) =>
    apiRequest<any>(`/api/v1/loyalty/admin/adjust/${customer_id}`, { method: "POST", query: { shop_id: body.shop_id, points: body.points } }),
};

export interface AdminShopOut {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  phone: string;
  is_verified: boolean;
  is_active: boolean;
  is_open: boolean;
  is_accepting_orders: boolean;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  owner_name: string;
  owner_email: string | null;
  owner_id: string;
}

export interface AdminOrderOut {
  id: string;
  customer_id: string;
  customer_name: string;
  shop_id: string;
  shop_name: string;
  status: string;
  total_price: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

export interface AnalyticsOverview {
  users: number;
  active_users: number;
  shops: number;
  verified_shops: number;
  orders: number;
  today_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  month_revenue: number;
  week_revenue: number;
  today_revenue: number;
}

export interface DailyOrderPoint { date: string; orders: number; revenue: number; }
export interface DailySignupPoint { date: string; signups: number; }
export interface AnalyticsTrends {
  daily_orders: DailyOrderPoint[];
  daily_signups: DailySignupPoint[];
  order_by_status: Record<string, number>;
}

export interface TopShop {
  shop_id: string;
  shop_name: string;
  category: string;
  city: string;
  order_count: number;
  revenue: number;
  rating: number;
  is_verified: boolean;
}

export interface RecentOrder {
  id: string;
  customer_name: string;
  shop_name: string;
  status: string;
  total: number;
  created_at: string;
}

export interface CategoryRevenue { category: string; orders: number; revenue: number; }

export const adminApi = {
  listUsers: (params: { page?: number; page_size?: number; role?: string; search?: string } = {}) =>
    apiRequest<UserOut[]>("/api/v1/admin/users", { query: params }),
  countUsers: () => apiRequest<{ total: number; active: number; by_role: Record<string, number> }>("/api/v1/admin/users/count"),
  getUser: (id: string) => apiRequest<UserOut>(`/api/v1/admin/users/${id}`),
  setUserActive: (id: string, body: { is_active: boolean }) =>
    apiRequest<any>(`/api/v1/admin/users/${id}/active`, { method: "PATCH", query: { is_active: body.is_active } }),
  changeUserRole: (id: string, role: string) =>
    apiRequest<any>(`/api/v1/admin/users/${id}/role`, { method: "PATCH", query: { role } }),
  createUser: (body: { name: string; phone: string; email?: string; password: string; role: string }) =>
    apiRequest<UserOut>("/api/v1/admin/users", { method: "POST", body }),
  listShops: (params: { page?: number; page_size?: number; search?: string; verified?: boolean; active?: boolean } = {}) =>
    apiRequest<AdminShopOut[]>("/api/v1/admin/shops", { query: params }),
  countShops: () => apiRequest<{ total: number; verified: number; active: number; open_now: number }>("/api/v1/admin/shops/count"),
  verifyShop: (id: string, body: { is_verified: boolean }) =>
    apiRequest<any>(`/api/v1/admin/shops/${id}/verify`, { method: "PATCH", query: { verified: body.is_verified } }),
  setShopActive: (id: string, body: { is_active: boolean }) =>
    apiRequest<any>(`/api/v1/admin/shops/${id}/active`, { method: "PATCH", query: { is_active: body.is_active } }),
  listOrders: (params: { page?: number; page_size?: number; status?: string } = {}) =>
    apiRequest<AdminOrderOut[]>("/api/v1/admin/orders", { query: params }),
  analytics: () => apiRequest<AnalyticsOverview>("/api/v1/admin/analytics/overview"),
  trends: (days?: number) => apiRequest<AnalyticsTrends>("/api/v1/admin/analytics/trends", { query: { days } }),
  topShops: (limit?: number) => apiRequest<TopShop[]>("/api/v1/admin/analytics/top-shops", { query: { limit } }),
  recentOrders: (limit?: number) => apiRequest<RecentOrder[]>("/api/v1/admin/analytics/recent-orders", { query: { limit } }),
  revenueByCategory: () => apiRequest<CategoryRevenue[]>("/api/v1/admin/analytics/revenue-by-category"),
};

export const healthApi = {
  check: () => apiRequest<any>("/health", { auth: false }),
};
