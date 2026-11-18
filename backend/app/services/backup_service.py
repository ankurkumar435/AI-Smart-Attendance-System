import os
import shutil
import datetime
import logging
from pathlib import Path
from typing import List, Dict, Any
from app.config import settings

logger = logging.getLogger("attendance.backup")

class BackupService:
    @staticmethod
    def create_backup() -> Dict[str, Any]:
        """
        Creates a timestamped snapshot of the local SQLite database.
        Stored exclusively on the local machine in the backups directory.
        """
        db_path = Path(settings.DATABASE_PATH)
        if not db_path.exists():
            raise FileNotFoundError(f"Database file not found at {db_path}")

        timestamp = datetime.datetime.now().strftime("%Y_%m_%d_%H%M%S")
        backup_filename = f"attendance_backup_{timestamp}.db"
        backup_filepath = Path(settings.BACKUP_DIR) / backup_filename

        os.makedirs(settings.BACKUP_DIR, exist_ok=True)
        shutil.copy2(db_path, backup_filepath)
        size_bytes = backup_filepath.stat().st_size

        logger.info(f"Local backup created: {backup_filepath} ({size_bytes} bytes)")

        return {
            "filename": backup_filename,
            "filepath": str(backup_filepath),
            "size_bytes": size_bytes,
            "created_at": datetime.datetime.now(),
            "success": True,
            "message": "Local database backup completed successfully."
        }

    @staticmethod
    def list_backups() -> List[Dict[str, Any]]:
        """
        Lists all available local database backups.
        """
        backup_dir = Path(settings.BACKUP_DIR)
        if not backup_dir.exists():
            return []

        backups = []
        for file in sorted(backup_dir.glob("attendance_backup_*.db"), reverse=True):
            stat = file.stat()
            backups.append({
                "filename": file.name,
                "filepath": str(file),
                "size_bytes": stat.st_size,
                "created_at": datetime.datetime.fromtimestamp(stat.st_mtime).isoformat()
            })
        return backups

    @staticmethod
    def restore_backup(filename: str) -> Dict[str, Any]:
        """
        Restores the SQLite database from a selected local backup.
        Takes a safety backup of the current database before restoring.
        """
        backup_path = Path(settings.BACKUP_DIR) / filename
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file '{filename}' does not exist.")

        db_path = Path(settings.DATABASE_PATH)
        
        # Create safety pre-restore backup if db exists
        if db_path.exists():
            safety_file = Path(settings.BACKUP_DIR) / f"pre_restore_safety_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            shutil.copy2(db_path, safety_file)
            logger.info(f"Created safety pre-restore backup: {safety_file}")

        # Overwrite current db with backup
        shutil.copy2(backup_path, db_path)
        logger.info(f"Restored database from: {backup_path}")

        return {
            "success": True,
            "filename": filename,
            "message": f"Database successfully restored from local backup '{filename}'."
        }

backup_service = BackupService()
