import os
import logging
from logging.handlers import RotatingFileHandler
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings
from app.database.init_db import init_db

# Configure local application logging
os.makedirs(settings.LOG_DIR, exist_ok=True)
log_file = os.path.join(settings.LOG_DIR, "application.log")

file_handler = RotatingFileHandler(
    log_file, maxBytes=10*1024*1024, backupCount=5, encoding="utf-8"
)
console_handler = logging.StreamHandler()
log_formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
file_handler.setFormatter(log_formatter)
console_handler.setFormatter(log_formatter)

root_logger = logging.getLogger()
root_logger.setLevel(logging.INFO)
root_logger.addHandler(file_handler)
root_logger.addHandler(console_handler)

logger = logging.getLogger("attendance.main")

app = FastAPI(
    title="AI Smart Student Attendance System API",
    description="Local-first intelligent student attendance system using encrypted facial biometrics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware configuration for frontend communication
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    logger.info("Starting AI Smart Attendance Backend on local machine...")
    logger.info(f"Local SQLite database target: {settings.DATABASE_PATH}")
    # Automatic first-run database and encryption initialization
    init_db()
    logger.info("Database schema and encryption security ready.")

# Global Exception Handler to avoid leaking internal tracebacks
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact the system administrator."}
    )

# Include API routers
from app.api.auth import router as auth_router
from app.api.students import router as students_router
from app.api.teachers import router as teachers_router
from app.api.subjects import router as subjects_router
from app.api.classes import router as classes_router
from app.api.face import router as face_router
from app.api.attendance import router as attendance_router
from app.api.reports import router as reports_router
from app.api.backup import router as backup_router
from app.api.settings import router as settings_router

app.include_router(auth_router)
app.include_router(students_router)
app.include_router(teachers_router)
app.include_router(subjects_router)
app.include_router(classes_router)
app.include_router(face_router)
app.include_router(attendance_router)
app.include_router(reports_router)
app.include_router(backup_router)
app.include_router(settings_router)

@app.get("/api/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "database_storage": "local_sqlite",
        "biometrics_encryption": "AES-256-GCM"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.BACKEND_HOST, port=settings.BACKEND_PORT, reload=True)
