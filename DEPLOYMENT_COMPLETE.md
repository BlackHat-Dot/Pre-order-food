# Railway Deployment: Production-Ready Setup Complete ✅

## Summary of Changes

Your Pre-Order Food application is now configured for Railway deployment with frontend and backend running together in a single service.

### What Was Changed

#### 1. **Frontend Configuration** 
**File**: `order-delight-main/package.json`
- ✅ Added `concurrently` (run multiple processes)
- ✅ Added `express` (serve frontend)
- ✅ Added `http-proxy` (proxy API requests)
- ✅ New scripts for production startup

**File**: `order-delight-main/vite.config.ts`
- ✅ Dynamic PORT support for Railway (`process.env.PORT`)
- ✅ Preview mode config for production
- ✅ Proxy configuration: `/api` → `localhost:8000`

#### 2. **Backend Configuration**
**File**: `main.py`
- ✅ Changed to run on `127.0.0.1:8000` (internal, not public)
- ✅ Respects `BACKEND_PORT` env variable

**File**: `app/main.py`
- ✅ CORS already enabled (allow_origins=["*"])
- ✅ Health endpoint at `/health`

#### 3. **Railway Configuration**
**File**: `Procfile`
- ✅ Updated to run: `web: bash start.sh`

**File**: `start.sh` (NEW)
- ✅ Installs dependencies (Python + Node)
- ✅ Builds frontend with Vite
- ✅ Runs database migrations
- ✅ Starts backend on localhost:8000
- ✅ Starts frontend server on PUBLIC PORT
- ✅ Proxies all /api requests to backend

