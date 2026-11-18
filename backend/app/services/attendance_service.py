import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, distinct
from typing import Optional, Dict, Any, List
from app.models.models import (
    Attendance, AttendanceSession, ClassEntity, Subject, Student, Teacher
)
from app.config import settings

class AttendanceService:
    @staticmethod
    def mark_attendance(
        db: Session,
        student_id: int,
        class_id: int,
        recognition_method: str = "face",
        confidence: Optional[float] = None,
        attendance_date: Optional[datetime.date] = None,
        session_id: Optional[int] = None,
        status: str = "present"
    ) -> Dict[str, Any]:
        """
        Marks attendance for a student with strict duplicate prevention.
        """
        if attendance_date is None:
            attendance_date = datetime.date.today()

        now = datetime.datetime.utcnow()

        # Retrieve class and subject
        class_obj = db.query(ClassEntity).filter(ClassEntity.id == class_id).first()
        if not class_obj:
            raise ValueError(f"Class with ID {class_id} not found")

        subject_id = class_obj.subject_id

        # Check for existing attendance today for this student, subject, and class
        existing = db.query(Attendance).filter(
            and_(
                Attendance.student_id == student_id,
                Attendance.subject_id == subject_id,
                Attendance.class_id == class_id,
                Attendance.attendance_date == attendance_date
            )
        ).first()

        if existing:
            check_in_local = existing.check_in_time.strftime("%I:%M %p")
            return {
                "success": False,
                "already_marked": True,
                "attendance_id": existing.id,
                "status": existing.status,
                "message": f"Attendance already recorded today at {check_in_local} ({existing.status})"
            }

        # Create new attendance record
        new_attendance = Attendance(
            student_id=student_id,
            subject_id=subject_id,
            class_id=class_id,
            session_id=session_id,
            attendance_date=attendance_date,
            check_in_time=now,
            status=status,
            recognition_method=recognition_method,
            confidence=confidence
        )

        db.add(new_attendance)
        db.commit()
        db.refresh(new_attendance)

        return {
            "success": True,
            "already_marked": False,
            "attendance_id": new_attendance.id,
            "status": new_attendance.status,
            "check_in_time": new_attendance.check_in_time.strftime("%I:%M %p"),
            "message": f"Attendance successfully marked as {status.capitalize()}"
        }

    @staticmethod
    def get_student_stats(db: Session, student_id: int) -> Dict[str, Any]:
        """
        Calculates attendance statistics for a single student.
        """
        total_records = db.query(Attendance).filter(Attendance.student_id == student_id).count()
        present_count = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.status.in_(["present", "late"])
        ).count()
        absent_count = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.status == "absent"
        ).count()
        late_count = db.query(Attendance).filter(
            Attendance.student_id == student_id,
            Attendance.status == "late"
        ).count()

        percentage = round((present_count / total_records * 100), 1) if total_records > 0 else 0.0
        low_attendance_warning = percentage < settings.ATTENDANCE_THRESHOLD and total_records > 0

        # Subject-wise statistics
        subject_stats = []
        subjects = db.query(Subject).all()
        for subj in subjects:
            subj_total = db.query(Attendance).filter(
                Attendance.student_id == student_id,
                Attendance.subject_id == subj.id
            ).count()
            if subj_total > 0:
                subj_present = db.query(Attendance).filter(
                    Attendance.student_id == student_id,
                    Attendance.subject_id == subj.id,
                    Attendance.status.in_(["present", "late"])
                ).count()
                subj_pct = round((subj_present / subj_total * 100), 1)
                subject_stats.append({
                    "subject_code": subj.subject_code,
                    "subject_name": subj.subject_name,
                    "total_classes": subj_total,
                    "attended_classes": subj_present,
                    "percentage": subj_pct,
                    "is_low": subj_pct < settings.ATTENDANCE_THRESHOLD
                })

        return {
            "total_classes": total_records,
            "present_count": present_count,
            "absent_count": absent_count,
            "late_count": late_count,
            "overall_percentage": percentage,
            "threshold": settings.ATTENDANCE_THRESHOLD,
            "low_attendance_warning": low_attendance_warning,
            "subject_breakdown": subject_stats
        }

    @staticmethod
    def get_teacher_stats(db: Session, teacher_id: Optional[int]) -> Dict[str, Any]:
        """
        Calculates high-level statistics for teacher dashboard.
        """
        today = datetime.date.today()
        
        # Base query for classes managed by teacher
        classes_query = db.query(ClassEntity)
        if teacher_id:
            classes_query = classes_query.filter(ClassEntity.teacher_id == teacher_id)
        class_ids = [c.id for c in classes_query.all()]

        total_students = db.query(Student).filter(Student.is_active == True).count()

        # Today's attendance
        today_attendance = db.query(Attendance).filter(
            Attendance.attendance_date == today
        )
        if class_ids:
            today_attendance = today_attendance.filter(Attendance.class_id.in_(class_ids))

        today_records = today_attendance.all()
        present_today = sum(1 for r in today_records if r.status in ["present", "late"])
        late_today = sum(1 for r in today_records if r.status == "late")
        absent_today = sum(1 for r in today_records if r.status == "absent")

        pct_today = round((present_today / total_students * 100), 1) if total_students > 0 else 0.0

        return {
            "total_students": total_students,
            "present_today": present_today,
            "absent_today": absent_today,
            "late_today": late_today,
            "attendance_percentage_today": pct_today
        }

attendance_service = AttendanceService()
