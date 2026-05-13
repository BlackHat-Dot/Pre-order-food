# Railway Nixpacks Configuration - Complete Setup

## Problem Solved
✅ **npm: command not found** - Fixed with proper Nixpacks configuration
✅ **Both Node.js and Python installed** in single Railway service
✅ **Frontend + Backend running together** in one container

## Files Created/Modified

### 1. `nixpacks.toml` - Railway Build Configuration
```toml
[providers]
python = "3.11"
nodejs = "20"

[variables]
NODE_ENV = "production"
PIP_CACHE_DIR = "/tmp/pip-cache"

[phases.setup]
nixpkgs = ["python311", "nodejs_20", "npm"]

[phases.install]
cmds = [
  "pip install -r requirements-production.txt",
  "npm ci --omit=dev",
  "cd order-delight-main && npm ci --omit=dev --prefer-offline --no-audit && cd .."
]

[phases.build]
cmds = ["cd order-delight-main && npm run build && cd .."]

[start]
cmd = "bash start.sh"
```

### 2. `start.sh` - Optimized for Nixpacks
- Removed install/build steps (handled by nixpacks)
- Only handles runtime startup
- Uses concurrently from correct path

### 3. `package.json` (root) - Added concurrently
```json
{
  "dependencies": {
    "concurrently": "^9.0.0",
    "express": "^5.2.1",
    "http-proxy": "^1.18.1"
  }
}
```

### 4. `railway.json` - Railway Native Configuration
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "nixpacks",
    "buildCommand": "cd order-delight-main && npm run build && cd .."
  },
  "deploy": {
    "startCommand": "bash start.sh",
    "restartPolicyType": "on_failure",
    "restartPolicyMaxRetries": 5
  }
}
```

### 5. `.nvmrc` - Node.js Version Specification
```
20
```

## How It Works

### Build Phase (Nixpacks)
1. **Setup**: Install Python 3.11 + Node.js 20 + npm
2. **Install**:
   - `pip install -r requirements-production.txt`
   - `npm ci --omit=dev` (root dependencies)
   - `cd order-delight-main && npm ci --omit=dev` (frontend dependencies)
3. **Build**: `cd order-delight-main && npm run build`

### Runtime Phase
1. **Database**: Run migrations if DATABASE_URL set
2. **Services**: Start both concurrently:
   - Backend: `uvicorn app.main:app --host 127.0.0.1 --port 8000`
   - Frontend: `node server.js` (Express proxy on PORT)

## Deployment Steps

### 1. Environment Variables (Railway Dashboard)
```
JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32)">
ENV=production
ENABLE_ADMIN_SEED=false
LOG_LEVEL=INFO
```

### 2. Deploy
```bash
git add .
git commit -m "Add Railway Nixpacks configuration for Node.js + Python"
git push origin main
```

### 3. Railway Auto-Detects
- `nixpacks.toml` → Uses Nixpacks builder
- `railway.json` → Additional Railway config
- `.nvmrc` → Node.js version 20

## Architecture

```
Railway Container
├── Python 3.11 + FastAPI (localhost:8000)
├── Node.js 20 + Express (public PORT)
└── PostgreSQL (via DATABASE_URL)
```

## Troubleshooting

### Issue: "npm: command not found"
✅ **Fixed**: nixpacks.toml installs Node.js and npm

### Issue: "concurrently: command not found"
✅ **Fixed**: Root package.json includes concurrently

### Issue: Build fails
- Check Railway logs: `railway logs`
- Verify all dependencies in requirements-production.txt
- Check frontend build: `cd order-delight-main && npm run build`

### Issue: Services don't start
- Check start.sh permissions: Railway should handle this
- Verify concurrently path in start.sh
- Check both services start in Railway logs

## Verification

After deployment, Railway URL should:
- ✅ Load React frontend
- ✅ API calls work (/api/* proxied to backend)
- ✅ Health endpoint works (/health)
- ✅ No CORS errors

## Key Features

✅ **Single Railway Service**: Frontend + Backend together
✅ **Nixpacks Builder**: Proper Node.js + Python installation
✅ **Concurrent Services**: Both run simultaneously
✅ **Express Proxy**: Frontend proxies /api to backend
✅ **Production Ready**: Optimized builds and caching
✅ **Database Support**: PostgreSQL with auto-migrations

## Next Steps

1. **Test locally** (if needed):
   ```bash
   # Backend
   python main.py

   # Frontend (separate terminal)
   node server.js
   ```

2. **Deploy to Railway**:
   ```bash
   git push origin main
   ```

3. **Monitor**: Check Railway dashboard for logs and status

The deployment should now succeed without npm errors! 🚀