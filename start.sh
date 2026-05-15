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

echo "Starting runtime processes..."
echo "Starting backend and frontend SSR services..."

if [ ! -d "/app/node_modules" ]; then
    echo "Installing root Node dependencies..."
    npm install --ignore-scripts
fi

if [ ! -d "/app/order-delight-main/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd /app/order-delight-main
    npm install
    cd /app
fi

chmod +x /app/node_modules/.bin/concurrently || true

exec node ./node_modules/concurrently/dist/bin/concurrently.js \
  "cd /app/order-delight-main && npm start" \
  "cd /app && PYTHONPATH=/app uvicorn app.main:app --host 0.0.0.0 --port $BACKEND_PORT"