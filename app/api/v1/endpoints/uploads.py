from __future__ import annotations

import logging
import mimetypes
import os
import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/uploads",
    tags=["Uploads"],
)

UPLOAD_DIR = Path("uploads").resolve()
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".svg",
    ".avif",
    ".bmp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        # Check content type if extension is missing/generic
        content_type = file.content_type or ""
        if not content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed image extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        ext = ".png"

    # Read and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum size of 10MB",
        )

    filename = f"shop_{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / filename

    target_path.write_bytes(contents)

    logger.info("Uploaded shop image: %s (%d bytes)", filename, len(contents))

    return {
        "url": f"/api/v1/uploads/{filename}",
        "filename": filename,
    }


@router.get("/{filename}")
async def get_uploaded_file(
    filename: str,
) -> FileResponse:
    # Security: prevent directory traversal
    safe_name = os.path.basename(filename)
    target_path = UPLOAD_DIR / safe_name

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Image not found",
        )

    mime_type, _ = mimetypes.guess_type(target_path)
    return FileResponse(
        str(target_path),
        media_type=mime_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=86400"},
    )
