from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, date, time

# --- AUTH & USER ---
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    username: str
    name: str
    require_password_change: bool = False
    profile_id: Optional[int] = None
    student_id: Optional[str] = None
    teacher_id: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=2)
    email: str
    role: str = Field("student", pattern="^(admin|teacher|student)$")
    phone: Optional[str] = None
    # Student specific fields
    course: Optional[str] = "B.Tech Computer Science"
    department: Optional[str] = "Computer Science & Engineering"
    semester: Optional[int] = 1
    section: Optional[str] = "A"
    roll_number: Optional[str] = None
    # Teacher specific fields
    designation: Optional[str] = "Assistant Professor"

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class UserCreate(BaseModel):
    username: str
    password: str = Field(..., min_length=6)
    role: str # 'admin', 'teacher', 'student'

class UserResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    require_password_change: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- STUDENT ---
class StudentCreate(BaseModel):
    student_id: str = Field(..., min_length=3, max_length=50) # e.g. STU101
    name: str
    email: str
    phone: Optional[str] = None
    course: str # e.g. B.Tech Computer Science
    department: str # e.g. CSE
    semester: int = Field(1, ge=1, le=12)
    section: str = "A"
    roll_number: Optional[str] = None
    create_user_account: bool = True
    default_password: Optional[str] = "Student@123"

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    course: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    section: Optional[str] = None
    roll_number: Optional[str] = None
    is_active: Optional[bool] = None

class StudentResponse(BaseModel):
    id: int
    student_id: str
    name: str
    email: str
    phone: Optional[str] = None
    course: str
    department: str
    semester: int
    section: str
    roll_number: Optional[str] = None
    face_registered: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- TEACHER ---
class TeacherCreate(BaseModel):
    teacher_id: str = Field(..., min_length=3, max_length=50)
    name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str = "Assistant Professor"
    create_user_account: bool = True
    default_password: Optional[str] = "Teacher@123"

class TeacherUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    is_active: Optional[bool] = None

class TeacherResponse(BaseModel):
    id: int
    teacher_id: str
    name: str
    email: str
    phone: Optional[str] = None
    department: str
    designation: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- SUBJECT ---
class SubjectCreate(BaseModel):
    subject_code: str
    subject_name: str
    department: str
    semester: int
    teacher_id: Optional[int] = None

class SubjectUpdate(BaseModel):
    subject_code: Optional[str] = None
    subject_name: Optional[str] = None
    department: Optional[str] = None
    semester: Optional[int] = None
    teacher_id: Optional[int] = None

class SubjectResponse(BaseModel):
    id: int
    subject_code: str
    subject_name: str
    department: str
    semester: int
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- CLASS ---
class ClassCreate(BaseModel):
    subject_id: int
    teacher_id: Optional[int] = None
    class_name: str
    room: str
    schedule: Optional[str] = None

class ClassUpdate(BaseModel):
    subject_id: Optional[int] = None
    teacher_id: Optional[int] = None
    class_name: Optional[str] = None
    room: Optional[str] = None
    schedule: Optional[str] = None

class ClassResponse(BaseModel):
    id: int
    subject_id: int
    subject_name: Optional[str] = None
    subject_code: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    class_name: str
    room: str
    schedule: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- ATTENDANCE SESSION ---
class SessionStart(BaseModel):
    class_id: int

class SessionResponse(BaseModel):
    id: int
    class_id: int
    class_name: Optional[str] = None
    subject_name: Optional[str] = None
    teacher_id: Optional[int] = None
    teacher_name: Optional[str] = None
    session_date: date
    start_time: datetime
    end_time: Optional[datetime] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- ATTENDANCE RECORDS ---
class AttendanceMarkManual(BaseModel):
    student_id: int # database id or student_id string
    class_id: int
    attendance_date: Optional[date] = None
    status: str = "present" # present, absent, late, excused
    session_id: Optional[int] = None

class AttendanceUpdate(BaseModel):
    status: str # present, absent, late, excused

class AttendanceRecordResponse(BaseModel):
    id: int
    student_id: int
    student_code: str
    student_name: str
    department: str
    course: str
    semester: int
    section: str
    subject_id: int
    subject_code: str
    subject_name: str
    class_id: int
    class_name: str
    attendance_date: date
    check_in_time: datetime
    status: str
    recognition_method: str
    confidence: Optional[float] = None

    class Config:
        from_attributes = True

# --- FACE RECOGNITION & BIOMETRICS ---
class FaceRegisterRequest(BaseModel):
    student_id: str # e.g. "STU001" or student db id
    images: List[str] # list of base64 data URLs captured during registration

class FaceRegisterResponse(BaseModel):
    success: bool
    message: str
    samples_processed: int
    face_registered: bool

class FaceRecognizeRequest(BaseModel):
    image: str # single base64 data URL from live webcam
    class_id: int
    session_id: Optional[int] = None
    verify_liveness: bool = False
    liveness_action: Optional[str] = None # "blink", "head_turn"

class FaceRecognitionResult(BaseModel):
    matched: bool
    student_id: Optional[str] = None
    student_name: Optional[str] = None
    confidence: float = 0.0
    status: Optional[str] = None
    attendance_marked: bool = False
    message: str
    face_detected: bool = False
    bounding_box: Optional[Dict[str, int]] = None
    liveness_verified: bool = True

class LivenessChallengeResponse(BaseModel):
    challenge: str # e.g. "blink", "turn_left", "turn_right", "smile"
    instruction: str
    session_token: str

# --- SYSTEM & DASHBOARD ---
class SystemSettingsUpdate(BaseModel):
    face_match_threshold: Optional[float] = None
    attendance_threshold: Optional[float] = None

class BackupResponse(BaseModel):
    filename: str
    filepath: str
    size_bytes: int
    created_at: datetime
    success: bool
    message: str
