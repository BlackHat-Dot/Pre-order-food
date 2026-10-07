# PreOrder: Complete Architectural Frontend Rebuild

The frontend presentation layer of **PreOrder** has been completely rebuilt from the ground up as a high-performance, editorial web application. Built without artificial bloat or generic templates, it embodies the technical precision of **Drone**, the rich warmth and tactile materiality of **Monogrid/Pasticcino**, the clarity and product focus of **Aardvark**, and the institutional weight of **Tresmares Capital**.

---

## 1. Architectural Design System & Aesthetic Foundation

### Design Tokens & Visual Hierarchy (`frontend/css/design-system.css`)
- **Deep Carbon Canvas**: Pure dark canvas (`#08090C`, `#101217`, `#161922`) paired with warm Ember Bronze (`#E58826`, `#F59E0B`).
- **Hairline Structural Grid**: Razor-thin structural borders (`rgba(255, 255, 255, 0.08)` to `0.15`), micro-radii (`2px`–`6px`), and zero-shadow elevation.
- **Precision Typography**: Tight geometric grotesque (`Inter` / `Plus Jakarta Sans`) paired with technical tabular monospace (`JetBrains Mono` / `SF Mono`) for telemetry, IDs, timestamps, and numeric metrics.
- **NO AI SLOP Policy**: Zero generic bubbly cards, zero rainbow gradients, zero blurred glassmorphism traps, and zero cartoon emojis.

### UI Primitives & Components (`frontend/css/components.css`)
- **Telemetry Badges**: Live state indicators (`[ STATUS: OPEN ]`, `[ PREP ~12M ]`, `[ SCORE 4.9★ ]`).
- **Dietary Indicators**: High-contrast, standardized capsule tags (`VEG`, `NON-VEG`, `VEGAN`).
- **Metrics Ribbon**: High-authority metric monuments (`12 MIN Avg Prep`, `0 SEC Counter Wait`, `100% Verified`, `4.92★ Diner Score`).
- **Reactive Cart Drawer**: Floating order manifest with live counter pill, quantity controls, and subtotal calculation.
- **5-Stage Order Stepper**: Hardware-inspired linear progression (`Pending` → `Accepted` → `Preparing` → `Ready` → `Completed`).

---

## 2. Core Modules & REST Client (`frontend/js/`)

| Module | Location | Purpose & Capabilities |
| :--- | :--- | :--- |
| **`api.js`** | `frontend/js/api.js` | Direct, strongly-typed interface to FastAPI backend `/api/v1`. Supports bearer token injection, automated error toast alerts, and complete mappings for Auth, Shops, Menus, Orders, Coupons, Loyalty, Reviews, Addresses, and Admin. |
| **`auth.js`** | `frontend/js/auth.js` | Session token storage (`access_token`, `refresh_token`), user profile cache, role detection (`customer`, `shop_owner`, `admin`), and route protection guards (`requireAuth`, `requireOwner`, `requireAdmin`). |
| **`cart.js`** | `frontend/js/cart.js` | Single-kitchen reactive cart store in `localStorage`. Dispatches `preorder:cart-updated` events, prevents multi-outlet conflicts, calculates preparation windows, and synchronizes drawer state. |
| **`toast.js`** | `frontend/js/toast.js` | Monospaced technical notification feed with success, error, and info telemetry alerts. |
| **`app.js`** | `frontend/js/app.js` | Global layout orchestrator injecting architectural top bar, user status pill, persistent cart drawer, and institutional footer. |

---

## 3. Implemented Presentation Pages (`frontend/`)

1. **`index.html` (Marketplace)**:
   - Typographic Hero: *"Direct Kitchen Telemetry. Zero Queue Wait."*
   - Live Telemetry Box & Institutional Metrics Ribbon.
   - Interactive Filter Desk: Debounced search bar, cuisine category capsules (`Cafes`, `Bakeries`, `Fast Gourmet`, `Fine Dining`).
   - Curated Kitchen Grid with real-time status badges (`OPEN FOR PREORDER` vs `CURRENTLY CLOSED`), prep duration, and star ratings.
   - Narrative Protocol Triad (`01 // ORDER AHEAD` → `02 // KITCHEN SYNCHRONIZATION` → `03 // DIRECT TICKET DISPATCH`).

