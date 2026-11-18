import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

import logging
from app.config import settings
from app.database.connection import engine, Base, SessionLocal
from app.models.models import SystemSetting
from app.security.encryption import get_or_create_encryption_key

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("attendance.init")

def init_db():
    """
    Initializes database tables, directories, encryption key, and system settings.
    No hard-coded demo credentials or demo data are created.
    """
    # 1. Create local directories
    for d in [settings.DATA_DIR, settings.BACKUP_DIR, settings.LOG_DIR]:
        os.makedirs(d, exist_ok=True)

    # 2. Ensure AES-256 encryption key exists
    get_or_create_encryption_key()

    # 3. Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info(f"Database tables initialized cleanly at: {settings.DATABASE_PATH}")

    # 4. Initialize system settings if not present
    db = SessionLocal()
    try:
        match_thr = db.query(SystemSetting).filter(SystemSetting.key == "face_match_threshold").first()
        if not match_thr:
            db.add(SystemSetting(
                key="face_match_threshold", 
                value=str(settings.FACE_MATCH_THRESHOLD), 
                description="Face recognition cosine similarity threshold"
            ))
            
        att_thr = db.query(SystemSetting).filter(SystemSetting.key == "attendance_threshold").first()
        if not att_thr:
            db.add(SystemSetting(
                key="attendance_threshold", 
                value=str(settings.ATTENDANCE_THRESHOLD), 
                description="Attendance low warning threshold percentage"
            ))
            
        db.commit()
        logger.info("System settings initialized.")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
