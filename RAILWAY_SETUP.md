# Railway Deployment Guide - Frontend + Backend Single Service

## Overview
This setup runs both your React/Vite frontend and FastAPI backend in a single Railway service:
- **Frontend**: Runs on the public Railway PORT (default 5000)
- **Backend**: Runs internally on localhost:8000
- **Proxy**: Frontend requests to /api are proxied to the backend

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Railway Public URL (PORT)                 │
├─────────────────────────────────────────────────────┤
│  Node.js Server (Express)                           │
│  - Serves React frontend from dist/                 │
│  - Proxies /api/* → localhost:8000                  │
├─────────────────────────────────────────────────────┤
│  FastAPI Backend (localhost:8000)                   │
│  - Not publicly exposed                             │
│  - Only accessible from localhost                   │
└─────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Prerequisites
- Railway account with a database add-on (PostgreSQL recommended)
- Git repository pushed to GitHub/GitLab

### 2. Environment Variables (Set in Railway)

```env
# Database (auto-set by Railway if using PostgreSQL add-on)
DATABASE_URL=postgresql://...

# App Config
ENV=production
JWT_SECRET_KEY=your-secure-key-at-least-32-chars
ENABLE_ADMIN_SEED=false

# Optional: Backend port (default: 8000)
BACKEND_PORT=8000
```

### 3. Deploy to Railway

**Option A: Via Railway CLI**
```bash
railway up
```

**Option B: Via Dashboard**
1. Create new service
2. Connect GitHub repository
3. Set environment variables
4. Railway auto-detects Node.js + Python and runs `start.sh`

### 4. Post-Deployment Verification

Visit your Railway public URL and verify:
- ✅ Frontend loads (React UI visible)
- ✅ Backend responds: `https://your-url.railway.app/health`
- ✅ API calls work from frontend

## File Structure

```
Pre-order-food/
├── Procfile                          # Railroad entrypoint (web: bash start.sh)
├── start.sh                          # Production startup script
├── main.py                           # Backend entrypoint
├── requirements-production.txt       # Python dependencies
├── alembic/                          # Database migrations
│   └── versions/
├── app/                              # FastAPI application
│   ├── main.py                       # CORS enabled
│   ├── core/
│   ├── api/
│   └── models/
└── order-delight-main/               # React/Vite frontend
    ├── package.json                  # Includes server deps + build scripts
    ├── vite.config.ts                # Configured for dynamic PORT
    ├── dist/                         # Built frontend (generated)
    └── src/
        └── lib/
            └── api.ts                # Uses /api prefix (no localhost URLs)
```

## Key Configuration Changes

### 1. Package.json Scripts
```json
{
  "scripts": {
    "build": "vite build",
    "prod-start": "concurrently \"npm run server\" \"npm run frontend\"",
    "server": "cd .. && uvicorn app.main:app --host 127.0.0.1 --port 8000",
    "frontend": "vite preview --host 0.0.0.0 --port ${PORT:-5000}"
  },
  "dependencies": {
    "express": "^4.18.2",
    "http-proxy": "^1.18.1",
    "concurrently": "^9.0.0"
  }
}
```

### 2. Vite Config (vite.config.ts)
- Dynamic port: `const port = parseInt(process.env.PORT || "5000", 10)`
- Preview config respects PORT
- Proxy: `/api` → `http://localhost:8000`

### 3. Backend (main.py)
```python
# Runs on localhost (internal only)
port = int(os.environ.get("BACKEND_PORT", "8000"))
host = "127.0.0.1"  # Not exposed publicly
uvicorn.run(app, host=host, port=port)
```

### 4. Frontend API Client (api.ts)
```typescript
// Uses /api prefix - no hardcoded localhost URLs
export const API_BASE_URL: string = import.meta.env.SSR
  ? "http://127.0.0.1:8000"  // Server-side
  : "";                        // Browser-side (uses proxy via /)
```

### 5. Start Script (start.sh)
1. Installs dependencies
2. Builds frontend
3. Runs migrations
4. Starts backend + frontend server concurrently

## Database Migrations

Railway will run migrations automatically if `DATABASE_URL` is set:

```bash
alembic upgrade head
```

To create new migration:
```bash
alembic revision --autogenerate -m "description"
```

## Troubleshooting

### Issue: "502 Bad Gateway"
- Check if backend started: `curl http://localhost:8000/health` (from Railway logs)
- Verify `DATABASE_URL` is set
- Check FastAPI errors in Railway logs

### Issue: Frontend shows blank page
- Verify `dist/` folder exists (run `npm run build` locally first)
- Check if frontend server is running on PORT
- Check browser console for CORS errors (shouldn't happen with this setup)

### Issue: API calls fail from frontend
- Verify backend is on localhost:8000
- Check Express proxy in `server.js`
- Ensure frontend uses `/api` prefix, not full URLs
- Check Railway logs for proxy errors

### View Logs
```bash
railway logs
```

## Development vs Production

**Development (Local)**
```bash
cd order-delight-main
npm run dev          # Vite dev server with hot reload
# In separate terminal:
python main.py       # FastAPI backend
```

**Production (Railway)**
```bash
bash start.sh        # Runs via Procfile
```

## Performance Tips

1. **Caching**: Frontend dist has long cache-time headers
2. **Compression**: Express serves gzipped assets
3. **No proxying overhead**: Backend runs locally, minimal latency
4. **Build optimization**: Vite production build is already optimized

## Security Notes

- ✅ Backend not exposed publicly (localhost only)
- ✅ CORS configured properly
- ✅ JWT tokens in localStorage (default behavior)
- ⚠️ Change `JWT_SECRET_KEY` in production
- ⚠️ Disable `ENABLE_ADMIN_SEED` in production

## Next Steps

1. **Test locally**: Run `bash start.sh` to test the complete setup
2. **Deploy**: Push to Git, Railway auto-deploys
3. **Monitor**: Check Railway dashboard for logs and metrics
4. **Scale**: Adjust RAM/CPU in Railway settings if needed

## Support

For issues:
1. Check Railway logs: `railway logs`
2. Verify environment variables in Railway dashboard
3. Test backend directly: `curl https://your-url.railway.app/health`
4. Test frontend loads at root URL
