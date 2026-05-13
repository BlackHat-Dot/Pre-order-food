# 🚀 Railway Deployment Fix - Complete Solution

## Issues Fixed

### ✅ 1. ModuleNotFoundError: No module named 'app'
**Root Cause**: PYTHONPATH not set correctly in Railway container
**Fix**: Added `PYTHONPATH="/app"` to nixpacks.toml and start.sh

### ✅ 2. concurrently: No such file or directory
**Root Cause**: Wrong path to concurrently binary
**Fix**: Changed from `./order-delight-main/node_modules/.bin/concurrently` to `./node_modules/.bin/concurrently`

### ✅ 3. Railway Build/Runtime Setup
**Fix**: Updated nixpacks.toml with proper providers, phases, and variables

### ✅ 4. Startup Script Issues
**Fix**: Updated start.sh with correct working directories and PYTHONPATH

## Files Modified

### `nixpacks.toml`
```toml
[providers]
python = "3.12"  # Matches runtime.txt
nodejs = "20"

[variables]
NODE_ENV = "production"
PIP_CACHE_DIR = "/tmp/pip-cache"
PYTHONPATH = "/app"  # ✅ Fixes import issues

[phases.setup]
nixpkgs = ["python312", "nodejs_20", "npm"]

[phases.install]
cmds = [
  "pip install -r requirements-production.txt",
  "npm ci --omit=dev",  # ✅ Installs concurrently
  "cd order-delight-main && npm ci --omit=dev --prefer-offline --no-audit && cd .."
]

[phases.build]
cmds = ["cd order-delight-main && npm run build && cd .."]

[start]
cmd = "bash start.sh"
```

### `start.sh`
```bash
#!/bin/bash
set -e

export NODE_ENV=production
export PORT=${PORT:-5000}
export PYTHONPATH="${PYTHONPATH}:/app"  # ✅ Fixes Python imports

# Run migrations in correct directory
if [ -n "$DATABASE_URL" ]; then
    cd /app
    alembic upgrade head
fi

cd /app  # ✅ Ensure correct working directory

# Create Express server...

# ✅ Fixed concurrently path
exec ./node_modules/.bin/concurrently \
  "cd /app && python main.py" \
  "node server.js"
```

### `package.json` (root)
```json
{
  "dependencies": {
    "concurrently": "^9.0.0",  // ✅ Required for concurrent execution
    "express": "^5.2.1",
    "http-proxy": "^1.18.1"
  }
}
```

## Architecture Overview

```
Railway Container (/app)
├── Python 3.12 + FastAPI (localhost:8000)
├── Node.js 20 + Express (public PORT)
├── concurrently (from root package.json)
└── PostgreSQL (via DATABASE_URL)
```

## Deployment Steps

### 1. Environment Variables (Railway Dashboard)
```
DATABASE_URL=postgresql://... (auto-set by Railway Postgres)
JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32))">
ENV=production
ENABLE_ADMIN_SEED=false
LOG_LEVEL=INFO
```

### 2. Deploy
```bash
git add .
git commit -m "Fix Railway deployment: Python imports + concurrently path"
git push origin main
```

### 3. Verify Deployment
- **Railway URL**: Should load React frontend
- **API calls**: `/api/*` routes proxy to FastAPI backend
- **Health check**: `/health` endpoint works
- **No errors**: No "ModuleNotFoundError" or "concurrently not found"

## Troubleshooting

### If still getting import errors:
```bash
# Check Railway logs
railway logs

# Verify PYTHONPATH is set
echo $PYTHONPATH  # Should include /app
```

### If concurrently still missing:
```bash
# Check if root package.json was installed
ls -la node_modules/.bin/concurrently

# Verify Railway build logs show npm ci success
```

### If services don't start:
```bash
# Check both processes are running
railway logs | grep -E "(Frontend|backend|uvicorn|node)"
```

## Key Fixes Summary

1. **PYTHONPATH**: Set to `/app` in both nixpacks.toml and start.sh
2. **Working Directory**: Explicitly `cd /app` before running services
3. **Concurrently Path**: Use `./node_modules/.bin/concurrently` (root package.json)
4. **Python Version**: Match runtime.txt (3.12) with nixpacks.toml
5. **Backend Startup**: Use `python main.py` instead of direct uvicorn command

## Expected Behavior

✅ **Single Railway Service**: Frontend + Backend together
✅ **Public Access**: Railway URL serves React UI
✅ **API Proxying**: `/api/*` requests forwarded to FastAPI
✅ **Database**: Auto-migrations on deploy
✅ **Concurrent**: Both services run simultaneously
✅ **No Errors**: Clean deployment without import or missing binary errors

The deployment should now work perfectly! 🎉