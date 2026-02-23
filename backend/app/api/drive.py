from fastapi import APIRouter, Form, Depends, HTTPException
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service
from app.infrastructure.google_drive_adapter import GoogleDriveAdapter

router = APIRouter(prefix="/api/v1/drive", tags=["Drive Integration"])

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".txt"}

@router.post("/sync")
def sync_drive_folder(
    folder_id: str = Form(..., description="The ID from the Google Drive URL"),
    tenant_id: str = Form(...),
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    try:
        drive_adapter = GoogleDriveAdapter()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        # 1. Ask Google what files are in the folder
        files = drive_adapter.get_files_in_folder(folder_id)
        if not files:
            return {"status": "success", "message": "No files found in folder.", "processed": 0}
        
        processed_count = 0
        skipped_files = []
        
        # 2. Loop through every file and process it
        for file_meta in files:
            file_id = file_meta['id']
            file_name = file_meta['name']
            
            # Shield 1: Check extension
            if not any(file_name.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS):
                skipped_files.append(f"{file_name} (Unsupported structure)")
                continue
            
            # 3. Download and send to the ActionRAG Engine!
            try:
                file_bytes = drive_adapter.download_file(file_id)
                # This automatically chunks, embeds, and checks for duplicates
                ingestion_service.process_file(file_bytes, file_name, tenant_id)
                processed_count += 1
                
            except FileExistsError:
                # Shield 2: Duplicate file caught by our earlier logic!
                skipped_files.append(f"{file_name} (Already exists in vault)")
            except Exception as e:
                skipped_files.append(f"{file_name} (Failed: {str(e)})")
            
        return {
            "status": "success",
            "message": f"Successfully synced {processed_count} files.",
            "skipped": skipped_files
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))