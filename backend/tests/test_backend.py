import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
import os
import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.main import app
from app.database.connection import Base, get_db
from app.models.models import User, Student, Subject, ClassEntity, Attendance
from app.auth.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.security.encryption import encrypt_embedding, decrypt_embedding
from app.services.attendance_service import attendance_service
from app.services.backup_service import backup_service
from app.face.recognition import face_engine

# Use in-memory SQLite database for fast isolated unit tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()

# --- 1. Password Hashing & JWT Tests ---
def test_password_hashing():
    raw = "SecurePassword@123"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token():
    payload = {"sub": "testadmin", "role": "admin"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    assert decoded is not None
    assert decoded["sub"] == "testadmin"
    assert decoded["role"] == "admin"

# --- 2. AES-256-GCM Biometric Encryption Tests ---
def test_face_embedding_encryption_decryption():
    sample_embedding = [0.1234, -0.5678, 0.9876, 0.0, -0.1111, 0.4321]
    encrypted_str = encrypt_embedding(sample_embedding)
    
    # Must have v1: prefix
    assert encrypted_str.startswith("v1:")
    # Must not contain raw plaintext float values
    assert "0.1234" not in encrypted_str
    
    decrypted = decrypt_embedding(encrypted_str)
    assert len(decrypted) == len(sample_embedding)
    for orig, dec in zip(sample_embedding, decrypted):
        assert abs(orig - dec) < 1e-5

# --- 3. Duplicate Attendance Prevention Tests ---
def test_duplicate_attendance_prevention(db_session):
    # Setup test entities
    student = Student(
        student_id="TST001",
        name="Test Student",
        email="test@school.edu",
        course="CSE",
        department="Computer Science",
        semester=1,
        section="A"
    )
    subject = Subject(
        subject_code="TST101",
        subject_name="Test Subject",
        department="Computer Science",
        semester=1
    )
    db_session.add_all([student, subject])
    db_session.commit()

    cls = ClassEntity(
        subject_id=subject.id,
        class_name="Test Class",
        room="Room 101"
    )
    db_session.add(cls)
    db_session.commit()

    today = datetime.date.today()

    # First attendance mark - should succeed
    res1 = attendance_service.mark_attendance(
        db=db_session,
        student_id=student.id,
        class_id=cls.id,
        recognition_method="face",
        confidence=0.92,
        attendance_date=today,
        status="present"
    )
    assert res1["success"] is True
    assert res1["already_marked"] is False

    # Second attendance mark for same student, subject, class, date - should be blocked
    res2 = attendance_service.mark_attendance(
        db=db_session,
        student_id=student.id,
        class_id=cls.id,
        recognition_method="face",
        confidence=0.95,
        attendance_date=today,
        status="present"
    )
    assert res2["success"] is False
    assert res2["already_marked"] is True
    assert "already recorded" in res2["message"].lower()

# --- 4. Face Recognition Cosine Comparison Tests ---
def test_cosine_similarity():
    emb1 = [1.0, 0.0, 0.0]
    emb2 = [1.0, 0.0, 0.0]
    emb3 = [0.0, 1.0, 0.0]
    
    assert abs(face_engine.compare_embeddings(emb1, emb2) - 1.0) < 1e-4
    assert abs(face_engine.compare_embeddings(emb1, emb3) - 0.0) < 1e-4

# --- 5. Health Check API Test ---
def test_api_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database_storage"] == "local_sqlite"

# --- 6. Account Creation / Self Registration Test ---
def test_user_self_registration(client):
    payload = {
        "username": "REG_STU01",
        "password": "Password@123",
        "name": "Registered Student",
        "email": "reg.student@college.edu",
        "role": "student",
        "department": "Computer Science & Engineering",
        "course": "B.Tech CSE",
        "semester": 3,
        "section": "B"
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["username"] == "REG_STU01"
    assert data["role"] == "student"
    assert "access_token" in data
    assert data["token_type"] == "bearer"