2. **`shop.html` (Kitchen Dossier & Menu Catalog)**:
   - Full outlet header with direct telephone, address, operating hours, and live order status.
   - Sticky category navigation bar (`ALL ITEMS`, `MAINS`, `VIENNOISERIE`, `BEVERAGES`).
   - Tactile dish cards with dietary tags, descriptions, and preparation estimates.
   - Variant Customization Modal for dishes with configurations (e.g. Standard Hearth Portion vs Double Truffle Reserve).
   - Verified Diner Reviews Ledger with rating score and review submission modal.

3. **`checkout.html` (Order Dispatch & Settlement)**:
   - Order manifest itemization with quantity and variant breakdown.
   - Counter Pre-Order vs Courier Delivery switcher with saved address picker.
   - Special chef instructions box for allergens and timing notes.
   - Live promotional voucher validator (`GET /api/v1/coupons/validate/{code}`).
   - Loyalty points redemption slider with real-time currency deduction preview.
   - Settlement selector (`Cash on Fulfillment (COD)`, `Digital UPI`, `Loyalty Vault`).

4. **`orders.html` (Live Fulfillment Tracker & Archive)**:
   - Active Order Focus view with large order identifier (`ORDER #1006`).
   - Hardware-inspired 5-stage stepper track with live preparation countdown.
   - Real-time polling (every 5s) synchronizing status updates from the kitchen.
   - Order cancellation workflow with reason prompt before food preparation begins.
   - Paginated fulfillment archive table with status filters (`Active`, `Fulfilled`, `Cancelled`).

5. **`owner.html` (Kitchen Control Desk)**:
   - Multi-outlet selector and instant toggles for `Kitchen Open` and `Accepting Orders`.
   - Live Kitchen Ticket Board polling every 6 seconds.
   - Ticket state progression controls: `[ ACCEPT TICKET ]` → `[ START PREP ]` → `[ MARK READY ]` → `[ COLLECT CASH ]` → `[ COMPLETE & DISPATCH ]`.
   - Cancellation request review banner with `Approve Cancellation` or `Resume Prep`.
   - Menu Studio: Add dish, toggle `In Stock` / `Sold Out`, attach variants, delete dishes.

6. **`login.html` & `register.html` (Authentication)**:
   - Clean, high-conviction editorial layout with developer seed hints.
   - Role selector (`Verified Diner` vs `Kitchen Partner`).
   - 1-Click telephone verification proof (`POST /api/v1/verify-msg91`).
   - Automated login session creation upon registration.

7. **`loyalty.html` (Loyalty Vault)**:
   - Outlet balance monitor (`Accrued Points`, `Cash Equivalent`, `Tier Status`).
   - Interactive Voucher Minter converting points into shareable coupon codes.
   - Audit trail ledger of points earned and spent.

8. **`profile.html` (Diner Dossier & Address Book)**:
   - Account details inspection and profile update form.
   - Security vault for rotating passwords.
   - Address book manager with default address configuration.

9. **`admin.html` (Platform Verification Console)**:
   - High-level platform statistics (`Total Users`, `Total Kitchens`, `Total Orders`, `GMV`).
   - Outlet verification ledger with 1-click `Grant / Revoke Verification` toggle.

10. **`cart.html` (Order Manifest)**:
    - Dedicated full-page order ticket review with quantity steppers and subtotal calculations.

---

## 4. Verification & Testing

### 1. HTTP 200 Route Verification
All pages and static assets served directly by FastAPI return HTTP 200 OK:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/shop.html
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/checkout.html
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/orders.html
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/owner.html
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/css/design-system.css
# 200
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8000/js/api.js
# 200
```

### 2. Backend Automated Test Suite
All 27 unit tests pass without regression:
```bash
./venv/bin/pytest
# ======================== 27 passed, 5 warnings in 8.17s ========================
```

### 3. End-to-End User Journey Verification
Executed complete automated customer-to-kitchen fulfillment lifecycle:
1. Customer authentication (`+919876543210`)
2. Order submission for `Wood-Fired Truffle Tartine` (with `Double Truffle Reserve` variant)
3. Owner authentication (`+919876543211`)
4. Kitchen board progression (`accepted` → `preparing` → `ready` → `mark_as_paid` → `completed`)
5. Customer status verification: Order status successfully reached `completed`.
