import csv
import io
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.models.models import Attendance, Student, Subject, ClassEntity, Teacher

class ReportingService:
    @staticmethod
    def get_attendance_query(
        db: Session,
        student_id: Optional[int] = None,
        subject_id: Optional[int] = None,
        class_id: Optional[int] = None,
        teacher_id: Optional[int] = None,
        department: Optional[str] = None,
        course: Optional[str] = None,
        semester: Optional[int] = None,
        section: Optional[str] = None,
        date_from: Optional[datetime.date] = None,
        date_to: Optional[datetime.date] = None,
        status: Optional[str] = None,
        search: Optional[str] = None
    ):
        query = db.query(
            Attendance, Student, Subject, ClassEntity
        ).join(
            Student, Attendance.student_id == Student.id
        ).join(
            Subject, Attendance.subject_id == Subject.id
        ).join(
            ClassEntity, Attendance.class_id == ClassEntity.id
        )

        filters = []
        if student_id:
            filters.append(Attendance.student_id == student_id)
        if subject_id:
            filters.append(Attendance.subject_id == subject_id)
        if class_id:
            filters.append(Attendance.class_id == class_id)
        if teacher_id:
            filters.append(ClassEntity.teacher_id == teacher_id)
        if department:
            filters.append(Student.department == department)
        if course:
            filters.append(Student.course == course)
        if semester:
            filters.append(Student.semester == semester)
        if section:
            filters.append(Student.section == section)
        if date_from:
            filters.append(Attendance.attendance_date >= date_from)
        if date_to:
            filters.append(Attendance.attendance_date <= date_to)
        if status:
            filters.append(Attendance.status == status.lower())
        if search:
            search_term = f"%{search}%"
            filters.append(
                (Student.name.ilike(search_term)) | 
                (Student.student_id.ilike(search_term)) |
                (Subject.subject_name.ilike(search_term)) |
                (Subject.subject_code.ilike(search_term))
            )

        if filters:
            query = query.filter(and_(*filters))

        return query.order_by(Attendance.attendance_date.desc(), Attendance.check_in_time.desc())

    @staticmethod
    def format_records(raw_results: List[Any]) -> List[Dict[str, Any]]:
        formatted = []
        for att, stu, subj, cls in raw_results:
            formatted.append({
                "id": att.id,
                "student_id": stu.id,
                "student_code": stu.student_id,
                "student_name": stu.name,
                "department": stu.department,
                "course": stu.course,
                "semester": stu.semester,
                "section": stu.section,
                "subject_id": subj.id,
                "subject_code": subj.subject_code,
                "subject_name": subj.subject_name,
                "class_id": cls.id,
                "class_name": cls.class_name,
                "attendance_date": att.attendance_date.isoformat(),
                "check_in_time": att.check_in_time.strftime("%I:%M:%S %p"),
                "status": att.status,
                "recognition_method": att.recognition_method,
                "confidence": att.confidence
            })
        return formatted

    @staticmethod
    def generate_csv(records: List[Dict[str, Any]]) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Record ID", "Student ID", "Student Name", "Department", 
            "Course", "Semester", "Section", "Subject Code", 
            "Subject Name", "Class Name", "Date", "Check-in Time", 
            "Status", "Method", "Confidence"
        ])
        
        for r in records:
            conf_str = f"{round(r['confidence'] * 100, 1)}%" if r.get('confidence') else "N/A"
            writer.writerow([
                r["id"],
                r["student_code"],
                r["student_name"],
                r["department"],
                r["course"],
                r["semester"],
                r["section"],
                r["subject_code"],
                r["subject_name"],
                r["class_name"],
                r["attendance_date"],
                r["check_in_time"],
                r["status"].capitalize(),
                r["recognition_method"].capitalize(),
                conf_str
            ])
            
        return output.getvalue()

    @staticmethod
    def generate_excel(records: List[Dict[str, Any]]) -> bytes:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Attendance Records"

        headers = [
            "Record ID", "Student ID", "Student Name", "Department", 
            "Course", "Semester", "Section", "Subject Code", 
            "Subject Name", "Class Name", "Date", "Check-in Time", 
            "Status", "Method", "Confidence"
        ]

        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        alignment_center = Alignment(horizontal="center", vertical="center")

        ws.append(headers)

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = alignment_center

        row_font = Font(name="Segoe UI", size=10)
        
        for r in records:
            conf_str = f"{round(r['confidence'] * 100, 1)}%" if r.get('confidence') else "N/A"
            ws.append([
                r["id"],
                r["student_code"],
                r["student_name"],
                r["department"],
                r["course"],
                r["semester"],
                r["section"],
                r["subject_code"],
                r["subject_name"],
                r["class_name"],
                r["attendance_date"],
                r["check_in_time"],
                r["status"].capitalize(),
                r["recognition_method"].capitalize(),
                conf_str
            ])

        # Auto-adjust column widths
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = max(max_len + 3, 12)

        buffer = io.BytesIO()
        wb.save(buffer)
        buffer.seek(0)
        return buffer.getvalue()

reporting_service = ReportingService()
