# PreOrder — Skip the Queue

A full-stack food pre-order platform that enables customers to order ahead, reduces waiting time at food outlets, and provides comprehensive management tools for shop owners and platform administrators.

**Live Application:** https://web-production-248c50.up.railway.app/

---

## Overview

PreOrder is a multi-role marketplace application designed to streamline the food ordering experience. Customers can place orders before arriving at a restaurant, shop owners can efficiently manage order fulfillment, and administrators can oversee platform operations through dedicated management dashboards.

The platform includes secure authentication, role-based access control, loyalty rewards, coupon management, order cancellation workflows, analytics, and real-time operational management.

---

## Key Features

### Customer Experience

* Browse shops and menu offerings
* Add items and variants to cart
* Apply promotional coupons
* Place dine-in and delivery orders
* Track order progress through fulfillment stages
* Request order cancellations
* Earn and redeem loyalty rewards
* Access complete order history

### Shop Owner Dashboard

* Create and manage shops
* Configure menus, categories, and item variants
* Control shop availability and operating status
* Manage incoming orders
* Process orders through the fulfillment pipeline
* Review and handle cancellation requests
* Monitor revenue and operational metrics
* View active and historical orders

### Administration Panel

* User management
* Shop verification and management
* Platform-wide order monitoring
* Loyalty system administration
* Revenue and business analytics
* Operational auditing and reporting

---

## Technology Stack

### Frontend

* React
* TypeScript
* TanStack Router
* TanStack Query
* Tailwind CSS
* Vite

### Backend

* FastAPI
* SQLAlchemy ORM
* PostgreSQL
* Alembic Migrations
* Redis
* JWT Authentication
* Role-Based Access Control (RBAC)

### Infrastructure & Deployment

* Railway
* PostgreSQL Add-on
* Docker
* Environment-based Configuration

---

## System Architecture

```text
React Frontend
       │
       ▼
FastAPI REST API
       │
       ▼
PostgreSQL Database
       │
       ▼
Redis Cache
```

---

## Order Processing Workflow

```text
Pending
   │
   ▼
Accepted
   │
   ▼
Preparing
   │
   ▼
Ready
   │
   ▼
Completed
```

### Cancellation Workflow

```text
Customer Requests Cancellation
            │
            ▼
Shop Owner Reviews Request
            │
      ┌─────┴─────┐
      ▼           ▼
Approve      Continue Order
      ▼
Cancelled
```

---

## Database Design

The platform is built around a normalized relational database structure consisting of:

* Users
* Shops
* Orders
* Order Items
* Payments
* Loyalty Accounts
* Loyalty Transactions
* Coupons
* Reviews
* Customer Addresses

The schema supports multi-role access, loyalty rewards, payment tracking, order auditing, and coupon redemption workflows.

---

## Local Development

### Backend

Install dependencies:

```bash
pip install -r requirements.txt
```

Apply migrations:

```bash
alembic upgrade head
```

Start the API:

```bash
uvicorn app.main:app --reload
```

API Documentation:

```text
http://localhost:8000/docs
```

---

### Frontend

Navigate to the frontend application:

```bash
cd order-delight-main
```

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

---

## Environment Configuration

### Required Variables

```env
DATABASE_URL=
JWT_SECRET_KEY=
```

### Optional Integrations

```env
REDIS_URL=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
MSG91_AUTH_KEY=
MSG91_TOKEN_AUTH=
MSG91_WIDGET_ID=
SENTRY_DSN=
```

---

## Deployment

### Railway

The application is deployed on Railway using PostgreSQL and environment-based configuration.

Deployment startup command:

```bash
bash start.sh
```

Health endpoint:

```text
/health
```

---

## API Documentation

Swagger UI:

```text
https://web-production-248c50.up.railway.app/docs
```

OpenAPI Specification:

```text
https://web-production-248c50.up.railway.app/openapi.json
```

---

## Testing

Backend:

```bash
pytest
```

Frontend Production Build:

```bash
npm run build
```

---

## User Roles

### Customer

* Browse shops and menus
* Place and track orders
* Earn loyalty rewards
* Manage order history
* Request cancellations

### Shop Owner

* Manage shops and menus
* Process and fulfill orders
* Handle cancellation requests
* Monitor operational performance

### Administrator

* Manage users and shops
* Monitor platform activity
* Analyze revenue and performance metrics
* Administer loyalty programs
* Perform operational audits

---

## Project Highlights

* Multi-role authentication system
* JWT-based authorization
* Full order lifecycle management
* Loyalty rewards and coupon engine
* Order cancellation workflow
* PostgreSQL-backed relational architecture
* FastAPI REST API
* React + TypeScript frontend
* Production deployment on Railway
* Docker-ready infrastructure

---

## Project Status

Production-ready full-stack application actively deployed on Railway, featuring secure authentication, role-based access control, loyalty rewards, coupon management, shop administration, analytics dashboards, and complete order fulfillment workflows.
