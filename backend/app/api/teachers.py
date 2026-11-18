from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database.connection import get_db
from app.models.models import Teacher, User
from app.schemas.schemas import TeacherCreate, TeacherUpdate, TeacherResponse
from app.auth.dependencies import require_role
from app.auth.security import get_password_hash

router = APIRouter(prefix="/api/teachers", tags=["Teachers"])

@router.get("", response_model=List[TeacherResponse])
def get_teachers(user: User = Depends(require_role(["admin", "teacher"])), db: Session = Depends(get_db)):
    return db.query(Teacher).order_by(Teacher.name.asc()).all()

@router.get("/{id}", response_model=TeacherResponse)
def get_teacher(id: int, user: User = Depends(require_role(["admin", "teacher"])), db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return teacher

@router.post("", response_model=TeacherResponse, status_code=status.HTTP_201_CREATED)
def create_teacher(payload: TeacherCreate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    if db.query(Teacher).filter(Teacher.teacher_id == payload.teacher_id).first():
        raise HTTPException(status_code=400, detail=f"Teacher ID '{payload.teacher_id}' already exists")
    if db.query(Teacher).filter(Teacher.email == payload.email).first():
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' already registered")

    user_id = None
    if payload.create_user_account:
        if db.query(User).filter(User.username == payload.teacher_id).first():
            raise HTTPException(status_code=400, detail=f"User account '{payload.teacher_id}' already exists")
        
        new_user = User(
            username=payload.teacher_id,
            password_hash=get_password_hash(payload.default_password or "Teacher@123"),
            role="teacher",
            require_password_change=True,
            is_active=True
        )
        db.add(new_user)
        db.flush()
        user_id = new_user.id

    teacher = Teacher(
        teacher_id=payload.teacher_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        department=payload.department,
        designation=payload.designation,
        user_id=user_id,
        is_active=True
    )
    db.add(teacher)
    db.commit()
    db.refresh(teacher)
    return teacher

@router.put("/{id}", response_model=TeacherResponse)
def update_teacher(id: int, payload: TeacherUpdate, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(teacher, key, value)

    db.commit()
    db.refresh(teacher)
    return teacher

@router.delete("/{id}")
def delete_teacher(id: int, user: User = Depends(require_role(["admin"])), db: Session = Depends(get_db)):
    teacher = db.query(Teacher).filter(Teacher.id == id).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if teacher.user_id:
        user_acc = db.query(User).filter(User.id == teacher.user_id).first()
        if user_acc:
            db.delete(user_acc)

    db.delete(teacher)
    db.commit()
    return {"success": True, "message": f"Teacher {teacher.name} removed successfully"}
