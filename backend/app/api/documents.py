from fastapi import APIRouter, Depends, HTTPException
from app.services.ingestion_service import IngestionService
from app.core.dependencies import get_ingestion_service

router = APIRouter(prefix="/api/v1/documents", tags=["Document Management"])

@router.delete("/")
def delete_document(
    filename: str,
    tenant_id: str,
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    try:
        success = ingestion_service.delete_file(filename=filename, tenant_id=tenant_id)
        if not success:
            raise HTTPException(status_code=404, detail="Document not found.")
        return {"status": "success", "message": f"Successfully deleted {filename} and all its vectors."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/")
def get_documents(
    tenant_id: str,
    ingestion_service: IngestionService = Depends(get_ingestion_service)
):
    try:
        files = ingestion_service.list_files(tenant_id=tenant_id)
        return {"status": "success", "files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))