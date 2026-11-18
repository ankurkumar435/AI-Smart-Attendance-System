import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CameraFeed } from '../../components/CameraFeed';
import type { CameraFeedRef } from '../../components/CameraFeed';
import { api } from '../../services/api';
import {
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Trash2,
  Info,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const RegisterFace: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const cameraRef = useRef<CameraFeedRef>(null);

  const [samples, setSamples] = useState<string[]>([]);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [registered, setRegistered] = useState<boolean>(false);

  const targetSamples = 3;

  const handleCaptureSample = () => {
    if (!cameraRef.current) return;
    setError(null);
    const frame = cameraRef.current.captureFrame();
    if (!frame) {
      setError('Could not capture frame from webcam. Please ensure your camera is working.');
      return;
    }
    const newSamples = [...samples, frame];
    setSamples(newSamples);

    if (newSamples.length >= targetSamples) {
      // Auto-submit once target samples reached
      handleRegisterBiometrics(newSamples);
    }
  };

  const handleRegisterBiometrics = async (sampleFrames: string[]) => {
    if (!user) return;
    const studentId = user.student_id || user.username;
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.face.register({
        student_id: studentId,
        images: sampleFrames,
      });
      setSuccessMessage(res.message);
      setRegistered(true);
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to process and enroll biometric face template.');
      setSamples([]); // Reset to try again
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBiometrics = async () => {
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete your registered biometric face template?')) {
      return;
    }
    try {
      const studentId = user.student_id || user.username;
      await api.face.deleteBiometrics(studentId);
      setRegistered(false);
      setSamples([]);
      setSuccessMessage('Biometric data successfully deleted.');
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to delete biometric data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Biometric Face Registration</h1>
        <p className="text-sm text-slate-500 mt-1">
          Enroll your facial template for fast, contactless attendance verification.
        </p>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 shadow-sm flex items-start gap-3">
        <Lock className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-bold uppercase tracking-wider text-[11px] text-blue-700">Privacy & Data Protection Notice</p>
          <p className="leading-relaxed">
            Your face biometric data is converted into a mathematical representation (face embedding) and stored in authenticated <strong>AES-256-GCM encrypted</strong> form on this local computer.
          </p>
          <p className="text-blue-800">
            Biometric data is <strong>never uploaded to a cloud database</strong>. Only authorized local application services can access the protected embedding for attendance verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Camera Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-blue-600" />
                Live Camera Feed
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Sample {samples.length} of {targetSamples}
              </span>
            </div>

            <CameraFeed ref={cameraRef} scanning={submitting} />

            {/* Error & Success Messages */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={handleCaptureSample}
                disabled={submitting || samples.length >= targetSamples}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Encrypting & Registering...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>
                      {samples.length === 0
                        ? 'Capture First Sample'
                        : `Capture Sample ${samples.length + 1} of ${targetSamples}`}
                    </span>
                  </>
                )}
              </button>

              {samples.length > 0 && !submitting && (
                <button
                  type="button"
                  onClick={() => setSamples([])}
                  className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold rounded-xl"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Sample Thumbnails */}
            {samples.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 mb-2">Captured Samples:</p>
                <div className="flex gap-2">
                  {samples.map((img, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border-2 border-blue-500 shadow-sm">
                      <img src={img} alt={`Sample ${i + 1}`} className="w-full h-full object-cover transform -scale-x-100" />
                      <span className="absolute bottom-0 right-0 bg-blue-600 text-white text-[9px] px-1 font-bold">
                        #{i + 1}
                      </span>
                    </div>
                  ))}
                  {Array.from({ length: targetSamples - samples.length }).map((_, i) => (
                    <div
                      key={i}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-xs"
                    >
                      +{samples.length + i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Instructions & Guidelines Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Info className="w-4 h-4 text-blue-600" />
              <h3>Face Capture Guidelines</h3>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Please look directly at the camera when taking samples.
            </p>

            <ul className="text-xs text-slate-600 space-y-2.5">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Face Clearly Visible:</strong> Keep your head upright inside the guide reticle.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Sufficient Lighting:</strong> Avoid heavy backlighting or dark shadows.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Single Person:</strong> Ensure no other classmates are visible in the background.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span><strong>Uncovered Face:</strong> Remove sunglasses, masks, or hats that obscure your eyes/mouth.</span>
              </li>
            </ul>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Multi-Sample Enrollment</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Capturing {targetSamples} slight angle variations produces a high-accuracy, 256-dimensional unit embedding vector resistant to room illumination changes.
              </p>
            </div>

            {/* Biometric Management Action */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Biometric Template Status</p>
                <p className="text-[11px] text-slate-500">
                  {user?.role === 'student' ? 'Local AES-256 encrypted' : 'Local enrollment'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleDeleteBiometrics}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Face Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
