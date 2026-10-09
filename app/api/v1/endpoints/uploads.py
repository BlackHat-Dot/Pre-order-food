from __future__ import annotations

import logging
import mimetypes
import os
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
)
from fastapi.responses import FileResponse

from app.core.deps import rate_limit_sensitive, require_roles
from app.models.user import User

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
    ".bmp",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
CHUNK_SIZE = 64 * 1024  # 64 KB


def is_valid_image_header(data: bytes, ext: str) -> bool:
    if len(data) < 8:
        return False
    if ext == ".png" and data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    if ext in (".jpg", ".jpeg") and data.startswith(b"\xff\xd8\xff"):
        return True
    if ext == ".gif" and (data.startswith(b"GIF87a") or data.startswith(b"GIF89a")):
        return True
    if ext == ".webp" and data.startswith(b"RIFF") and len(data) >= 12 and data[8:12] == b"WEBP":
        return True
    if ext == ".bmp" and data.startswith(b"BM"):
        return True
    return False


@router.post(
    "/image",
    dependencies=[Depends(rate_limit_sensitive)],
)
async def upload_image(
    file: UploadFile = File(...),
    _: Annotated[
        User,
        Depends(require_roles("shop_owner", "admin")),
    ] = None,
) -> dict[str, str]:
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is missing",
        )

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed image extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # Stream chunks to prevent unbounded memory allocation
    chunks: list[bytes] = []
    total_size = 0
    header_checked = False

    while True:
        chunk = await file.read(CHUNK_SIZE)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail="File exceeds maximum size of 10MB",
            )
        chunks.append(chunk)

        if not header_checked and total_size >= 16:
            combined_header = b"".join(chunks)[:16]
            if not is_valid_image_header(combined_header, ext):
                raise HTTPException(
                    status_code=400,
                    detail="File content does not match allowed image format",
                )
            header_checked = True

    if not chunks:
        raise HTTPException(
            status_code=400,
            detail="File is empty",
        )

    if not header_checked:
        combined_header = b"".join(chunks)[:16]
        if not is_valid_image_header(combined_header, ext):
            raise HTTPException(
                status_code=400,
                detail="File content does not match allowed image format",
            )

    filename = f"shop_{uuid.uuid4().hex}{ext}"
    target_path = UPLOAD_DIR / filename

    target_path.write_bytes(b"".join(chunks))

    logger.info("Uploaded shop image: %s (%d bytes)", filename, total_size)

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
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=404,
            detail="Image not found",
        )

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
        headers={
            "Cache-Control": "public, max-age=86400, immutable",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'",
        },
    )
