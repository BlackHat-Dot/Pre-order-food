#!/bin/bash

set -e

export NODE_ENV=production
export PORT=${PORT:-5000}
export BACKEND_PORT=${BACKEND_PORT:-8000}
export PYTHONPATH="${PYTHONPATH}:/app"

cd /app

echo "=================================="
echo "Pre-Order Food: Railway Deployment"
echo "=================================="

echo "Node:"
which node
node -v

echo "NPM:"
which npm
npm -v

echo "Frontend port: $PORT"
echo "Backend port: $BACKEND_PORT"
echo "Working directory: $(pwd)"
echo "Python path: $PYTHONPATH"
echo ""

if [ -n "$DATABASE_URL" ]; then
    echo "Running database migrations..."

    PYTHONPATH="/app" /opt/venv/bin/alembic upgrade head
    migration_status=$?

    if [ $migration_status -ne 0 ]; then
        echo "⚠ Migration failed with status $migration_status"

        if [ -f "/app/reset_migrations.py" ]; then
            echo "Attempting migration reset..."
            PYTHONPATH="/app" python reset_migrations.py

            echo "Retrying migrations..."
            PYTHONPATH="/app" /opt/venv/bin/alembic upgrade head
            migration_status=$?
        fi

        if [ $migration_status -ne 0 ]; then
            echo "✗ Migration failed after retry"
            exit 1
        else
            echo "✓ Migration succeeded after retry"
        fi
    else
        echo "✓ Migrations completed successfully"
    fi

    echo ""
fi

echo "Setting up Express proxy server..."

cat > /app/server.js << 'EOF'
const express = require('express');
const path = require('path');
const httpProxy = require('http-proxy');

const app = express();

app.use(
  '/assets',
  express.static(path.join(process.cwd(), 'order-delight-main/dist/client/assets'))
);

const port = parseInt(process.env.PORT || '5000', 10);
const backendPort = parseInt(process.env.BACKEND_PORT || '8000', 10);

const distPath = path.join(__dirname, 'order-delight-main/dist');

const apiProxy = httpProxy.createProxyServer({
  target: `http://127.0.0.1:${backendPort}`,
  changeOrigin: true,
});

app.use(express.static(distPath));

app.use('/api', (req, res) => {
  apiProxy.web(req, res);
});

app.use('/health', (req, res) => {
  apiProxy.web(req, res);
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

apiProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);

  if (!res.headersSent) {
    res.status(502).json({
      error: 'Backend unavailable'
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✓ Frontend server running on port ${port}`);
});
EOF

echo "Checking concurrently..."

if [ ! -d "/app/node_modules" ]; then
    echo "Installing Node dependencies..."
    npm install --ignore-scripts
fi

chmod +x /app/node_modules/.bin/concurrently || true

echo "Starting backend and frontend..."

exec npx concurrently \
  "cd /app && PYTHONPATH=/app BACKEND_PORT=$BACKEND_PORT python main.py" \
  "cd /app && node server.js"