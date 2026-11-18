from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.models import ClassEntity, Subject, Teacher, User
from app.schemas.schemas import ClassCreate, ClassUpdate, ClassResponse
from app.auth.dependencies import require_role

router = APIRouter(prefix="/api/classes", tags=["Classes"])

@router.get("", response_model=List[ClassResponse])
def get_classes(
    teacher_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    user: User = Depends(require_role(["admin", "teacher", "student"])),
    db: Session = Depends(get_db)
):
    query = db.query(ClassEntity)
    if teacher_id:
        query = query.filter(ClassEntity.teacher_id == teacher_id)
    if subject_id:
        query = query.filter(ClassEntity.subject_id == subject_id)

    classes = query.all()
    results = []
    for c in classes:
        results.append({
            "id": c.id,
            "subject_id": c.subject_id,
            "subject_name": c.subject.subject_name if c.subject else None,
            "subject_code": c.subject.subject_code if c.subject else None,
            "teacher_id": c.teacher_id,
            "teacher_name": c.teacher.name if c.teacher else None,
            "class_name": c.class_name,
            "room": c.room,
            "schedule": c.schedule,
            "created_at": c.created_at
        })
    return results

@router.get("/{id}", response_model=ClassResponse)
def get_class(id: int, user: User = Depends(require_role(["admin", "teacher", "student"])), db: Session = Depends(get_db)):
    c = db.query(ClassEntity).filter(ClassEntity.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Class not found")
    return {
        "id": c.id,
        "subject_id": c.subject_id,
        "subject_name": c.subject.subject_name if c.subject else None,
        "subject_code": c.subject.subject_code if c.subject else None,
        "teacher_id": c.teacher_id,
        "teacher_name": c.teacher.name if c.teacher else None,
        "class_name": c.class_name,
        "room": c.room,
        "schedule": c.schedule,
        "created_at": c.created_at
    }

@router.post("", response_model=ClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(payload: ClassCreate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    # Verify subject exists
    subject = db.query(Subject).filter(Subject.id == payload.subject_id).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")

    new_class = ClassEntity(
        subject_id=payload.subject_id,
        teacher_id=payload.teacher_id or subject.teacher_id,
        class_name=payload.class_name,
        room=payload.room,
        schedule=payload.schedule
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return {
        "id": new_class.id,
        "subject_id": new_class.subject_id,
        "subject_name": new_class.subject.subject_name if new_class.subject else None,
        "subject_code": new_class.subject.subject_code if new_class.subject else None,
        "teacher_id": new_class.teacher_id,
        "teacher_name": new_class.teacher.name if new_class.teacher else None,
        "class_name": new_class.class_name,
        "room": new_class.room,
        "schedule": new_class.schedule,
        "created_at": new_class.created_at
    }

@router.put("/{id}", response_model=ClassResponse)
def update_class(id: int, payload: ClassUpdate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    class_obj = db.query(ClassEntity).filter(ClassEntity.id == id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(class_obj, key, value)

    db.commit()
    db.refresh(class_obj)
    return {
        "id": class_obj.id,
        "subject_id": class_obj.subject_id,
        "subject_name": class_obj.subject.subject_name if class_obj.subject else None,
        "subject_code": class_obj.subject.subject_code if class_obj.subject else None,
        "teacher_id": class_obj.teacher_id,
        "teacher_name": class_obj.teacher.name if class_obj.teacher else None,
        "class_name": class_obj.class_name,
        "room": class_obj.room,
        "schedule": class_obj.schedule,
        "created_at": class_obj.created_at
    }

@router.delete("/{id}")
def delete_class(id: int, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    class_obj = db.query(ClassEntity).filter(ClassEntity.id == id).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")

    db.delete(class_obj)
    db.commit()
    return {"success": True, "message": f"Class '{class_obj.class_name}' deleted"}
