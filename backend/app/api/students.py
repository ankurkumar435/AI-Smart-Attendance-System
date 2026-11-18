from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.models.models import Student, User, FaceEmbedding
from app.schemas.schemas import StudentCreate, StudentUpdate, StudentResponse
from app.auth.dependencies import get_current_user, require_role
from app.auth.security import get_password_hash

router = APIRouter(prefix="/api/students", tags=["Students"])

@router.get("", response_model=List[StudentResponse])
def get_students(
    department: Optional[str] = None,
    course: Optional[str] = None,
    semester: Optional[int] = None,
    face_registered: Optional[bool] = None,
    search: Optional[str] = None,
    user: User = Depends(require_role(["admin", "teacher"])),
    db: Session = Depends(get_db)
):
    query = db.query(Student)
    if department:
        query = query.filter(Student.department == department)
    if course:
        query = query.filter(Student.course == course)
    if semester:
        query = query.filter(Student.semester == semester)
    if face_registered is not None:
        query = query.filter(Student.face_registered == face_registered)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Student.name.ilike(search_filter)) | 
            (Student.student_id.ilike(search_filter)) |
            (Student.email.ilike(search_filter))
        )
    return query.order_by(Student.student_id.asc()).all()

@router.get("/{id}", response_model=StudentResponse)
def get_student(
    id: int, 
    user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Students can view their own profile, teachers/admins can view any
    if user.role == "student" and (not user.student_profile or user.student_profile.id != id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other student profiles")

    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
def create_student(
    payload: StudentCreate, 
    user: User = Depends(require_role(["admin"])), 
    db: Session = Depends(get_db)
):
    # Check duplicate student_id or email
    if db.query(Student).filter(Student.student_id == payload.student_id).first():
        raise HTTPException(status_code=400, detail=f"Student ID '{payload.student_id}' already exists")
    if db.query(Student).filter(Student.email == payload.email).first():
        raise HTTPException(status_code=400, detail=f"Email '{payload.email}' already registered")

    user_id = None
    if payload.create_user_account:
        # Check if username exists
        if db.query(User).filter(User.username == payload.student_id).first():
            raise HTTPException(status_code=400, detail=f"User account '{payload.student_id}' already exists")
        
        new_user = User(
            username=payload.student_id,
            password_hash=get_password_hash(payload.default_password or "Student@123"),
            role="student",
            require_password_change=True,
            is_active=True
        )
        db.add(new_user)
        db.flush()
        user_id = new_user.id

    student = Student(
        student_id=payload.student_id,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        course=payload.course,
        department=payload.department,
        semester=payload.semester,
        section=payload.section,
        roll_number=payload.roll_number,
        user_id=user_id,
        face_registered=False,
        is_active=True
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student

@router.put("/{id}", response_model=StudentResponse)
def update_student(
    id: int, 
    payload: StudentUpdate, 
    user: User = Depends(require_role(["admin"])), 
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(student, key, value)

    db.commit()
    db.refresh(student)
    return student

@router.delete("/{id}")
def delete_student(
    id: int, 
    delete_biometrics: bool = Query(True, description="Strictly delete face embedding"),
    user: User = Depends(require_role(["admin"])), 
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # If associated with a user account, delete user as well
    if student.user_id:
        user_acc = db.query(User).filter(User.id == student.user_id).first()
        if user_acc:
            db.delete(user_acc)

    # Face embedding and attendance cascade delete automatically
    db.delete(student)
    db.commit()

    return {"success": True, "message": f"Student {student.name} and related records removed"}
