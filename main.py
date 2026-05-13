import os
import uvicorn
from app.main import app

if __name__ == "__main__":
    # For Railway: Backend runs internally on localhost:8000
    # Frontend handles routing to /api endpoints which proxy to this server
    port = int(os.environ.get("BACKEND_PORT", "8000"))
    host = "127.0.0.1"  # Internal only - not exposed publicly
    uvicorn.run(app, host=host, port=port)