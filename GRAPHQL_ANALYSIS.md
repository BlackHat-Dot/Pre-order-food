# GraphQL Analysis & Payload Audit

## Stack & Architecture Overview
- **Backend**: Python 3.13, FastAPI (ASGI), SQLAlchemy 2.0 (asyncpg / aiosqlite), Pydantic v2, Redis caching.
- **Frontend**: 
  - Primary SPA: React 18 / TypeScript / TanStack Router & React Query / Tailwind CSS / Radix UI (`order-delight-main/`).
  - Legacy Static Web Client: Vanilla JS / HTML (`frontend/`).
- **Data Layer**: Relational models for Users, Shops, MenuItems, MenuItemVariants, Orders, OrderItems, Payments, Reviews, Loyalty, Addresses, Coupons.

---

## Endpoint Payload Audit & Client Consumption

### 1. `GET /api/v1/shops` (Shops Directory & Search)
- **What it Returns**: Full list of `ShopOut` records containing 20 fields per shop:
  - `id`, `owner_id`, `name`, `phone`, `description`, `address_line`, `city`, `state`, `pincode`, `category`, `opening_hours`, `image_url`, `loyalty_discount_per_point`, `is_open`, `is_accepting_orders`, `is_verified`, `is_active`, `rating_avg`, `rating_count`, `created_at`.
- **What the Client Actually Uses (`order-delight-main/src/routes/index.tsx`)**:
  - Only 9 fields: `id`, `name`, `image_url`, `is_open`, `is_verified`, `rating_avg`, `rating_count`, `category`, `address_line`.
- **Over-fetching / Unused Data**:
  - `owner_id`, `phone`, `description`, `city`, `state`, `pincode`, `opening_hours`, `loyalty_discount_per_point`, `is_accepting_orders`, `is_active`, `created_at`.
- **GraphQL Opportunity**: `shops(page, pageSize, search)` query requesting only the 9 essential fields, reducing payload size by ~60%.

---

### 2. `GET /api/v1/orders` (Customer Order History)
- **What it Returns**: List of `OrderOut` objects with heavy deep nesting:
  - Root: `id`, `order_number`, `customer_id`, `shop_id`, `total_price`, `prep_time_minutes`, `scheduled_at`, `instructions`, `payment_method`, `payment_status`, `order_type`, `delivery_address_id`, `delivery_address`, `coupon_id`, `coupon_discount_applied`, `loyalty_points_used`, `loyalty_discount_amount`, `loyalty_points_earned`, `cancellation_reason`, `is_cancellation_pending`, `cancellation_requests_sent`, `created_at`, `updated_at`, `shop_name`.
  - Nested `customer`: Full `UserMinimalOut` (`id`, `name`, `phone`, `role`, etc.).
  - Nested `shop`: Full `ShopOut` record (20 fields).
  - Nested `items`: Full `OrderItemOut` array (each with `id`, `item_id`, `variant_id`, `quantity`, `unit_price`, `item_name_snapshot`, `variant_name_snapshot`, `notes`, `created_at`).
- **What the Client Actually Uses (`order-delight-main/src/routes/_app/orders.tsx`)**:
  - Order root: `id`, `order_number`, `status`, `created_at`, `total_price`, `shop_name`.
  - Order items: `quantity`, `item_name_snapshot`, `variant_name_snapshot`.
- **Over-fetching / Unused Data**:
  - Entire nested `customer` object, entire nested `shop` object (all 20 fields), `instructions`, `scheduled_at`, `prep_time_minutes`, `payment_method`, `payment_status`, `order_type`, `delivery_address_id`, `delivery_address`, `coupon_id`, `coupon_discount_applied`, `loyalty_points_used`, `loyalty_discount_amount`, `loyalty_points_earned`, `cancellation_reason`, `cancellation_requests_sent`, `updated_at`, and item IDs.
- **GraphQL Opportunity**: `myOrders(status, page, pageSize)` query requesting only summary root fields and display items, reducing payload size by ~75%.

---

### 3. `GET /api/v1/shops/{shop_id}` + `GET /api/v1/menu/shops/{shop_id}` (Storefront Menu)
- **What it Returns**:
  - `shops/{shop_id}`: All 20 shop fields.
  - `menu/shops/{shop_id}`: Full list of `MenuItemOut` with `id`, `shop_id`, `name`, `description`, `base_price`, `category`, `dietary_type`, `image_url`, `is_available`, `is_featured`, `prep_time_minutes`, `calories`, `created_at`, plus full nested `variants` array.
- **What the Client Actually Uses (`order-delight-main/src/routes/shops.$shopId.tsx`)**:
  - Shop: `id`, `name`, `description`, `address_line`, `category`, `image_url`, `is_open`, `rating_avg`, `rating_count`, `phone`.
  - Menu Items: `id`, `name`, `description`, `base_price`, `category`, `dietary_type`, `image_url`, `is_available`, `variants { id, name, price_adjustment, is_available }`.
- **Over-fetching / Unused Data**:
  - Separate HTTP round-trips for shop metadata and menu items; unused timestamps, calories, prep time, and shop internal flags.
- **GraphQL Opportunity**: `shop(id)` query resolving nested `menuItems` in a single unified request with field selection.

---

### 4. `GET /api/v1/users/me` (Current User Profile)
- **What it Returns**: `id`, `role`, `name`, `phone`, `is_active`, `phone_verified`, `created_at`.
- **What the Client Actually Uses (`order-delight-main/src/components/app/PublicNav.tsx` & headers)**:
  - Primarily `name`, `role`, and `id`.
- **GraphQL Opportunity**: `me` query requesting only identity fields.

---

## GraphQL Implementation Scope
The following queries will be introduced under the GraphQL endpoint:
1. `shops(page: Int, pageSize: Int, search: String): [ShopType!]!` - Paginated shop listing with field selection for discovery.
2. `shop(id: ID!): ShopType` - Shop details with optional nested `menuItems: [MenuItemType!]!`.
3. `myOrders(status: String, page: Int, pageSize: Int): [OrderType!]!` - Authenticated customer order history with field selection.
4. `me: UserType` - Authenticated current user.

All existing REST endpoints remain 100% untouched and functional.
