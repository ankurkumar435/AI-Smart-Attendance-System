from fastapi import APIRouter, Depends, HTTPException, Body
from typing import List, Dict, Any
from app.auth.dependencies import require_role
from app.models.models import User
from app.services.backup_service import backup_service
from app.schemas.schemas import BackupResponse

router = APIRouter(prefix="/api/backup", tags=["Database Backup & Restore"])

@router.post("/create", response_model=BackupResponse)
def create_backup(user: User = Depends(require_role(["admin"]))):
    try:
        return backup_service.create_backup()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[Dict[str, Any]])
def list_backups(user: User = Depends(require_role(["admin"]))):
    return backup_service.list_backups()

@router.post("/restore")
def restore_backup(
    filename: str = Body(..., embed=True),
    user: User = Depends(require_role(["admin"]))
):
    try:
        return backup_service.restore_backup(filename)
    except FileNotFoundError as fe:
        raise HTTPException(status_code=404, detail=str(fe))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
