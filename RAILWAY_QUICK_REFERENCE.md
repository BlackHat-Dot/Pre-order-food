# Railway Production Setup - Quick Reference

## Pre-Deployment Checklist

- [ ] Ensure `requirements-production.txt` has all Python dependencies
- [ ] Verify `DATABASE_URL` is set in Railway (auto if using PostgreSQL add-on)
- [ ] Verify JWT_SECRET_KEY is set and secure
- [ ] Run migrations locally: `alembic upgrade head`
- [ ] Build frontend locally: `cd order-delight-main && npm run build`
- [ ] Test locally: `bash start.sh` (should work before pushing)

## Files Modified/Created

| File | Purpose |
|------|---------|
| `order-delight-main/package.json` | Added concurrently, express, http-proxy; updated scripts |
| `order-delight-main/vite.config.ts` | Added dynamic PORT support for production |
| `main.py` | Updated to run backend on localhost:8000 only |
| `Procfile` | Updated to use `start.sh` |
| `start.sh` | ✨ NEW - Production startup script |
| `RAILWAY_SETUP.md` | ✨ NEW - Complete deployment guide |

## How It Works


```
1. Railway starts with Procfile: web: bash start.sh
2. start.sh:
   - Installs Python + Node dependencies
   - Builds React frontend (vite build)
   - Runs migrations (alembic upgrade head)
   - Starts backend: uvicorn localhost:8000
   - Starts frontend: Node Express server on PORT
3. Express server:
   - Serves React dist/ folder as static files
   - Proxies /api/* to backend at localhost:8000
   - Falls back to index.html for SPA routes
4. Result:
   - Public URL shows React frontend
   - API calls automatically routed to backend
   - Single Railway service for both
```

## Key Features

✅ **Single Railway Service**: One container runs both frontend + backend
✅ **Public Frontend**: React UI on railway domain
✅ **Internal Backend**: FastAPI on localhost (not exposed)
✅ **Production-Ready**: Concurrently runs both services
✅ **No CORS Issues**: Express proxy handles all routing
✅ **Build Optimized**: Frontend built with Vite production build
✅ **Database Migrations**: Auto-run on startup
✅ **Environment Variables**: Railway-compatible setup

## Testing Locally Before Deploy

```bash
# 1. Install deps and build
cd order-delight-main
npm ci
npm run build
cd ..

# 2. Run the complete setup (should see both services start)
bash start.sh

# 3. In another terminal, test endpoints:
curl http://0.0.0.0:5000/          # Frontend (HTML)
curl http://localhost:8000/health  # Backend health check
curl http://0.0.0.0:5000/api/v1/... # Via proxy
```

## Environment Variables for Railway

```
# Required
DATABASE_URL=postgresql://... (auto-set if using PostgreSQL add-on)
JWT_SECRET_KEY=your-secret-key-min-32-chars

# Recommended
ENV=production
ENABLE_ADMIN_SEED=false

# Optional
BACKEND_PORT=8000 (default: 8000)
LOG_LEVEL=INFO
```

## Troubleshooting

**Problem: start.sh fails**
```bash
# Make sure it's executable
chmod +x start.sh

# Test locally
bash start.sh
```

**Problem: Dependencies not installed**
- Check `requirements-production.txt` exists and has all deps
- Check `order-delight-main/package.json` for Node deps

**Problem: Frontend doesn't load**
- Verify `npm run build` succeeds locally
- Check `order-delight-main/dist/` exists
- Verify Express server is running

**Problem: API calls fail**
- Check backend is on localhost:8000
- Verify proxy in `server.js` is correct
- Check frontend uses `/api` not full URLs

## Post-Deployment

Once deployed to Railway:

1. **Visit your URL**: https://your-railway-domain.up.railway.app
2. **Verify frontend loads**: You should see React app
3. **Check backend**: Visit `/health` endpoint
4. **Monitor logs**: `railway logs` via Railway CLI

## Rollback

If deployment fails:
1. Check Railway logs for errors
2. Ensure all env vars are set
3. Run migrations manually if needed:
   ```bash
   alembic upgrade head
   ```
4. Rebuild frontend if assets are corrupted:
   ```bash
   cd order-delight-main && npm run build
   ```

## Next Deploy

Just push to main/master branch:
```bash
git add .
git commit -m "Update: Production setup for Railway"
git push origin main
# Railway auto-detects and redeploys
```

## Support Resources

- [Railway Documentation](https://docs.railway.app)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/concepts/)
- [Vite Build Guide](https://vitejs.dev/guide/build.html)
- Check logs: `railway logs`
