import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List, Dict, Any

from app.database.connection import get_db
from app.models.models import (
    Attendance, Student, Subject, ClassEntity, Teacher, User, FaceEmbedding
)
from app.auth.dependencies import get_current_user, require_role
from app.services.reporting_service import reporting_service
from app.services.attendance_service import attendance_service
from app.config import settings

router = APIRouter(prefix="/api/reports", tags=["Reports & Analytics"])

@router.get("/attendance")
def get_report_attendance(
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    class_id: Optional[int] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    semester: Optional[int] = None,
    section: Optional[str] = None,
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
        department=department,
        course=course,
        semester=semester,
        section=section,
        date_from=date_from,
        date_to=date_to,
        status=status,
        search=search
    )
    records = query.all()
    return reporting_service.format_records(records)

@router.get("/export")
def export_attendance_report(
    format: str = Query("csv", regex="^(csv|excel)$"),
    student_id: Optional[int] = None,
    subject_id: Optional[int] = None,
    class_id: Optional[int] = None,
    department: Optional[str] = None,
    course: Optional[str] = None,
    semester: Optional[int] = None,
    section: Optional[str] = None,
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
        department=department,
        course=course,
        semester=semester,
        section=section,
        date_from=date_from,
        date_to=date_to,
        status=status,
        search=search
    )
    raw_records = query.all()
    formatted = reporting_service.format_records(raw_records)

    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

    if format == "csv":
        csv_content = reporting_service.generate_csv(formatted)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=attendance_report_{timestamp}.csv"}
        )
    else: # Excel
        excel_bytes = reporting_service.generate_excel(formatted)
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=attendance_report_{timestamp}.xlsx"}
        )

@router.get("/stats/teacher")
def get_teacher_dashboard_analytics(
    user: User = Depends(require_role(["teacher", "admin"])),
    db: Session = Depends(get_db)
):
    teacher_id = user.teacher_profile.id if user.teacher_profile else None
    stats = attendance_service.get_teacher_stats(db, teacher_id)

    # 7-day attendance trend
    today = datetime.date.today()
    trend = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_str = day.strftime("%b %d")
        
        present_count = db.query(Attendance).filter(
            Attendance.attendance_date == day,
            Attendance.status.in_(["present", "late"])
        ).count()
        absent_count = db.query(Attendance).filter(
            Attendance.attendance_date == day,
            Attendance.status == "absent"
        ).count()
        
        trend.append({
            "date": day_str,
            "present": present_count,
            "absent": absent_count
        })

    # Subject-wise attendance distribution
    subject_chart = []
    subjects = db.query(Subject).all()
    for s in subjects:
        total = db.query(Attendance).filter(Attendance.subject_id == s.id).count()
        present = db.query(Attendance).filter(
            Attendance.subject_id == s.id,
            Attendance.status.in_(["present", "late"])
        ).count()
        pct = round((present / total * 100), 1) if total > 0 else 0.0
        subject_chart.append({
            "name": s.subject_code,
            "fullName": s.subject_name,
            "attendancePct": pct,
            "totalSessions": total
        })

    return {
        "cards": stats,
        "weekly_trend": trend,
        "subject_distribution": subject_chart
    }

@router.get("/stats/student")
def get_student_dashboard_analytics(
    user: User = Depends(require_role(["student"])),
    db: Session = Depends(get_db)
):
    if not user.student_profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    student_id = user.student_profile.id
    stats = attendance_service.get_student_stats(db, student_id)
    
    # Recent attendance records
    recent = reporting_service.get_attendance_query(db, student_id=student_id).limit(10).all()

    return {
        "student": {
            "name": user.student_profile.name,
            "student_id": user.student_profile.student_id,
            "department": user.student_profile.department,
            "course": user.student_profile.course,
            "semester": user.student_profile.semester,
            "face_registered": user.student_profile.face_registered
        },
        "stats": stats,
        "recent_history": reporting_service.format_records(recent)
    }

@router.get("/stats/admin")
def get_admin_dashboard_analytics(
    user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_students = db.query(Student).count()
    active_students = db.query(Student).filter(Student.is_active == True).count()
    face_registered_students = db.query(Student).filter(Student.face_registered == True).count()
    total_teachers = db.query(Teacher).count()
    total_subjects = db.query(Subject).count()
    total_classes = db.query(ClassEntity).count()
    total_records = db.query(Attendance).count()

    today = datetime.date.today()
    today_records = db.query(Attendance).filter(Attendance.attendance_date == today).all()
    present_today = sum(1 for r in today_records if r.status in ["present", "late"])
    
    face_reg_pct = round((face_registered_students / total_students * 100), 1) if total_students > 0 else 0.0

    # Department breakdown
    dept_counts = db.query(Student.department, func.count(Student.id)).group_by(Student.department).all()
    departments_data = [{"department": dept, "students": count} for dept, count in dept_counts]

    return {
        "total_students": total_students,
        "active_students": active_students,
        "face_registered_students": face_registered_students,
        "face_registration_rate": face_reg_pct,
        "total_teachers": total_teachers,
        "total_subjects": total_subjects,
        "total_classes": total_classes,
        "total_records": total_records,
        "present_today": present_today,
        "department_distribution": departments_data
    }
