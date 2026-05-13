#!/bin/bash
# Railway Production Startup Script
# Runs frontend and backend concurrently (install/build handled by nixpacks)

set -e

export NODE_ENV=production
export PORT=${PORT:-5000}
# Set PYTHONPATH to ensure app package is discoverable
export PYTHONPATH="${PYTHONPATH}:/app"

echo "=================================="
echo "Pre-Order Food: Railway Deployment"
echo "=================================="
echo "Frontend port: $PORT"
echo "Backend port: 8000"
echo "Working directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo ""

# Run migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    cd /app
    alembic upgrade head || echo "Migrations skipped or already applied"
    echo ""
fi

# Ensure we're in the correct directory
cd /app

# Create Node.js server to serve frontend + proxy backend
echo "Setting up Express proxy server..."
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
exec ./node_modules/.bin/concurrently \
  "cd /app && python main.py" \
  "node server.js"

