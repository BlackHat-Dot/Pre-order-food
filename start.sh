#!/bin/bash
# Railway Production Startup Script
# Runs frontend (served from built dist) and backend

set -e

export NODE_ENV=production
export PORT=${PORT:-5000}

echo "=================================="
echo "Pre-Order Food: Railway Deployment"
echo "=================================="
echo "Frontend port: $PORT"
echo "Backend port: 8000"

# Install Python dependencies
echo "Installing Python dependencies..."
python -m pip install -q -r requirements-production.txt 2>/dev/null || pip install -q -r requirements-production.txt

# Install Node dependencies
echo "Installing Node dependencies..."
cd order-delight-main
npm ci --omit=dev --prefer-offline --no-audit
cd ..

# Build frontend
echo "Building frontend..."
cd order-delight-main
npm run build
cd ..

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    alembic upgrade head || true
fi

# Create Node.js server to serve frontend + proxy backend
cat > server.js << 'EOF'
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
EOF

# Start backend and frontend server concurrently
echo "Starting services..."
exec concurrently \
  "uvicorn app.main:app --host 127.0.0.1 --port 8000" \
  "node server.js"

