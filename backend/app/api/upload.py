"""
Upload API — stream-hashed file uploads to prevent memory spikes.
"""
import os
import hashlib
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service
from app.core.logger import logger

router = APIRouter(prefix="/api/v1/upload", tags=["Document Management"])

TEMP_DIR = "/tmp/actionrag_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

# 64KB chunks for stream hashing
HASH_CHUNK_SIZE = 65536


@router.post("/")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    ingestion_service: IngestionService = Depends(get_ingestion_service),
):
    try:
        # 1. Stream-hash: compute SHA-256 WITHOUT loading entire file into memory
        sha256 = hashlib.sha256()
        safe_ext = os.path.splitext(file.filename)[1]

        # Write to a temp file AND hash simultaneously
        temp_path = os.path.join(TEMP_DIR, f"uploading_{file.filename}")
        with open(temp_path, "wb") as f:
            while True:
                chunk = await file.read(HASH_CHUNK_SIZE)
                if not chunk:
                    break
                sha256.update(chunk)
                f.write(chunk)

        file_hash = sha256.hexdigest()

        # 2. Check Database for this exact fingerprint
        if ingestion_service.db.document_exists(file_hash=file_hash, tenant_id=tenant_id):
            os.remove(temp_path)  # Clean up temp file
            raise HTTPException(status_code=409, detail="Exact file content already exists. Duplicate rejected.")

        # 3. Rename temp file to hash-based filename
        file_path = os.path.join(TEMP_DIR, f"{file_hash}{safe_ext}")
        os.rename(temp_path, file_path)

        # 4. Fire and Forget: Send to the Background Worker
        background_tasks.add_task(
            ingestion_service.process_file_background,
            file_path=file_path,
            filename=file.filename,
            file_hash=file_hash,
            tenant_id=tenant_id,
        )

        logger.info(f"Upload accepted: '{file.filename}' (hash={file_hash[:12]}...)")

        # 5. Instantly return success to the frontend
        return {
            "status": "processing",
            "message": f"'{file.filename}' is processing in the background.",
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed for '{file.filename}': {e}")
        raise HTTPException(status_code=500, detail=str(e))