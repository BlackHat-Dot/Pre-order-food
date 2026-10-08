#!/bin/bash
set -e

export PORT=${PORT:-8000}
export PYTHONPATH="${PYTHONPATH}:/app"

cd /app

echo "=================================="
echo "Pre-Order Food: Backend API Service"
echo "=================================="
echo "Starting FastAPI backend on port $PORT..."

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"