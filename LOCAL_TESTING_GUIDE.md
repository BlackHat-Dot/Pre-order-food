# Local Testing & Railway Deployment Guide

## ✅ Setup Status

- [x] Frontend built (dist/ folder created)
- [x] Node packages installed
- [x] Python packages already installed
- [x] Start scripts created

## Option 1: Simple Local Testing (Recommended for Windows)

### Terminal 1 - Start Backend
```bash
python main.py
```
Output should show:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

### Terminal 2 - Serve Frontend
```bash
cd order-delight-main
npm run start
```
Output should show:
```
  ➜  Local:   http://localhost:5000/
```

**Then visit**: http://localhost:5000

---

## Option 2: Production Test (Using Node.js Express Proxy)

For a more realistic test that mirrors Railway setup:

### Terminal 1 - Start Backend
```bash
python main.py
```

### Terminal 2 - Start Express Proxy + Frontend
```bash
# Create server.js
cd C:\Users\madhavan\Downloads\Pre-order-food

# Create server.js manually (see below) or copy:
# Paste the code from server.js block below

node server.js
```

**Then visit**: http://localhost:5000

---

## Server.js (Express Proxy)

Create this file: `C:\Users\madhavan\Downloads\Pre-order-food\server.js`

```javascript
const express = require('express');
const path = require('path');
const httpProxy = require('http-proxy');

const app = express();
const port = parseInt(process.env.PORT || '5000');
const distPath = path.join(__dirname, 'order-delight-main/dist');

// API proxy to backend
const apiProxy = httpProxy.createProxyServer({
  target: 'http://localhost:8000',
  changeOrigin: false,
  ws: false,
});

// Serve static files from dist
app.use(express.static(distPath, { 
  maxAge: '1d',
  etag: false 
}));

// Proxy all /api requests to backend
app.use('/api', apiProxy);
app.use('/health', apiProxy);

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
apiProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.status(502).json({ error: 'Backend service unavailable' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on http://0.0.0.0:${port}`);
});
```

---

## Rebuild Frontend After Changes

After modifying React components:

```bash
cd order-delight-main
npm run build
```

Then restart Express server (Terminal 2) to load new build.

---

## Railway Deployment (Once Tested Locally)

### Prerequisites
1. GitHub repo with all changes committed
2. Railway account at [railway.app](https://railway.app)
3. PostgreSQL add-on set up in Railway

### Steps

1. **Create Railway Project**
   - Login to railway.app
   - New project → GitHub repo → Select your branch

2. **Add PostgreSQL Add-on**
   - Railway auto-sets `DATABASE_URL`

3. **Set Environment Variables**
   ```
   JWT_SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_urlsafe(32))">
   ENV=production
   ENABLE_ADMIN_SEED=false
   LOG_LEVEL=INFO
   ```

4. **Deploy**
   ```bash
   git push origin main
   ```
   Railway auto-deploys when connected to GitHub

5. **Verify**
   - Visit Railway URL
   - Should see React frontend
   - Check `/health` endpoint
   - Test API calls

---

## Troubleshooting

### Issue: "npm: command not found"
- Make sure Node.js is installed
- Check PATH includes Node: `node --version`

### Issue: "Module not found: express"
- Install Node packages: `npm install` in `order-delight-main/`

### Issue: "Backend connection refused"
- Ensure `python main.py` is running in Terminal 1
- Check port 8000 is available: `netstat -ano | findstr 8000`

### Issue: Frontend shows blank page
- Check browser console for errors
- Verify `dist/` folder exists: `ls order-delight-main/dist/`
- Rebuild frontend: `cd order-delight-main && npm run build`

### Issue: API calls fail
- Backend must be running on localhost:8000
- Express proxy must be running on localhost:5000
- Check network tab in browser DevTools

---

## Files Created/Modified

| File | Purpose |
|------|---------|
| `start.sh` | Railway production startup |
| `start.bat` | Windows local test script |
| `test-local.bat` | Build frontend only |
| `server.js` | Express proxy (create manually) |
| `Procfile` | Railway entry point |
| `order-delight-main/package.json` | Added express, http-proxy |
| `order-delight-main/vite.config.ts` | Dynamic PORT support |
| `main.py` | Backend on localhost:8000 |

---

## Quick Test Checklist

```
[ ] Node packages installed: npm list express
[ ] Frontend built: ls order-delight-main/dist/
[ ] Backend runs: python main.py
[ ] Frontend runs: cd order-delight-main && npm run start
[ ] Proxy works: curl http://localhost:5000/health
[ ] API works: curl http://localhost:5000/api/v1/...
[ ] Environment variables set in Railway
[ ] Database URL set in Railway
[ ] GitHub repo connected to Railway
[ ] Deployment successful
```

---

## Next Steps

1. Test locally using Option 1 or 2
2. Ensure everything works
3. Push to GitHub
4. Railway auto-deploys
5. Visit Railway URL to verify

For detailed info, see:
- `RAILWAY_SETUP.md` - Complete guide
- `RAILWAY_ENV_SETUP.md` - Environment variables
- `RAILWAY_QUICK_REFERENCE.md` - Quick reference
