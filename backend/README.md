# AI Smart Student Attendance System - Backend Service

High-performance, local-first FastAPI service with AES-256-GCM encrypted facial biometric storage and SQLite persistence.

## Architecture

- **Framework**: FastAPI + Uvicorn
- **ORM**: SQLAlchemy 2.0
- **Database**: Local SQLite (`./data/attendance.db`)
- **Biometric Security**: Authenticated AES-256-GCM encryption with versioned payload (`v1:<nonce+ciphertext+tag>`)
- **Face Processing**: Multi-scale spatial gradient & texture descriptors with L2 normalized 256-dimensional unit vectors and Cosine Similarity matching.
- **Liveness Detection**: Multi-frame variance & eye region micro-motion analysis to prevent static photo spoofing.

## Prerequisites

- Python 3.11+
- Virtual environment recommended (`python -m venv .venv`)

## Installation

```bash
cd backend
pip install -r requirements.txt
```

## Database Initialization & Seeding

```bash
# Initializes SQLite tables, directories, AES-256 key, and demo data
python app/seed.py
```

## Running the Server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API Documentation: `http://127.0.0.1:8000/docs`
- Redoc: `http://127.0.0.1:8000/redoc`

## Running Backend Tests

```bash
python -m pytest tests -v
```
