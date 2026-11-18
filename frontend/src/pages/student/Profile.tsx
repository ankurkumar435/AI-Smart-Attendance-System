import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Camera,
  Trash2,
  Mail,
  GraduationCap,
  Hash,
  Layers,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const StudentProfile: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.auth.getProfile();
        setProfile(res.profile);
      } catch (err: any) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleDeleteFace = async () => {
    if (!profile) return;
    if (!window.confirm('Are you sure you want to delete your registered biometric face template? You will need to re-register before facial attendance can mark you present.')) {
      return;
    }

    try {
      await api.face.deleteBiometrics(profile.student_id);
      setMessage('Face biometric template deleted successfully.');
      setProfile({ ...profile, face_registered: false });
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to delete biometric data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your enrolled university details and biometric privacy settings.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center font-bold text-2xl shadow-md">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-blue-500/20 text-blue-300 font-mono text-xs px-2.5 py-0.5 rounded-md font-bold">
                  {profile?.student_id}
                </span>
                <span className="text-xs text-slate-400">Section {profile?.section}</span>
              </div>
            </div>
          </div>

          <div>
            {profile?.face_registered ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-xl text-emerald-300 text-xs font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Biometrics Enrolled</span>
              </div>
            ) : (
              <button
                onClick={() => navigate('/student/register-face')}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Register Face Now</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Info Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.email || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Course Program</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.course || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.department || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <Hash className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Semester & Section</p>
                <p className="text-sm font-semibold text-slate-800">
                  Semester {profile?.semester} • Section {profile?.section}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Roll Number</p>
                <p className="text-sm font-semibold text-slate-800">{profile?.roll_number || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Local Biometric Encryption</p>
                <p className="text-sm font-semibold text-slate-800">
                  {profile?.face_registered ? 'AES-256-GCM (Protected)' : 'Not yet enrolled'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Biometric Management Section */}
        {profile?.face_registered && (
          <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Delete Face Biometric Data</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Permanently purge your facial mathematical embedding from the local encrypted database.
              </p>
            </div>
            <button
              onClick={handleDeleteFace}
              className="flex items-center gap-1.5 px-4 py-2 border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Biometric Template</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
