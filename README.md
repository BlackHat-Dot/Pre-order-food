# PreOrder — Skip the Queue

A production-ready food pre-order platform that allows customers to place orders before arriving, shop owners to manage fulfillment workflows, and administrators to oversee the entire ecosystem.

---

## Features

### Customer Portal

* Browse shops and menus
* Add items to cart
* Apply coupons
* Place dine-in and delivery orders
* Track order status in real time
* Request order cancellation
* Loyalty rewards system
* Order history

### Shop Owner Portal

* Create and manage shops
* Manage menu items and variants
* Toggle shop open/closed status
* Accept incoming orders
* Move orders through fulfillment pipeline:

Pending → Accepted → Preparing → Ready → Completed

* Handle cancellation requests
* View revenue analytics
* Track active and historical orders

### Admin Panel

* Manage users
* Manage shops
* Monitor all orders
* Loyalty management
* Revenue insights
* Platform analytics dashboard
* Order investigation and auditing

---

## Tech Stack

### Frontend

* React
* TypeScript
* TanStack Router
* TanStack Query
* Tailwind CSS
* Vite

### Backend

* FastAPI
* SQLAlchemy
* PostgreSQL
* Alembic
* Redis
* JWT Authentication

### Deployment

* Railway
* PostgreSQL Add-on
* Docker Support

---

## Architecture

```text
Frontend (React)
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

## Order Lifecycle

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

Cancellation Flow:

```text
Customer Requests Cancellation
            │
            ▼
Shop Owner Reviews Request
            │
      ┌─────┴─────┐
      ▼           ▼
Approve      Resume Order
      ▼
Cancelled
```

---

## Local Development

### Backend

Install dependencies:

```bash
pip install -r requirements.txt
```

Run migrations:

```bash
alembic upgrade head
```

Start backend:

```bash
uvicorn app.main:app --reload
```

Backend URL:

```text
http://localhost:8000
```

Swagger:

```text
http://localhost:8000/docs
```

---

### Frontend

Navigate to frontend:

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

## Environment Variables

Required:

```env
DATABASE_URL=
JWT_SECRET_KEY=
```

Optional:

```env
REDIS_URL=
SENTRY_DSN=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
```

---

## Production Deployment (Railway)

### Database

Add Railway PostgreSQL.

Railway automatically creates:

```env
DATABASE_URL=
```

### Start Command

```bash
bash start.sh
```

### Health Check

```text
/health
```

---

## API Documentation

Swagger UI:

```text
https://your-domain/docs
```

OpenAPI:

```text
https://your-domain/openapi.json
```

---

## Testing

```bash
pytest
```

Frontend:

```bash
npm run build
```

---

## Roles

### Customer

* Browse shops
* Place orders
* Earn loyalty points
* Request cancellations

### Shop Owner

* Manage shop operations
* Process orders
* Handle cancellation requests

### Administrator

* Full platform oversight
* User management
* Shop management
* Order monitoring
* Loyalty administration

---

## Project Status

Production-ready full-stack food pre-order platform deployed on Railway with PostgreSQL, JWT authentication, role-based access control, loyalty rewards, cancellation workflow, and multi-role dashboards.
