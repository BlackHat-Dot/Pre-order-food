# Pre-order Food Backend (FastAPI)

Production-grade backend for a pre-order food marketplace:
- **FastAPI** REST API
- **SQLite (current default)** + SQLAlchemy ORM + **Alembic migrations**
- **Redis** caching
- **JWT auth** (access+refresh) with **RBAC** (customer, shop_owner, admin)
- Optional integrations: **S3** uploads, **Twilio** SMS, **Razorpay** payments, **Sentry**
- Dockerized and deployable

> Current setup uses SQLite for simplicity. PostgreSQL env vars are kept so you can switch back later by only changing `DATABASE_URL`.

## Architecture
- `app/main.py`: FastAPI app + routers + middleware
- `app/core/`: settings, security, dependencies, logging
- `app/db/`: async SQLAlchemy session + base
- `app/models/`: normalized DB schema
- `app/schemas/`: Pydantic request/response schemas
- `app/crud/`: DB access layer
- `app/services/`: integrations (S3/Twilio/Razorpay), caching, domain services
- `app/api/`: versioned routers (`/api/v1`)
- `alembic/`: migrations
- `tests/`: pytest suite

## Local development (Windows + VS Code)

Use the **project virtualenv** (`venv`). In VS Code: pick interpreter `.\venv\Scripts\python.exe` — this is already set in `.vscode/settings.json`.

1. Install dependencies:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

2. Create SQLite data folder and migrate:

```powershell
mkdir data -Force
.\venv\Scripts\python.exe -m alembic upgrade head
```

3. Run the API (either **Run and Debug → “Uvicorn: app.main”** from `.vscode/launch.json`, or CLI):

```powershell
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Swagger: `http://127.0.0.1:8000/docs`. Use **SQLite** defaults in `.env` (`DATABASE_URL`). Redis is optional: if Redis is down, caching/rate-limit degrade gracefully.

## Quickstart (Docker)
1. Copy env:

```bash
cp .env.example .env
```

2. Run:

```bash
docker-compose up --build
```

3. Open Swagger:
- `http://localhost:8000/docs`

## Core workflow
- Register customer → login
- Register shop owner → login → create shop → add menu items/variants
- Customer browses shops/menu → creates order → pays (Razorpay mock if keys absent)
- Shop updates order status (pending → accepted → preparing → ready → completed)

## Tests

```bash
pytest -q
```

## Deployment (Railway/Render)
- Use the included `Dockerfile`
- Configure env variables from `.env.example`

### Railway Deployment (Recommended)

1. **Connect Git repo** to Railway project
2. **Add PostgreSQL database**:
   - Railway dashboard → "+ Add" → "Database" → "PostgreSQL"
   - Railway automatically sets `DATABASE_URL` in your environment
3. **Verify variables**:
   - Check Railway "Variables" panel has `DATABASE_URL` set (auto-created by PostgreSQL add-on)
   - Add other optional vars: `JWT_SECRET_KEY`, `SENTRY_DSN`, etc.
4. **Deploy**:
   - Push to Git → Railway auto-deploys using `Dockerfile`
   - Monitor logs at Railway dashboard
5. **Test**:
   - Visit `https://<your-railway-domain>/health`
   - Swagger UI: `https://<your-railway-domain>/docs`

### Local Testing with Railway Config

For local testing with PostgreSQL (instead of SQLite):

```powershell
# Install PostgreSQL async driver
pip install asyncpg

# Create .env with PostgreSQL
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/preorder_db
```

Then run:
```powershell
uvicorn app.main:app --reload
```

### Troubleshooting Railway Deployment

**Error: "Could not parse SQLAlchemy URL"**
- Cause: `DATABASE_URL` not set in Railway Variables
- Fix: Add PostgreSQL database add-on (auto-sets DATABASE_URL) or manually set it

**Error: "connection refused"**
- Cause: App running before database is ready
- Fix: Railway health check will retry; ensure PostgreSQL is in Variables

**Error: "module not found" or import errors**
- Cause: Missing dependencies in production
- Fix: Use `requirements-production.txt` (includes `asyncpg`); Dockerfile handles this

**Health check failing**
- Monitor: Railway "Logs" tab shows `/health` requests
- App recovery: Railway auto-restarts failed deployments (5 retries max)
- For production, switch `DATABASE_URL` to PostgreSQL and provision Redis
