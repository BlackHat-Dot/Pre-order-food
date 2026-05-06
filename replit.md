# PreOrder Food App

A full-stack food pre-ordering platform where customers browse shops, place orders ahead of time, and earn loyalty points.

## Run & Operate

- **Backend**: `PORT=8000 python3 -m uvicorn app.main:app --host localhost --port 8000 --reload`
- **Frontend**: `cd order-delight-main && npm run dev` (port 5000)
- **Required env vars**: `DATABASE_URL` (PostgreSQL, set by Replit), `JWT_SECRET_KEY`, `PORT`

## Admin Credentials

| Account | Email | Password |
| :--- | :--- | :--- |
| Personal Super Admin | `superadmin@preorder.local` | `SuperAdmin@2024` |
| Default Admin | `admin@preorder.local` | `Admin@1234` |

Both accounts are seeded on backend startup (`app/main.py`).

## Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy (async), asyncpg, Alembic, Uvicorn
- **Frontend**: React 19, TanStack Router/Query, Tailwind CSS v4, Vite 7, TypeScript, recharts
- **Database**: PostgreSQL (Replit-managed via `DATABASE_URL` secret)
- **Auth**: JWT tokens (python-jose + bcrypt)

## Where things live

- `app/` — FastAPI backend application
  - `app/api/v1/endpoints/` — Route handlers (auth, shops, menu, orders, payments, reviews, loyalty, admin)
  - `app/models/` — SQLAlchemy ORM models
  - `app/crud/` — Database operations
  - `app/core/config.py` — Settings (pydantic-settings)
  - `app/db/session.py` — Async DB engine setup
- `order-delight-main/` — React frontend (TanStack Start)
  - `order-delight-main/src/routes/` — File-based routing
  - `order-delight-main/src/lib/api.ts` — API client (all backend calls + interfaces)
  - `order-delight-main/src/components/` — UI components (shadcn/ui)

## Architecture decisions

- PostgreSQL `sslmode=disable` from Replit's connection string is stripped and passed as asyncpg `ssl=False` connect arg (asyncpg doesn't accept it as a query param)
- All SQLAlchemy DateTime columns use `DateTime(timezone=True)` to work correctly with PostgreSQL's `TIMESTAMPTZ`
- Frontend uses `VITE_API_BASE_URL` env var to point to backend (defaults to `http://127.0.0.1:8000`)
- Default admin seeded on startup: `admin@preorder.local` / `Admin@1234` — personal super admin: `superadmin@preorder.local` / `SuperAdmin@2024`
- Frontend workflow runs on port 5000 (webview); backend runs on port 8000 (console)

## Product

- **Customer**: browse shops, search by cuisine/city, add to cart, pre-order, track status, earn loyalty points
- **Shop owner**: manage shop, menu items, variants, view orders, update order status, view daily analytics
- **Admin**: full platform command center — rich analytics dashboard with recharts charts, user management with search/role change/create, shop management with full details/verification/search, order monitoring, loyalty adjustments

## Admin Panel Features

- **Command Center** (`/admin`): live revenue/orders/signups charts, top shops by revenue, recent orders, status pie chart, category revenue bars
- **Users** (`/admin/users`): search by name/email/phone, filter by role, toggle active, change role, create new user
- **Shops** (`/admin/shops`): search/filter, verify/unverify with one click, toggle active, see owner details, ratings, location
- **Orders** (`/admin/orders`): filter by status, see customer + shop name, revenue summary per view
- **Loyalty** (`/admin/loyalty`): manually credit/debit loyalty points

## User preferences

_None yet_

## Gotchas

- `DATABASE_URL` is runtime-managed by Replit (PostgreSQL) — do not set it manually
- asyncpg rejects `sslmode` as a query param; handled in `app/db/session.py`
- The `@lovable.dev/vite-tanstack-config` package defaults to port 8080 — overridden via `vite.server` config in `order-delight-main/vite.config.ts`
- recharts is loaded; Vite optimizes it on first import

## Pointers

- Backend API docs: `http://localhost:8000/docs`
- Skills: `.local/skills/workflows/SKILL.md`, `.local/skills/deployment/SKILL.md`
