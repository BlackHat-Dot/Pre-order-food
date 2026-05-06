# PreOrder Food — Production Frontend Plan

A dark, premium food ordering app that wraps your FastAPI backend 1:1. Three role experiences (Customer, Shop Owner, Admin) share one auth system and one design language.

> **API base URL**: I'll wire it through `VITE_API_BASE_URL`. Just paste your deployed URL into the env var and the whole app points at it. (Default falls back to `http://127.0.0.1:8000` so you can dev locally.)

---

## Design language

- **Theme**: dark premium. Near-black background (`#0B0B0F`), elevated cards (`#15151B`), warm amber accent (`#F5A524`) for CTAs/active states, subtle gradients and soft shadows.
- **Typography**: Inter for UI, tighter tracking on headings.
- **Layout**: collapsible left sidebar (shadcn) for authenticated app, top bar with search + cart + user menu. Public storefront uses a clean top nav.
- Toasts for every mutation, skeleton loaders, empty states with helpful CTAs, confirm dialogs for destructive actions.

---

## Auth & roles

- Register / Login / Logout / Refresh / Me — all wired to `/api/v1/auth/*`.
- Access + refresh tokens stored in `localStorage`; an axios-style fetch client auto-attaches `Authorization: Bearer …` and transparently refreshes on 401 using `/auth/refresh`.
- `_authenticated` route guard via TanStack Router `beforeLoad` + redirect-back to original URL.
- Role-based layout routes: `_authenticated/_customer`, `_authenticated/_owner`, `_authenticated/_admin` — each checks role from `/auth/me` and redirects unauthorized users to `/unauthorized`.
- After login the user lands on the dashboard for their role.

---

## Customer experience

| Route | Endpoints used |
|---|---|
| `/` (storefront) | `GET /shops` with search, filter, pagination |
| `/shops/$shopId` | `GET /shops/{id}`, `GET /menu/shops/{id}/items`, `GET /reviews/shops/{id}` |
| `/shops/$shopId/items/$itemId` | `GET /menu/items/{id}`, `GET /menu/items/{id}/variants` |
| `/cart` | local cart (per-shop), choose variant, quantity, notes |
| `/checkout` | `POST /orders`, then `POST /payments/create` → mock pay sheet → `POST /payments/verify` |
| `/orders` | `GET /orders/customer/me` with status filters |
| `/orders/$orderId` | `GET /orders/{id}`, cancel via `PATCH /orders/{id}/cancel`, list payments via `GET /payments/orders/{id}`, write/update review (`POST/PATCH /reviews`) |
| `/loyalty` | `GET /loyalty/me`, `GET /loyalty/me/transactions`, redeem via `POST /loyalty/me/redeem` |
| `/profile` | `GET/PATCH /users/me`, `PATCH /users/me/password` |

Cart is local (per-shop, single-shop checkout to keep order semantics clean). Loyalty balance shown in checkout with a "Redeem points" toggle.

---

## Shop owner experience

| Route | Endpoints |
|---|---|
| `/owner` | `GET /shops/me/list` — grid of owned shops + "Create shop" |
| `/owner/shops/new` | `POST /shops` |
| `/owner/shops/$shopId` | `GET /shops/{id}/dashboard`, `GET /shops/{id}/stats` (KPI cards + charts) |
| `/owner/shops/$shopId/edit` | `PATCH /shops/{id}`, `PATCH /shops/{id}/status` (open/closed toggle) |
| `/owner/shops/$shopId/menu` | items list, create/edit/delete items (`/menu/shops/{id}/items`, `/menu/items/{id}`) |
| `/owner/shops/$shopId/menu/$itemId` | variants CRUD (`/menu/items/{id}/variants`, `/menu/variants/{id}`) |
| `/owner/shops/$shopId/orders` | `GET /orders/shops/{id}` with status tabs, update status via `PATCH /orders/{id}/status` |

Stats page renders revenue / order-count / status-breakdown cards plus a small recharts line + donut.

---

## Admin experience

| Route | Endpoints |
|---|---|
| `/admin` | `GET /admin/analytics/overview` — KPI tiles + charts |
| `/admin/users` | `GET /admin/users` (paginated, role filter), `PATCH /admin/users/{id}/active` |
| `/admin/shops` | `GET /admin/shops`, `PATCH /admin/shops/{id}/verify`, `PATCH /admin/shops/{id}/active` |
| `/admin/orders` | `GET /admin/orders` with filters |
| `/admin/loyalty` | `POST /loyalty/admin/adjust/{customer_id}` (manual credit/debit dialog) |

---

## Payments (mock UI)

`POST /payments/create` returns whatever the backend gives → we open a styled "Confirm payment" modal showing amount + reference → on confirm we call `POST /payments/verify` with the returned id and a mock signature/token. Order detail then re-reads payments list. Easy to swap for Razorpay later — the call sites stay the same.

---

## Technical notes (for reference)

- TanStack Start + TanStack Router file routes + TanStack Query for all reads/mutations.
- Single typed API client in `src/lib/api.ts` (fetch wrapper + auth interceptor + typed endpoint functions grouped by tag: `auth`, `users`, `shops`, `menu`, `orders`, `payments`, `reviews`, `loyalty`, `admin`).
- TS types mirror the OpenAPI schemas you listed (UserOut, ShopOut, MenuItemOut, VariantOut, OrderOut, OrderItemOut, PaymentOut, ReviewOut, LoyaltyAccountOut, LoyaltyTransactionOut, etc.).
- Zod schemas for every form (register, login, profile, password, shop create/update, item, variant, review, redeem, adjust points) — surfaces backend 422 ValidationError details inline.
- Shared components: `DataTable`, `Pagination`, `StatusBadge`, `RoleBadge`, `EmptyState`, `ConfirmDialog`, `PriceTag`, `StarRating`, `OrderStatusStepper`.
- Health endpoint pinged on app boot; if down, a non-blocking banner shows "API unreachable".

---

## Out of scope (call out if you want them)

- Real payment gateway integration (currently mocked as agreed).
- Image uploads (no upload endpoints in your spec — image fields treated as URL strings).
- Realtime order updates (will use polling on the active order/shop-orders pages; can swap to WebSockets later if your backend exposes them).

Once you approve, I'll scaffold the API client + auth + routes first, then build customer → owner → admin in that order so you can click through each as it lands.