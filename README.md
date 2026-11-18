# AI Smart Student Attendance System with Face Recognition

A production-quality, **local-first** university attendance and biometric facial recognition system. All student records, attendance logs, and facial biometric embeddings are stored **exclusively on the local computer** inside an encrypted SQLite database. No external cloud databases (such as Firebase, Supabase, AWS, or Atlas) are used or required.

---

## 1. System Architecture

```text
React + Vite Frontend (Port 5173)
        │  • Client-side Encrypted LocalStorage (cryptoStorage)
        │  • Direct Self-Registration & Simple Sign-In
        │
        │ HTTP REST API (JWT Bearer Auth)
        ▼
FastAPI Backend (Port 8000)
        │
        ├── Authentication & Self-Registration (/api/auth/register)
        ├── Role-Based Access Control (Admin, Teacher, Student)
        ├── Biometric Encryption Engine (AES-256-GCM)
        ├── Face Embedding & Recognition Engine (256-D Unit Hypersphere)
        ├── Anti-Proxy & Liveness Detector
        ├── Attendance & Duplicate-Prevention Service
        ├── Reporting & Excel/CSV Export Engine
        └── Local Database Backup & Restore Service
        │
        ▼
Local Physical Database (SQLite)
        └─ ./data/attendance.db (100% Local Storage, Zero Cloud Sync)
```

---

## 2. Security & Privacy Guarantees

1. **Local-First Physical Storage**:
   - The database file is created strictly at `./data/attendance.db`.
   - Never uploads biometric data, images, or records to external cloud APIs or third parties.
2. **Encrypted Client-Side Storage (`cryptoStorage`)**:
   - Browser `localStorage` values (auth tokens, sessions, user identity) are stored in encrypted ciphertext form (`ENC_v1:...`).
   - Prevents plaintext token exposure in browser developer tools or local cache.
3. **Authenticated AES-256-GCM Biometric Encryption**:
   - Stored face embeddings are encrypted on the backend with random 12-byte nonces and 16-byte authentication tags.
   - Formatted as `v1:<base64(nonce + ciphertext + tag)>` with upgradeable encryption versioning.
   - Raw embeddings and decrypted biometric vectors are **never exposed to frontend APIs**.
4. **Password Security**:
   - Secure salted password hashes using bcrypt. Plaintext passwords are never saved.
5. **Strict Duplicate Attendance Protection**:
   - Strict database unique constraint: `(student_id, subject_id, class_id, attendance_date)`.
   - Re-scanning an already-marked student alerts the faculty without altering previous check-in timestamps.
6. **Anti-Proxy Liveness Verification**:
   - Multi-frame micro-motion and variance verification prevents static phone photos or printouts from triggering attendance.

---

## 3. Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Local Storage**: `cryptoStorage` (Authenticated encrypted local storage wrapper)
- **Icons**: Lucide React
- **Charts**: Recharts (Weekly trends, subject-wise analytics, department breakdowns)
- **Routing**: React Router DOM (v6) with Protected Role Routes

### Backend
- **Framework**: Python 3.11+ / FastAPI / Uvicorn
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2
- **Encryption**: `cryptography` (AES-256-GCM authenticated cipher)
- **Vision Engine**: OpenCV + PIL + NumPy normalized 256-dimensional spatial gradient & texture descriptors
- **Reports**: `openpyxl` (Excel .xlsx generation) + Python `csv`

### Database
- **Engine**: SQLite (Clean local physical file, zero demo data)
- **Physical Location**: `./data/attendance.db`

---

## 4. Database Schema

The local database contains the following tables:

| Table | Purpose |
|---|---|
| `users` | User credentials, bcrypt `password_hash`, role (`admin`, `teacher`, `student`) |
| `students` | Unique `student_id` (e.g. STU101), name, email, department, course, semester, section, roll number, `face_registered` |
| `teachers` | Unique `teacher_id` (e.g. TCH101), name, email, department, designation |
| `subjects` | Course code (e.g. CS501), name, department, semester, assigned instructor |
| `classes` | Lecture/Lab sections, room allocation, scheduled timings |
| `face_embeddings` | `encrypted_embedding` (AES-256-GCM), `encryption_version`, timestamped |
| `attendance_sessions` | Faculty session tracking (active, completed, cancelled) with start and end times |
| `attendance` | Attendance records with status (`present`, `absent`, `late`, `excused`), method (`face`, `manual`), confidence score |
| `system_settings` | Dynamic thresholds for `face_match_threshold` and `attendance_threshold` |

---

## 5. Quick Start (Windows)

### Option A: One-Click Startup Script

Double-click or run:
```cmd
start.bat
```
This creates an isolated backend environment at `backend\.venv`, installs the backend dependencies, initializes the local database schema, and launches both backend (`http://127.0.0.1:8000`) and frontend (`http://localhost:5173`).
If a backend is already running on port 8000, stop it with `Ctrl+C` before starting another instance.

---

### Option B: Manual Setup

#### 1. Backend Setup

```cmd
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Initialize clean local database schema (no demo data):
```cmd
python app/seed.py
```

Run FastAPI Backend:
```cmd
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Swagger API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend Setup

In a new terminal window:
```cmd
cd frontend
npm install
npm run dev
```
- Application Portal: [http://localhost:5173](http://localhost:5173)

---

## 6. Account Creation & Sign-In

The system starts with a completely clean database. You can create accounts directly through the UI:

1. Open **[http://localhost:5173/login](http://localhost:5173/login)**.
2. Switch to the **Create Account** tab.
3. Select your role:
   - **Student**: Enter your name, student ID / username, email, password, department, course, semester, section.
   - **Faculty / Teacher**: Enter your name, faculty ID / username, email, password, department, designation.
   - **Administrator**: Enter your name, username, email, password.
4. Click **Create & Sign In**. The system registers your account, saves your session in encrypted `localStorage`, and routes you directly to your role-specific dashboard.

---

## 7. Complete Verification Workflow

To test the full end-to-end facial attendance lifecycle:

1. **Create an Account / Sign In**:
   - Register as a Student (e.g. username `STU101`).
2. **Face Enrollment**:
   - Navigate to `/student/register-face`.
   - Review the privacy notice.
   - Click **Capture Sample** 3 times while looking into the webcam.
   - The backend computes a 256-D normalized vector, encrypts it via AES-256-GCM, and saves it into `./data/attendance.db`.
3. **Teacher Attendance Session**:
   - Register/Sign in as Faculty / Teacher.
   - Go to `/teacher/attendance`.
   - Select a Class and click **Start Session**.
   - Align the student's face with the webcam: the system detects the face, renders the bounding box with name and match confidence (e.g. `Rahul (94%)`), and marks attendance present.
   - Re-scanning immediately triggers duplicate detection and informs the faculty without creating a duplicate record.
4. **Student Dashboard & Warnings**:
   - Open `/student/dashboard` or `/student/attendance` to verify the recorded check-in timestamp and Face AI badge.
5. **Reports & Exports**:
   - Go to `/teacher/reports` or `/admin/reports` and export filtered attendance spreadsheets to **CSV** or **Excel (.xlsx)**.
6. **Manage Database Snapshots**:
   - Navigate to `/admin/settings` and click **Create Backup** to generate a local `./backups/attendance_backup_YYYY_MM_DD.db` snapshot.

---

## 8. Running Automated Tests

Run the pytest suite to verify password hashing, JWT authentication, AES-256-GCM encryption/decryption, duplicate prevention, cosine similarity matching, and self-registration:

```cmd
python -m pytest backend/tests -v
```

All 7 test suites execute against an isolated in-memory SQLite runner.
