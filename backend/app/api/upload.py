import os
from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service

router = APIRouter(prefix="/api/v1/upload", tags=["Document Ingestion"])

# 🛡️ THE NEW SHIELD: Only allow specific file structures
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

@router.post("/")
async def upload_document(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    # 1. Ensure the file actually has a name
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")

    # 2. Extract the file extension and make it lowercase
    _, file_extension = os.path.splitext(file.filename.lower())

    # 3. 🛡️ FAIL FAST: Check the file structure
    if file_extension not in ALLOWED_EXTENSIONS:
        # 415 is the official HTTP status code for "Unsupported Media Type"
        raise HTTPException(
            status_code=415, 
            detail="File structure is not supported. Please upload PDF, DOCX, or TXT files."
        )

    try:
        # Read the file into memory
        file_bytes = await file.read()
        
        # Send it to the engine
        chunks_saved = ingestion_service.process_file(
            file_bytes=file_bytes, 
            filename=file.filename, 
            tenant_id=tenant_id
        )
        
        return {
            "status": "success", 
            "message": f"Successfully processed and embedded {chunks_saved} chunks.",
            "filename": file.filename
        }
        
    except FileExistsError as fee:
        # Catch our duplicate shield from earlier
        raise HTTPException(status_code=409, detail=str(fee))
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))