#!/bin/bash
# Railway Production Startup Script
# Runs frontend and backend concurrently (install/build handled by nixpacks)

set -e

export NODE_ENV=production
export PORT=${PORT:-5000}
export BACKEND_PORT=${BACKEND_PORT:-8000}
export PYTHONPATH="${PYTHONPATH}:/app"

cd /app

echo "=================================="
echo "Pre-Order Food: Railway Deployment"
echo "=================================="
echo "Frontend port: $PORT"
echo "Backend port: $BACKEND_PORT"
echo "Working directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo ""

if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."
    cd /app
    PYTHONPATH="/app" alembic upgrade head
    migration_status=$?
    
    if [ $migration_status -ne 0 ]; then
        echo "⚠ Migration failed with status $migration_status"
        echo "  Attempting migration reset on stale database records..."
        PYTHONPATH="/app" python reset_migrations.py
        echo ""
        echo "Retrying database migrations after reset..."
        PYTHONPATH="/app" alembic upgrade head
        migration_status=$?
        
        if [ $migration_status -ne 0 ]; then
            echo "✗ Migration failed after reset. Continuing with startup."
        else
            echo "✓ Migration succeeded after reset."
        fi
    else
        echo "✓ Migrations completed successfully"
    fi
    echo ""
fi

cd /app

echo "Setting up Express proxy server..."
cat > server.js << 'EOF'
const express = require('express');
const path = require('path');
const httpProxy = require('http-proxy');

const app = express();
const port = parseInt(process.env.PORT || '5000', 10);
const backendPort = parseInt(process.env.BACKEND_PORT || '8000', 10);
const distPath = path.join(__dirname, 'order-delight-main/dist');

const apiProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${backendPort}`,
  changeOrigin: false,
  ws: false,
});

app.use(express.static(distPath, {
  maxAge: '1d',
  etag: false,
}));

app.use('/api', apiProxy);
app.use('/health', apiProxy);

app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

apiProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.status(502).json({ error: 'Backend service unavailable' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on http://0.0.0.0:${port}`);
});
EOF

if [ ! -f "/app/node_modules/.bin/concurrently" ]; then
  echo "WARNING: concurrently binary not found in /app/node_modules/.bin. Installing root Node dependencies..."
  cd /app
  npm ci --omit=dev --prefer-offline --no-audit
fi

if [ ! -f "/app/node_modules/.bin/concurrently" ]; then
  echo "ERROR: concurrently binary is missing at /app/node_modules/.bin/concurrently after install"
  exit 1
fi

exec /app/node_modules/.bin/concurrently \
  "cd /app && PYTHONPATH=/app BACKEND_PORT=$BACKEND_PORT python main.py" \
  "cd /app && node server.js"

