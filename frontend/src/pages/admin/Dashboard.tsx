import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatsCard } from '../../components/StatsCard';
import { api } from '../../services/api';
import type { AdminDashboardStats } from '../../types';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Database,
  PlusCircle,
  FileSpreadsheet,
  Settings
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

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminStats = async () => {
      try {
        const data = await api.reports.getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">System Administration</h1>
            <span className="bg-purple-500/30 text-purple-200 border border-purple-400/40 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Root Node
            </span>
          </div>
          <p className="text-purple-200 text-xs mt-1">
            Local biometric database management, enrollment metrics, and system configuration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/settings')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition-all"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Database & Backups</span>
          </button>
          <button
            onClick={() => navigate('/admin/students')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manage Students</span>
          </button>
        </div>
      </div>

      {/* 6 Key Admin Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Total Students"
          value={stats?.total_students || 0}
          icon={GraduationCap}
          color="blue"
        />
        <StatsCard
          title="Face Registered"
          value={`${stats?.face_registration_rate || 0}%`}
          icon={ShieldCheck}
          color="emerald"
          badge={`${stats?.face_registered_students || 0} students`}
        />
        <StatsCard
          title="Teachers"
          value={stats?.total_teachers || 0}
          icon={Users}
          color="purple"
        />
        <StatsCard
          title="Subjects"
          value={stats?.total_subjects || 0}
          icon={BookOpen}
          color="amber"
        />
        <StatsCard
          title="Classes / Labs"
          value={stats?.total_classes || 0}
          icon={CalendarDays}
          color="blue"
        />
        <StatsCard
          title="Present Today"
          value={stats?.present_today || 0}
          icon={CheckCircle2}
          color="emerald"
          badge="Live Today"
        />
      </div>

      {/* Chart and Quick Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Distribution Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-purple-600" />
              Student Enrollment by Department
            </h3>
            <p className="text-xs text-slate-500">Distribution across university faculties</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.department_distribution || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                <Bar dataKey="students" name="Students" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Administration Shortcuts */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-4 h-4 text-purple-600" />
              Administrative Operations
            </h3>
            <p className="text-xs text-slate-500 mb-4">Core database and operational controllers</p>

            <div className="space-y-2.5">
              <button
                onClick={() => navigate('/admin/students')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">Student Biometrics Directory</p>
                  <p className="text-[11px] text-slate-500">Enroll, edit profiles, or purge biometric templates</p>
                </div>
                <span className="text-slate-400 group-hover:text-purple-600 font-bold text-sm">→</span>
              </button>

              <button
                onClick={() => navigate('/admin/teachers')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">Faculty & Teacher Assignments</p>
                  <p className="text-[11px] text-slate-500">Manage instructor accounts and course allocations</p>
                </div>
                <span className="text-slate-400 group-hover:text-purple-600 font-bold text-sm">→</span>
              </button>

              <button
                onClick={() => navigate('/admin/settings')}
                className="w-full p-3 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 flex items-center justify-between text-left transition-all group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700">Local Database Backups</p>
                  <p className="text-[11px] text-slate-500">Snapshot SQLite database and restore snapshots</p>
                </div>
                <span className="text-slate-400 group-hover:text-purple-600 font-bold text-sm">→</span>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Local Database Healthy
            </span>
            <span>Total Records: {stats?.total_records || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
