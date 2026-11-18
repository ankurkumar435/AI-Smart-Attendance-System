import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database.init_db import init_db

def seed_demo_data():
    """
    Initializes clean local database. Demo accounts and fake attendance records have been removed.
    """
    init_db()
    print("[INIT] Fresh, clean local database initialized at ./data/attendance.db")
    print("[INIT] Create your own account directly on the web portal (http://localhost:5173/login).")

if __name__ == "__main__":
    seed_demo_data()
