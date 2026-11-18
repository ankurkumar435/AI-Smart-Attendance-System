import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  FileSpreadsheet,
  Settings,
  Camera,
  UserCheck,
  ClipboardList
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const getLinks = () => {
    if (user?.role === 'admin') {
      return [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/students', label: 'Students', icon: GraduationCap },
        { to: '/admin/teachers', label: 'Teachers', icon: Users },
        { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
        { to: '/admin/classes', label: 'Classes & Rooms', icon: CalendarDays },
        { to: '/admin/attendance', label: 'Attendance Records', icon: CheckCircle2 },
        { to: '/admin/reports', label: 'Reports & Export', icon: FileSpreadsheet },
        { to: '/admin/settings', label: 'Settings & Backups', icon: Settings },
      ];
    } else if (user?.role === 'teacher') {
      return [
        { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/teacher/attendance', label: 'Take Attendance', icon: Camera, highlight: true },
        { to: '/teacher/students', label: 'Students', icon: GraduationCap },
        { to: '/teacher/subjects', label: 'My Subjects', icon: BookOpen },
        { to: '/teacher/reports', label: 'Attendance Reports', icon: FileSpreadsheet },
      ];
    } else if (user?.role === 'student') {
      return [
        { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/student/profile', label: 'My Profile', icon: UserCheck },
        { to: '/student/register-face', label: 'Register Face', icon: Camera, highlight: true },
        { to: '/student/attendance', label: 'My Attendance', icon: ClipboardList },
      ];
    }
    return [];
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-65px)]">
      <div className="p-4 border-b border-slate-800">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          {user?.role} Portal
        </div>
        <p className="text-xs text-slate-400 px-3">
          Local Biometric Node
        </p>
      </div>

      <nav className="p-3 space-y-1.5 flex-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-sm'
                    : link.highlight
                    ? 'text-blue-400 hover:bg-slate-800/80 hover:text-white border border-blue-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
              {link.highlight && (
                <span className="ml-auto w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Local storage privacy badge footer */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>100% Local Storage</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          SQLite encrypted with AES-256-GCM. No cloud biometric sync.
        </p>
      </div>
    </aside>
  );
};