#### 4. **Documentation** (NEW)
- ✅ `RAILWAY_SETUP.md` - Complete deployment guide
- ✅ `RAILWAY_QUICK_REFERENCE.md` - Quick reference
- ✅ `RAILWAY_ENV_SETUP.md` - Environment variables setup

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│         Railway Public URL (your-app.railway.app)    │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │  Express.js Server                             │  │
│  │  - Serves React frontend (dist/)               │  │
│  │  - Listens on PORT (default 5000)              │  │
│  │                                                 │  │
│  │  Proxy Rules:                                  │  │
│  │  - /api/* → http://localhost:8000/api/*        │  │
│  │  - /health → http://localhost:8000/health      │  │
│  │  - /* → index.html (SPA fallback)              │  │
│  └────────────────────────────────────────────────┘  │
│                                    ↓                 │
│  ┌────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (localhost:8000)              │  │
│  │  - NOT publicly exposed                        │  │
│  │  - Only accessible from frontend               │  │
│  │  - Connected to PostgreSQL database            │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

---

## How to Deploy

### Step 1: Test Locally (IMPORTANT!)
```bash
# Build and test the complete setup locally
bash start.sh

# Should see output like:
# ✓ Frontend server running on http://0.0.0.0:5000
# INFO: Uvicorn running on http://127.0.0.1:8000
```

Then visit: http://localhost:5000

### Step 2: Prepare Railway
1. Go to [railway.app](https://railway.app)
2. Create new project (or use existing)
3. Add PostgreSQL add-on (sets DATABASE_URL)
4. Connect GitHub repository

### Step 3: Set Environment Variables in Railway
Navigate to: **Project Settings → Variables**

Add these variables:
```
JWT_SECRET_KEY     → Generate: python -c "import secrets; print(secrets.token_urlsafe(32))"
ENV                → production
ENABLE_ADMIN_SEED  → false
LOG_LEVEL          → INFO
```

DATABASE_URL is auto-set by PostgreSQL add-on.

### Step 4: Deploy
```bash
# Push changes to GitHub (if not already pushed)
git add .
git commit -m "Add: Railway production setup with single service"
git push origin main

# Or deploy via Railway CLI
railway deploy
```

Railway will:
1. Run `bash start.sh` (from Procfile)
2. Build frontend
3. Start both services
4. Show URL in Railway dashboard

### Step 5: Verify Deployment
Visit your Railway URL and check:
```
✅ Frontend loads (React UI visible)
✅ /health returns: {"status":"ok","environment":"production",...}
✅ API calls work from frontend
```

---

## Expected Behavior

| Scenario | Result |
|----------|--------|
| Visit `https://your-railway-url.up.railway.app` | Frontend UI loads |
| Click login, make API call | `/api` request proxies to backend |
| Check backend health | `https://your-railway-url.up.railway.app/health` works |
| Direct backend access | Cannot access `localhost:8000` from outside |
| Database operations | Work via FastAPI connected to PostgreSQL |

---

## Files Reference

| File | Status | Purpose |
|------|--------|---------|
| `order-delight-main/package.json` | ✏️ Modified | Scripts + server dependencies |
| `order-delight-main/vite.config.ts` | ✏️ Modified | Dynamic PORT + proxy config |
| `main.py` | ✏️ Modified | Backend localhost:8000 |
| `Procfile` | ✏️ Modified | Points to start.sh |
| `start.sh` | ✨ NEW | Production startup script |
| `RAILWAY_SETUP.md` | ✨ NEW | Deployment guide |
| `RAILWAY_QUICK_REFERENCE.md` | ✨ NEW | Quick reference |
| `RAILWAY_ENV_SETUP.md` | ✨ NEW | Env variables guide |
| `app/main.py` | ✅ OK | CORS already configured |

---

## Troubleshooting

### Problem: `start.sh` command not found
```bash
chmod +x start.sh  # Make executable
bash start.sh      # Test locally
```

### Problem: Frontend doesn't load
1. Check build succeeded: `cd order-delight-main && npm run build`
2. Verify `dist/` folder exists and has files
3. Check Railway logs: `railway logs`

### Problem: API calls fail
1. Verify backend is running: Check logs show `Uvicorn running on...`
2. Test backend directly: `curl localhost:8000/health`
3. Check frontend uses `/api` not full URLs in API calls

### Problem: Database errors
1. Set `DATABASE_URL` in Railway
2. Run migrations: `alembic upgrade head`
3. Check PostgreSQL add-on is active

### View Logs
```bash
# Via Railway CLI
railway logs

# Or via Railway dashboard → Project → Deployments → View Logs
```

---

## Next Steps

1. ✅ **Test locally**
   ```bash
   bash start.sh
   # Visit http://localhost:5000
   ```

2. ✅ **Deploy to Railway**
   ```bash
   git push origin main
   # Railway auto-deploys when connected
   ```

3. ✅ **Verify in Railway**
   - Check logs
   - Visit your Railway URL
   - Test API calls

4. ✅ **Monitor**
   - Railway dashboard for logs
   - Sentry for error tracking (if configured)

---

## Support Documents

For more details, see:
- **Full Setup Guide**: [RAILWAY_SETUP.md](RAILWAY_SETUP.md)
- **Quick Reference**: [RAILWAY_QUICK_REFERENCE.md](RAILWAY_QUICK_REFERENCE.md)
- **Environment Variables**: [RAILWAY_ENV_SETUP.md](RAILWAY_ENV_SETUP.md)

---

## Key Features

✅ **Single Service**: Frontend + Backend in one Railway service
✅ **Public Frontend**: React UI on main domain
✅ **Internal Backend**: FastAPI on localhost (not exposed)
✅ **Zero Config Proxy**: Express automatically routes /api requests
✅ **Production Build**: Vite optimized build for speed
✅ **Database Support**: PostgreSQL with auto-migrations
✅ **CORS Ready**: Already configured for all origins
✅ **Environment Variables**: Railway-compatible setup
✅ **Concurrent Services**: Both run simultaneously without conflicts

---

**Status**: ✅ Ready to deploy to Railway

**Next Action**: Run `bash start.sh` locally to test, then push to GitHub for Railway auto-deploy.
