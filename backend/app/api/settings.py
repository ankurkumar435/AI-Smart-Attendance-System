from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import SystemSetting, User
from app.schemas.schemas import SystemSettingsUpdate
from app.auth.dependencies import require_role
from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

@router.get("")
def get_system_settings(user: User = Depends(require_role(["admin", "teacher"])), db: Session = Depends(get_db)):
    match_thr = db.query(SystemSetting).filter(SystemSetting.key == "face_match_threshold").first()
    att_thr = db.query(SystemSetting).filter(SystemSetting.key == "attendance_threshold").first()

    return {
        "face_match_threshold": float(match_thr.value) if match_thr else settings.FACE_MATCH_THRESHOLD,
        "attendance_threshold": float(att_thr.value) if att_thr else settings.ATTENDANCE_THRESHOLD,
        "database_path": settings.DATABASE_PATH,
        "app_env": settings.APP_ENV,
        "backend_host": settings.BACKEND_HOST,
        "backend_port": settings.BACKEND_PORT
    }

@router.put("")
def update_system_settings(
    payload: SystemSettingsUpdate,
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    if payload.face_match_threshold is not None:
        rec = db.query(SystemSetting).filter(SystemSetting.key == "face_match_threshold").first()
        if not rec:
            rec = SystemSetting(key="face_match_threshold", value=str(payload.face_match_threshold), description="Cosine similarity threshold for recognition")
            db.add(rec)
        else:
            rec.value = str(payload.face_match_threshold)
        settings.FACE_MATCH_THRESHOLD = payload.face_match_threshold

    if payload.attendance_threshold is not None:
        rec = db.query(SystemSetting).filter(SystemSetting.key == "attendance_threshold").first()
        if not rec:
            rec = SystemSetting(key="attendance_threshold", value=str(payload.attendance_threshold), description="Minimum percentage required for warning")
            db.add(rec)
        else:
            rec.value = str(payload.attendance_threshold)
        settings.ATTENDANCE_THRESHOLD = payload.attendance_threshold

    db.commit()
    return {"success": True, "message": "System settings updated successfully"}
