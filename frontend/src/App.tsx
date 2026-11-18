import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Auth
import { Login } from './pages/auth/Login';

// Admin
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminStudents } from './pages/admin/Students';
import { AdminTeachers } from './pages/admin/Teachers';
import { AdminSubjects } from './pages/admin/Subjects';
import { AdminClasses } from './pages/admin/Classes';
import { AdminAttendance } from './pages/admin/Attendance';
import { AdminReports } from './pages/admin/Reports';
import { AdminSettings } from './pages/admin/Settings';

// Teacher
import { TeacherDashboard } from './pages/teacher/Dashboard';
import { AttendanceSession } from './pages/teacher/AttendanceSession';
import { TeacherStudents } from './pages/teacher/Students';
import { TeacherSubjects } from './pages/teacher/Subjects';
import { TeacherReports } from './pages/teacher/Reports';

// Student
import { StudentDashboard } from './pages/student/Dashboard';
import { StudentProfile } from './pages/student/Profile';
import { RegisterFace } from './pages/student/RegisterFace';
import { StudentAttendance } from './pages/student/Attendance';

const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />;
  if (user.role === 'student') return <Navigate to="/student/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<HomeRedirect />} />

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/students" element={<AdminStudents />} />
              <Route path="/admin/teachers" element={<AdminTeachers />} />
              <Route path="/admin/subjects" element={<AdminSubjects />} />
              <Route path="/admin/classes" element={<AdminClasses />} />
              <Route path="/admin/attendance" element={<AdminAttendance />} />
              <Route path="/admin/reports" element={<AdminReports />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Teacher Routes */}
          <Route element={<ProtectedRoute allowedRoles={['teacher', 'admin']} />}>
            <Route element={<Layout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/attendance" element={<AttendanceSession />} />
              <Route path="/teacher/students" element={<TeacherStudents />} />
              <Route path="/teacher/subjects" element={<TeacherSubjects />} />
              <Route path="/teacher/reports" element={<TeacherReports />} />
            </Route>
          </Route>

          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<Layout />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/profile" element={<StudentProfile />} />
              <Route path="/student/register-face" element={<RegisterFace />} />
              <Route path="/student/attendance" element={<StudentAttendance />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
