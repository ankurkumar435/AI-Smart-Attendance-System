import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.models.models import (
    Attendance, AttendanceSession, ClassEntity, Subject, Student, Teacher, User
)
from app.schemas.schemas import (
    SessionStart, SessionResponse, AttendanceMarkManual, AttendanceUpdate, AttendanceRecordResponse
)
from app.auth.dependencies import get_current_user, require_role
from app.services.attendance_service import attendance_service
from app.services.reporting_service import reporting_service

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])

# --- SESSIONS ---
@router.post("/session/start", response_model=SessionResponse)
def start_attendance_session(
    payload: SessionStart,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    cls = db.query(ClassEntity).filter(ClassEntity.id == payload.class_id).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    teacher_id = user.teacher_profile.id if user.teacher_profile else cls.teacher_id

    # Check if there is already an active session for this class today
    today = datetime.date.today()
    existing_session = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == payload.class_id,
        AttendanceSession.session_date == today,
        AttendanceSession.status == "active"
    ).first()

    if existing_session:
        return {
            "id": existing_session.id,
            "class_id": existing_session.class_id,
            "class_name": cls.class_name,
            "subject_name": cls.subject.subject_name if cls.subject else None,
            "teacher_id": existing_session.teacher_id,
            "teacher_name": existing_session.teacher.name if existing_session.teacher else None,
            "session_date": existing_session.session_date,
            "start_time": existing_session.start_time,
            "end_time": existing_session.end_time,
            "status": existing_session.status,
            "created_at": existing_session.created_at
        }

    session = AttendanceSession(
        class_id=payload.class_id,
        teacher_id=teacher_id,
        session_date=today,
        start_time=datetime.datetime.utcnow(),
        status="active"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "class_id": session.class_id,
        "class_name": cls.class_name,
        "subject_name": cls.subject.subject_name if cls.subject else None,
        "teacher_id": session.teacher_id,
        "teacher_name": session.teacher.name if session.teacher else None,
        "session_date": session.session_date,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "status": session.status,
        "created_at": session.created_at
    }

@router.post("/session/{session_id}/end", response_model=SessionResponse)
def end_attendance_session(
    session_id: int,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    session = db.query(AttendanceSession).filter(AttendanceSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Attendance session not found")

    session.status = "completed"
    session.end_time = datetime.datetime.utcnow()
    db.commit()
    db.refresh(session)

    return {
        "id": session.id,
        "class_id": session.class_id,
        "class_name": session.class_entity.class_name if session.class_entity else None,
        "subject_name": session.class_entity.subject.subject_name if session.class_entity and session.class_entity.subject else None,
        "teacher_id": session.teacher_id,
        "teacher_name": session.teacher.name if session.teacher else None,
        "session_date": session.session_date,
        "start_time": session.start_time,
        "end_time": session.end_time,
        "status": session.status,
        "created_at": session.created_at
    }

@router.get("/session/active")
def get_active_session(
    class_id: int,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    today = datetime.date.today()
    session = db.query(AttendanceSession).filter(
        AttendanceSession.class_id == class_id,
        AttendanceSession.session_date == today,
        AttendanceSession.status == "active"
    ).first()
    if not session:
        return {"active": False}
    return {
        "active": True,
        "session_id": session.id,
        "class_id": session.class_id,
        "start_time": session.start_time.strftime("%I:%M %p"),
        "status": session.status
    }

# --- ATTENDANCE MARKING & CORRECTION ---
@router.post("/mark")
def mark_manual_attendance(
    payload: AttendanceMarkManual,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    # Lookup student
    student = db.query(Student).filter(
        (Student.id == payload.student_id) | 
        (Student.student_id == str(payload.student_id))
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    result = attendance_service.mark_attendance(
        db=db,
        student_id=student.id,
        class_id=payload.class_id,
        recognition_method="manual",
        attendance_date=payload.attendance_date or datetime.date.today(),
        session_id=payload.session_id,
        status=payload.status.lower()
    )

    if not result["success"] and not result.get("already_marked"):
        raise HTTPException(status_code=400, detail=result["message"])

    return result

@router.put("/{attendance_id}")
def update_attendance_record(
    attendance_id: int,
    payload: AttendanceUpdate,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found")

    record.status = payload.status.lower()
    db.commit()
    db.refresh(record)

    return {
        "success": True,
        "id": record.id,
        "status": record.status,
        "message": f"Attendance status updated to {record.status.capitalize()}"
    }

@router.get("", response_model=List[AttendanceRecordResponse])
def get_attendance_list(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    class_id: Optional[int] = None,
    date_from: Optional[datetime.date] = None,
    date_to: Optional[datetime.date] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    query = reporting_service.get_attendance_query(
        db=db,
        student_id=student_id,
        subject_id=subject_id,
        class_id=class_id,
        date_from=date_from,
        date_to=date_to,
        status=status,
        search=search
    )
    records = query.all()
    return reporting_service.format_records(records)

@router.get("/student/{student_id}")
def get_student_attendance(
    student_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Access control: students only see their own
    if user.role == "student" and (not user.student_profile or user.student_profile.id != student.id):
        raise HTTPException(status_code=403, detail="Forbidden")

    stats = attendance_service.get_student_stats(db, student.id)
    query = reporting_service.get_attendance_query(db, student_id=student.id)
    records = query.limit(50).all()

    return {
        "student_id": student.student_id,
        "student_name": student.name,
        "department": student.department,
        "course": student.course,
        "stats": stats,
        "history": reporting_service.format_records(records)
    }
