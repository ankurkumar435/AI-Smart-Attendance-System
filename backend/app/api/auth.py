from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import User, Student, Teacher
from app.schemas.schemas import UserLogin, TokenResponse, UserChangePassword, UserResponse, UserRegisterRequest
from app.auth.security import verify_password, get_password_hash, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    # 1. Check if username is taken
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail=f"Username '{payload.username}' is already taken.")

    # 2. Check if email is already used by student or teacher
    if payload.role == "student":
        if db.query(Student).filter((Student.student_id == payload.username) | (Student.email == payload.email)).first():
            raise HTTPException(status_code=400, detail=f"Student ID or email '{payload.email}' already registered.")
    elif payload.role == "teacher":
        if db.query(Teacher).filter((Teacher.teacher_id == payload.username) | (Teacher.email == payload.email)).first():
            raise HTTPException(status_code=400, detail=f"Teacher ID or email '{payload.email}' already registered.")

    # 3. Create User account
    new_user = User(
        username=payload.username,
        password_hash=get_password_hash(payload.password),
        role=payload.role,
        require_password_change=False,
        is_active=True
    )
    db.add(new_user)
    db.flush()

    profile_id = None
    student_id = None
    teacher_id = None

    # 4. Create linked profile based on role
    if payload.role == "student":
        student_obj = Student(
            student_id=payload.username,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            course=payload.course or "B.Tech Computer Science",
            department=payload.department or "Computer Science & Engineering",
            semester=payload.semester or 1,
            section=payload.section or "A",
            roll_number=payload.roll_number,
            user_id=new_user.id,
            face_registered=False,
            is_active=True
        )
        db.add(student_obj)
        db.flush()
        profile_id = student_obj.id
        student_id = student_obj.student_id

    elif payload.role == "teacher":
        teacher_obj = Teacher(
            teacher_id=payload.username,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            department=payload.department or "Computer Science & Engineering",
            designation=payload.designation or "Assistant Professor",
            user_id=new_user.id,
            is_active=True
        )
        db.add(teacher_obj)
        db.flush()
        profile_id = teacher_obj.id
        teacher_id = teacher_obj.teacher_id

    db.commit()

    # 5. Issue JWT access token
    access_token = create_access_token(data={
        "sub": new_user.username,
        "role": new_user.role,
        "user_id": new_user.id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": new_user.role,
        "user_id": new_user.id,
        "username": new_user.username,
        "name": payload.name,
        "require_password_change": False,
        "profile_id": profile_id,
        "student_id": student_id,
        "teacher_id": teacher_id
    }

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == credentials.username).first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Account is deactivated. Contact administrator.")

    # Determine display name and related IDs
    display_name = user.username
    student_id = None
    teacher_id = None
    profile_id = None

    if user.role == "student" and user.student_profile:
        display_name = user.student_profile.name
        student_id = user.student_profile.student_id
        profile_id = user.student_profile.id
    elif user.role == "teacher" and user.teacher_profile:
        display_name = user.teacher_profile.name
        teacher_id = user.teacher_profile.teacher_id
        profile_id = user.teacher_profile.id
    elif user.role == "admin":
        display_name = "Administrator"

    access_token = create_access_token(data={
        "sub": user.username,
        "role": user.role,
        "user_id": user.id
    })

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "user_id": user.id,
        "username": user.username,
        "name": display_name,
        "require_password_change": user.require_password_change,
        "profile_id": profile_id,
        "student_id": student_id,
        "teacher_id": teacher_id
    }

@router.get("/me")
def get_current_user_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    display_name = user.username
    profile_data = None
    
    if user.role == "student" and user.student_profile:
        display_name = user.student_profile.name
        profile_data = {
            "id": user.student_profile.id,
            "student_id": user.student_profile.student_id,
            "name": user.student_profile.name,
            "email": user.student_profile.email,
            "course": user.student_profile.course,
            "department": user.student_profile.department,
            "semester": user.student_profile.semester,
            "section": user.student_profile.section,
            "face_registered": user.student_profile.face_registered
        }
    elif user.role == "teacher" and user.teacher_profile:
        display_name = user.teacher_profile.name
        profile_data = {
            "id": user.teacher_profile.id,
            "teacher_id": user.teacher_profile.teacher_id,
            "name": user.teacher_profile.name,
            "email": user.teacher_profile.email,
            "department": user.teacher_profile.department,
            "designation": user.teacher_profile.designation
        }

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "name": display_name,
        "require_password_change": user.require_password_change,
        "profile": profile_data
    }

@router.post("/change-password")
def change_password(payload: UserChangePassword, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(payload.old_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password incorrect")

    user.password_hash = get_password_hash(payload.new_password)
    user.require_password_change = False
    db.commit()

    return {"success": True, "message": "Password changed successfully"}

@router.post("/logout")
def logout():
    return {"success": True, "message": "Logged out successfully"}
