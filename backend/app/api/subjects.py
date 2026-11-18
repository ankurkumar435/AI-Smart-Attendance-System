from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.models.models import Subject, Teacher, User
from app.schemas.schemas import SubjectCreate, SubjectUpdate, SubjectResponse
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/subjects", tags=["Subjects"])

@router.get("", response_model=List[SubjectResponse])
def get_subjects(user: User = Depends(require_role(["admin", "teacher", "student"])), db: Session = Depends(get_db)):
    subjects = db.query(Subject).all()
    results = []
    for s in subjects:
        results.append({
            "id": s.id,
            "subject_code": s.subject_code,
            "subject_name": s.subject_name,
            "department": s.department,
            "semester": s.semester,
            "teacher_id": s.teacher_id,
            "teacher_name": s.teacher.name if s.teacher else None,
            "created_at": s.created_at
        })
    return results

@router.get("/{id}", response_model=SubjectResponse)
def get_subject(id: int, user: User = Depends(require_role(["admin", "teacher"])), db: Session = Depends(get_db)):
    s = db.query(Subject).filter(Subject.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Subject not found")
    return {
        "id": s.id,
        "subject_code": s.subject_code,
        "subject_name": s.subject_name,
        "department": s.department,
        "semester": s.semester,
        "teacher_id": s.teacher_id,
        "teacher_name": s.teacher.name if s.teacher else None,
        "created_at": s.created_at
    }

@router.post("", response_model=SubjectResponse, status_code=status.HTTP_201_CREATED)
def create_subject(payload: SubjectCreate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    if db.query(Subject).filter(Subject.subject_code == payload.subject_code).first():
        raise HTTPException(status_code=400, detail=f"Subject code '{payload.subject_code}' already exists")

    subject = Subject(
        subject_code=payload.subject_code,
        subject_name=payload.subject_name,
        department=payload.department,
        semester=payload.semester,
        teacher_id=payload.teacher_id
    )
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return {
        "id": subject.id,
        "subject_code": subject.subject_code,
        "subject_name": subject.subject_name,
        "department": subject.department,
        "semester": subject.semester,
        "teacher_id": subject.teacher_id,
        "teacher_name": subject.teacher.name if subject.teacher else None,
        "created_at": subject.created_at
    }

@router.put("/{id}", response_model=SubjectResponse)
def update_subject(id: int, payload: SubjectUpdate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(subject, key, value)

    db.commit()
    db.refresh(subject)
    return {
        "id": subject.id,
        "subject_code": subject.subject_code,
        "subject_name": subject.subject_name,
        "department": subject.department,
        "semester": subject.semester,
        "teacher_id": subject.teacher_id,
        "teacher_name": subject.teacher.name if subject.teacher else None,
        "created_at": subject.created_at
    }

@router.delete("/{id}")
def delete_subject(id: int, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    subject = db.query(Subject).filter(Subject.id == id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    db.delete(subject)
    db.commit()
    return {"success": True, "message": f"Subject {subject.subject_code} deleted"}
