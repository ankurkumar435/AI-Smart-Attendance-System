import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    APP_ENV: str = "development"
    DATABASE_PATH: str = str(BASE_DIR / "data" / "attendance.db")
    SECRET_KEY: str = "ai-smart-attendance-super-secure-jwt-key-2026-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12 # 12 hours
    FACE_ENCRYPTION_KEY: Optional[str] = None
    FACE_MATCH_THRESHOLD: float = 0.72
    ATTENDANCE_THRESHOLD: float = 75.0
    BACKEND_HOST: str = "127.0.0.1"
    BACKEND_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    BACKUP_DIR: str = str(BASE_DIR / "backups")
    LOG_DIR: str = str(BASE_DIR / "logs")
    DATA_DIR: str = str(BASE_DIR / "data")

    class Config:
        env_file = str(BASE_DIR / ".env")
        env_file_encoding = "utf-8"
        extra = "allow"

settings = Settings()

# Ensure directories exist
for directory in [settings.DATA_DIR, settings.BACKUP_DIR, settings.LOG_DIR]:
    os.makedirs(directory, exist_ok=True)
