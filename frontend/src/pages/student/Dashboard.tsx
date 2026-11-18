import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/StatsCard';
import { api } from '../../services/api';
import type { StudentAttendanceStats, AttendanceRecord } from '../../types';
import {
  UserCheck,
  UserX,
  Clock,
  Percent,
  AlertTriangle,
  Camera,
  Calendar,
  BookOpen,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

export const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<{
    student: any;
    stats: StudentAttendanceStats;
    recent_history: AttendanceRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const res = await api.reports.getStudentStats();
        setData(res);
      } catch (err) {
        console.error('Failed to load student dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStudentData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const student = data?.student;
  const stats = data?.stats;
  const recent = data?.recent_history || [];

  return (
    <div className="space-y-6">
      {/* Student Welcome Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Welcome back, {student?.name}!
            </h1>
            <span className="bg-white/20 text-white font-mono text-xs px-2.5 py-0.5 rounded-full font-bold">
              {student?.student_id}
            </span>
          </div>
          <p className="text-blue-200 text-xs mt-1">
            {student?.course} • {student?.department} (Semester {student?.semester})
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!student?.face_registered ? (
            <button
              onClick={() => navigate('/student/register-face')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition-all animate-pulse"
            >
              <Camera className="w-4 h-4" />
              <span>Enroll Face Biometrics</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Face Registered</span>
            </div>
          )}
        </div>
      </div>

      {/* Low Attendance Warning Alert (Section 15) */}
      {stats?.low_attendance_warning && (
        <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-sm flex items-start gap-3">
          <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold flex items-center gap-1.5 text-amber-800">
              Low Attendance Warning
            </h4>
            <p className="text-xs text-amber-800">
              Your overall attendance is currently <strong>{stats.overall_percentage}%</strong>, which is below the mandatory college requirement of <strong>{stats.threshold}%</strong>.
            </p>
            <p className="text-[11px] text-amber-700">
              Please attend upcoming lectures regularly to avoid debarment from semester examinations.
            </p>
          </div>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Overall Attendance"
          value={`${stats?.overall_percentage || 0}%`}
          icon={Percent}
          color={(stats?.overall_percentage || 0) >= (stats?.threshold || 75) ? 'emerald' : 'amber'}
          subtext={`Target: ${stats?.threshold || 75}% min`}
        />
        <StatsCard
          title="Classes Attended"
          value={stats?.present_count || 0}
          icon={UserCheck}
          color="emerald"
          subtext={`Out of ${stats?.total_classes || 0} held`}
        />
        <StatsCard
          title="Classes Missed"
          value={stats?.absent_count || 0}
          icon={UserX}
          color="red"
        />
        <StatsCard
          title="Late Check-ins"
          value={stats?.late_count || 0}
          icon={Clock}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Subject-Wise Breakdown Chart */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                Subject-Wise Attendance
              </h3>
              <p className="text-xs text-slate-500">Your percentage per registered subject</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.subject_breakdown || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="subject_code" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, 'Attendance']}
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                />
                <Bar dataKey="percentage" name="Attendance %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Attendance History Table */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Recent Attendance History
              </h3>
              <p className="text-xs text-slate-500">Read-only verified biometric check-ins</p>
            </div>
            <button
              onClick={() => navigate('/student/attendance')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto max-h-[260px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Subject</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No attendance sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  recent.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-slate-800">{record.attendance_date}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {record.subject_code} ({record.subject_name})
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{record.check_in_time}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            record.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : record.status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
