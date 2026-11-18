import React, { useState, useEffect, useRef } from 'react';
import { CameraFeed } from '../../components/CameraFeed';
import type { CameraFeedRef } from '../../components/CameraFeed';
import { api } from '../../services/api';
import type { Subject, ClassEntity } from '../../types';
import {
  Camera,
  Play,
  Square,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Clock,
  Sparkles,
  ShieldCheck,
  UserX,
  Plus
} from 'lucide-react';

interface AttendanceLogItem {
  id: string;
  studentId: string;
  name: string;
  status: string;
  time: string;
  confidence?: number;
  isDuplicate?: boolean;
}

export const AttendanceSession: React.FC = () => {
  const cameraRef = useRef<CameraFeedRef>(null);

  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | ''>('');
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);

  // Session state
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<string | null>(null);

  // Recognition state
  const [isScanning, setIsScanning] = useState(false);
  const [boundingBox, setBoundingBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [boxLabel, setBoxLabel] = useState<string>('');
  const [boxColor, setBoxColor] = useState<'green' | 'red' | 'blue' | 'amber'>('green');
  const [statusMessage, setStatusMessage] = useState<string>('Ready to start attendance session.');

  // Live marked attendance list
  const [attendanceLog, setAttendanceLog] = useState<AttendanceLogItem[]>([]);

  // Manual marking modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualStudentCode, setManualStudentCode] = useState('');
  const [manualStatus, setManualStatus] = useState('present');

  // Load classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const data = await api.classes.getAll();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClassId(data[0].id);
          setSelectedClass(data[0]);
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    fetchClasses();
  }, []);

  // Update selected class object
  const handleClassChange = (classId: number) => {
    setSelectedClassId(classId);
    const found = classes.find((c) => c.id === classId) || null;
    setSelectedClass(found);
  };

  // Start Session
  const handleStartSession = async () => {
    if (!selectedClassId) return;
    try {
      const res = await api.attendance.startSession(Number(selectedClassId));
      setSessionId(res.id);
      setSessionActive(true);
      setSessionStartTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setStatusMessage('Attendance session active. Camera is scanning for students...');
    } catch (err: any) {
      alert(err.message || 'Failed to start attendance session');
    }
  };

  // End Session
  const handleEndSession = async () => {
    if (!sessionId) return;
    try {
      await api.attendance.endSession(sessionId);
      setSessionActive(false);
      setSessionId(null);
      setBoundingBox(null);
      setBoxLabel('');
      setStatusMessage('Attendance session completed.');
    } catch (err: any) {
      alert(err.message || 'Failed to end attendance session');
    }
  };

  // Continuous Face Recognition Loop
  useEffect(() => {
    if (!sessionActive || !selectedClassId) return;

    const interval = setInterval(async () => {
      if (isScanning || !cameraRef.current) return;

      const frame = cameraRef.current.captureFrame();
      if (!frame) return;

      setIsScanning(true);
      try {
        const res = await api.face.recognize({
          image: frame,
          class_id: Number(selectedClassId),
          session_id: sessionId,
        });

        if (res.bounding_box) {
          setBoundingBox(res.bounding_box);
        } else {
          setBoundingBox(null);
        }

        if (res.matched && res.student_name) {
          const confPct = Math.round(res.confidence * 100);
          setBoxLabel(`${res.student_name} (${confPct}%)`);
          setBoxColor('green');
          setStatusMessage(`Recognized: ${res.student_name} - ${res.message}`);

          // Append to log if not already logged in current view
          setAttendanceLog((prev) => {
            const exists = prev.find((item) => item.studentId === res.student_id);
            if (exists) {
              return prev;
            }
            return [
              {
                id: String(Date.now()),
                studentId: res.student_id || 'STU',
                name: res.student_name || 'Student',
                status: res.status || 'present',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                confidence: res.confidence,
                isDuplicate: !res.attendance_marked,
              },
              ...prev,
            ];
          });
        } else if (res.face_detected) {
          setBoxLabel(`Unknown Face (${Math.round(res.confidence * 100)}%)`);
          setBoxColor('amber');
          setStatusMessage('Face detected, but does not match any registered student above threshold.');
        } else {
          setBoxLabel('');
          setBoundingBox(null);
          setStatusMessage('Align student face inside camera preview.');
        }
      } catch (err: any) {
        // Quiet non-blocking error in loop
      } finally {
        setIsScanning(false);
      }
    }, 1400); // 1.4s scan interval for real-time responsiveness

    return () => clearInterval(interval);
  }, [sessionActive, selectedClassId, sessionId, isScanning]);

  // Handle Manual Attendance Mark
  const handleManualMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId || !manualStudentCode) return;

    try {
      const res = await api.attendance.markManual({
        student_id: manualStudentCode.trim(),
        class_id: Number(selectedClassId),
        status: manualStatus,
        session_id: sessionId,
      });

      alert(res.message);
      setAttendanceLog((prev) => [
        {
          id: String(Date.now()),
          studentId: manualStudentCode.trim(),
          name: `Student (${manualStudentCode})`,
          status: manualStatus,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isDuplicate: res.already_marked,
        },
        ...prev,
      ]);
      setShowManualModal(false);
      setManualStudentCode('');
    } catch (err: any) {
      alert(err.message || 'Failed to mark manual attendance');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Control Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Live Attendance Session</h1>
            {sessionActive ? (
              <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                SESSION ACTIVE
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Idle
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time automated face recognition and instant local attendance marking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Class:</label>
            <select
              value={selectedClassId}
              disabled={sessionActive}
              onChange={(e) => handleClassChange(Number(e.target.value))}
              className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name} ({cls.room})
                </option>
              ))}
            </select>
          </div>

          {!sessionActive ? (
            <button
              onClick={handleStartSession}
              disabled={!selectedClassId}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Session</span>
            </button>
          ) : (
            <button
              onClick={handleEndSession}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>End Session</span>
            </button>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Camera Recognition Feed Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Webcam Scanner</span>
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                {sessionStartTime && (
                  <span className="flex items-center gap-1 font-medium">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Started at {sessionStartTime}
                  </span>
                )}
              </div>
            </div>

            <CameraFeed
              ref={cameraRef}
              boundingBox={boundingBox}
              boxLabel={boxLabel}
              boxColor={boxColor}
              scanning={sessionActive}
            />

            {/* Live Status Display */}
            <div className="mt-4 p-3 rounded-xl bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${sessionActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span className="text-xs font-medium font-mono">{statusMessage}</span>
              </div>
              {sessionActive && (
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  Continuous Match ON
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Attendance Roll Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm min-h-[480px] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Live Attendance Log</h3>
                <p className="text-[11px] text-slate-500">
                  {selectedClass?.class_name || 'Class Session'}
                </p>
              </div>
              <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {attendanceLog.length} Marked
              </span>
            </div>

            {/* Attendance list items */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
              {attendanceLog.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <UserCheck className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
                  <p className="text-xs font-semibold">No students marked yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                    Start session and have students look directly at the webcam.
                  </p>
                </div>
              ) : (
                attendanceLog.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-800">{item.name}</p>
                          <span className="text-[10px] text-slate-500 font-mono">({item.studentId})</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Checked-in at {item.time}
                          {item.confidence && ` • ${Math.round(item.confidence * 100)}% match`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      {item.isDuplicate ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Already Marked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Local Security Footnote */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                No Cloud Sync • Stored Locally
              </span>
              <span>Duplicate Attendance Protected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Manual Attendance Override</h3>
            <form onSubmit={handleManualMark} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student ID (e.g. STU001)</label>
                <input
                  type="text"
                  required
                  value={manualStudentCode}
                  onChange={(e) => setManualStudentCode(e.target.value)}
                  placeholder="Enter Student ID"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={manualStatus}
                  onChange={(e) => setManualStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
