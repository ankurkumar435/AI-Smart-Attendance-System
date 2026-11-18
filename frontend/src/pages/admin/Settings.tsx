import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Settings as SettingsIcon,
  Database,
  ShieldCheck,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  FileCheck
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form thresholds
  const [faceThreshold, setFaceThreshold] = useState<number>(0.72);
  const [attendanceThreshold, setAttendanceThreshold] = useState<number>(75);

  const [savingSettings, setSavingSettings] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, bRes] = await Promise.all([
        api.settings.get(),
        api.backup.list(),
      ]);
      setSettingsData(sRes);
      setFaceThreshold(sRes.face_match_threshold);
      setAttendanceThreshold(sRes.attendance_threshold);
      setBackups(bRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      await api.settings.update({
        face_match_threshold: faceThreshold,
        attendance_threshold: attendanceThreshold,
      });
      setStatusMessage('Threshold configurations updated successfully.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateBackup = async () => {
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.backup.create();
      setStatusMessage(`Backup created: ${res.filename} (${(res.size_bytes / 1024).toFixed(1)} KB)`);
      const bRes = await api.backup.list();
      setBackups(bRes);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create backup');
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to restore database from '${filename}'?\n\nA safety pre-restore backup of the current database will be saved before restoring.`)) {
      return;
    }

    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await api.backup.restore(filename);
      setStatusMessage(res.message);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to restore database');
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
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Settings & Local Backups</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure recognition sensitivity, attendance criteria, and manage local encrypted database snapshots.
        </p>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Settings Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <SettingsIcon className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800">Recognition & Attendance Rules</h2>
            </div>

            <form onSubmit={handleSaveThresholds} className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Face Recognition Match Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {Math.round(faceThreshold * 100)}% ({faceThreshold})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.50"
                  max="0.95"
                  step="0.01"
                  value={faceThreshold}
                  onChange={(e) => setFaceThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Higher threshold increases strictness against false positives. Lower values accommodate varied room lighting.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Mandatory Attendance Warning Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    {attendanceThreshold}%
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="90"
                  step="1"
                  value={attendanceThreshold}
                  onChange={(e) => setAttendanceThreshold(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Students whose attendance percentage falls below this threshold receive an urgent warning banner on their dashboard.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  {savingSettings ? 'Saving Settings...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          {/* Local Security & Architecture Info */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3>Local Architecture & Security Verification</h3>
            </div>

            <div className="text-xs space-y-2.5 text-slate-600">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                <span className="text-slate-500">Storage Engine:</span>
                <span className="font-bold text-slate-800">Local SQLite (attendance.db)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                <span className="text-slate-500">Physical Path:</span>
                <span className="font-bold text-slate-800 truncate max-w-[240px]" title={settingsData?.database_path}>
                  {settingsData?.database_path}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                <span className="text-slate-500">Biometric Cipher:</span>
                <span className="font-bold text-emerald-700">AES-256-GCM (Authenticated)</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-[11px]">
                <span className="text-slate-500">Cloud Status:</span>
                <span className="font-bold text-emerald-700">Disabled (100% Localhost)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Database Backup Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Local Database Backups</h3>
              </div>
              <button
                onClick={handleCreateBackup}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Create Backup</span>
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Create complete physical snapshots of the SQLite database. Backups are stored in the local <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px]">./backups/</code> directory.
            </p>

            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {backups.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <HardDrive className="w-8 h-8 stroke-1 mx-auto mb-2 text-slate-300" />
                  <span>No backup files found yet. Click &quot;Create Backup&quot; to take a snapshot.</span>
                </div>
              ) : (
                backups.map((b, i) => (
                  <div
                    key={i}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between hover:bg-slate-100/80 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-mono font-bold text-slate-800">{b.filename}</p>
                      <p className="text-[11px] text-slate-400">
                        {new Date(b.created_at).toLocaleString()} • {(b.size_bytes / 1024).toFixed(1)} KB
                      </p>
                    </div>

                    <button
                      onClick={() => handleRestoreBackup(b.filename)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
