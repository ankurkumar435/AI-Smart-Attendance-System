import logging
import random
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database.connection import get_db
from app.models.models import Student, FaceEmbedding, User, ClassEntity
from app.schemas.schemas import (
    FaceRegisterRequest, FaceRegisterResponse,
    FaceRecognizeRequest, FaceRecognitionResult,
    LivenessChallengeResponse
)
from app.auth.dependencies import get_current_user, require_role
from app.security.encryption import encrypt_embedding, decrypt_embedding
from app.face.recognition import face_engine
from app.face.liveness import liveness_service
from app.services.attendance_service import attendance_service
from app.config import settings

logger = logging.getLogger("attendance.api.face")
router = APIRouter(prefix="/api/face", tags=["Face Recognition"])

CHALLENGES = [
    {"challenge": "blink", "instruction": "Please blink once naturally."},
    {"challenge": "turn_left", "instruction": "Please turn your head slightly to the left."},
    {"challenge": "turn_right", "instruction": "Please turn your head slightly to the right."}
]

@router.get("/liveness-challenge", response_model=LivenessChallengeResponse)
def get_liveness_challenge():
    item = random.choice(CHALLENGES)
    token = str(uuid.uuid4())
    return {
        "challenge": item["challenge"],
        "instruction": item["instruction"],
        "session_token": token
    }

@router.post("/register", response_model=FaceRegisterResponse)
def register_face(
    payload: FaceRegisterRequest, 
    user: User = Depends(require_role(["student", "admin"])), 
    db: Session = Depends(get_db)
):
    # Lookup student by student_id or ID
    student = db.query(Student).filter(
        (Student.student_id == payload.student_id) | 
        (Student.id == int(payload.student_id) if payload.student_id.isdigit() else False)
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail=f"Student '{payload.student_id}' not found")

    # If role is student, can only register own face
    if user.role == "student":
        if not user.student_profile or user.student_profile.id != student.id:
            raise HTTPException(status_code=403, detail="Students can only register their own biometric data")

    if not payload.images or len(payload.images) < 2:
        raise HTTPException(status_code=400, detail="At least 2 camera samples are required for registration")

    try:
        # Extract consolidated average embedding from captured samples
        consolidated_embedding, samples_used = face_engine.process_registration_samples(payload.images)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error processing face samples: {e}")
        raise HTTPException(status_code=500, detail="Failed to process facial biometric samples")

    # Encrypt embedding with AES-256-GCM
    encrypted_payload = encrypt_embedding(consolidated_embedding)

    # Store or update in database
    existing_emb = db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).first()
    if existing_emb:
        existing_emb.encrypted_embedding = encrypted_payload
        existing_emb.encryption_version = "v1"
    else:
        new_emb = FaceEmbedding(
            student_id=student.id,
            encrypted_embedding=encrypted_payload,
            encryption_version="v1"
        )
        db.add(new_emb)

    student.face_registered = True
    db.commit()

    logger.info(f"Successfully registered biometric face embedding for student {student.student_id}")

    return {
        "success": True,
        "message": f"Biometric face profile successfully created and encrypted locally using {samples_used} samples.",
        "samples_processed": samples_used,
        "face_registered": True
    }

@router.post("/recognize", response_model=FaceRecognitionResult)
def recognize_and_mark_attendance(
    payload: FaceRecognizeRequest,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    # Verify class exists
    class_obj = db.query(ClassEntity).filter(ClassEntity.id == payload.class_id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Selected class not found")

    # Decode probe image from webcam to check face presence
    try:
        pil_img = face_engine.decode_image_to_pil(payload.image)
        faces = face_engine.detect_faces(pil_img)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid webcam image payload")

    # Fetch all registered face embeddings
    registered_records = db.query(FaceEmbedding, Student).join(
        Student, FaceEmbedding.student_id == Student.id
    ).filter(Student.is_active == True).all()

    if not registered_records:
        bbox = {"x": faces[0][0], "y": faces[0][1], "width": faces[0][2], "height": faces[0][3]} if faces else None
        return {
            "matched": False,
            "face_detected": len(faces) > 0,
            "bounding_box": bbox,
            "confidence": 0.0,
            "message": "No students are currently registered with facial biometrics.",
            "attendance_marked": False
        }

    # Decrypt registered gallery in-memory on backend
    gallery = []
    for face_rec, stu in registered_records:
        try:
            emb = decrypt_embedding(face_rec.encrypted_embedding)
            gallery.append({
                "student_db_id": stu.id,
                "student_id": stu.student_id,
                "name": stu.name,
                "embedding": emb
            })
        except Exception as e:
            logger.warning(f"Could not decrypt embedding for student {stu.student_id}: {e}")
            continue

    # Perform facial recognition comparison
    result = face_engine.recognize_face(payload.image, gallery, threshold=settings.FACE_MATCH_THRESHOLD)

    if not result["matched"]:
        return {
            "matched": False,
            "face_detected": result["face_detected"],
            "bounding_box": result.get("bounding_box"),
            "confidence": result["confidence"],
            "student_id": None,
            "student_name": None,
            "message": result["message"],
            "attendance_marked": False
        }

    # Match confirmed! Automatically mark attendance
    stu_db_id = result["student_db_id"]
    att_res = attendance_service.mark_attendance(
        db=db,
        student_id=stu_db_id,
        class_id=payload.class_id,
        recognition_method="face",
        confidence=result["confidence"],
        session_id=payload.session_id,
        status="present"
    )

    return {
        "matched": True,
        "face_detected": True,
        "bounding_box": result.get("bounding_box"),
        "confidence": result["confidence"],
        "student_id": result["student_id"],
        "student_name": result["student_name"],
        "status": att_res["status"],
        "attendance_marked": att_res["success"],
        "message": att_res["message"]
    }

@router.delete("/biometrics/{student_id}")
def delete_student_biometrics(
    student_id: str,
    user: User = Depends(require_role(["admin", "student"])),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(
        (Student.student_id == student_id) | 
        (Student.id == int(student_id) if student_id.isdigit() else False)
    ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    if user.role == "student" and (not user.student_profile or user.student_profile.id != student.id):
        raise HTTPException(status_code=403, detail="Cannot delete other students' biometric data")

    db.query(FaceEmbedding).filter(FaceEmbedding.student_id == student.id).delete()
    student.face_registered = False
    db.commit()

    logger.info(f"Biometric data deleted for student {student.student_id}")
    return {"success": True, "message": f"Biometric face data for {student.name} deleted successfully"}
