export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  name: string;
  require_password_change: boolean;
  profile_id?: number | null;
  student_id?: string | null;
  teacher_id?: string | null;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  email: string;
  phone?: string | null;
  course: string;
  department: string;
  semester: number;
  section: string;
  roll_number?: string | null;
  face_registered: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone?: string | null;
  department: string;
  designation: string;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: number;
  subject_code: string;
  subject_name: string;
  department: string;
  semester: number;
  teacher_id?: number | null;
  teacher_name?: string | null;
  created_at: string;
}

export interface ClassEntity {
  id: number;
  subject_id: number;
  subject_name?: string | null;
  subject_code?: string | null;
  teacher_id?: number | null;
  teacher_name?: string | null;
  class_name: string;
  room: string;
  schedule?: string | null;
  created_at: string;
}

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_code: string;
  student_name: string;
  department: string;
  course: string;
  semester: number;
  section: string;
  subject_id: number;
  subject_code: string;
  subject_name: string;
  class_id: number;
  class_name: string;
  attendance_date: string;
  check_in_time: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  recognition_method: 'face' | 'manual';
  confidence?: number | null;
}

export interface SubjectAttendanceStat {
  subject_code: string;
  subject_name: string;
  total_classes: number;
  attended_classes: number;
  percentage: number;
  is_low: boolean;
}

export interface StudentAttendanceStats {
  total_classes: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  overall_percentage: number;
  threshold: number;
  low_attendance_warning: boolean;
  subject_breakdown: SubjectAttendanceStat[];
}

export interface TeacherDashboardStats {
  cards: {
    total_students: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    attendance_percentage_today: number;
  };
  weekly_trend: Array<{
    date: string;
    present: number;
    absent: number;
  }>;
  subject_distribution: Array<{
    name: string;
    fullName: string;
    attendancePct: number;
    totalSessions: number;
  }>;
}

export interface AdminDashboardStats {
  total_students: number;
  active_students: number;
  face_registered_students: number;
  face_registration_rate: number;
  total_teachers: number;
  total_subjects: number;
  total_classes: number;
  total_records: number;
  present_today: number;
  department_distribution: Array<{
    department: string;
    students: number;
  }>;
}
