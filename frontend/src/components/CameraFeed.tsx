import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { Camera, CameraOff, AlertCircle, RefreshCw } from 'lucide-react';

export interface CameraFeedRef {
  captureFrame: () => string | null;
}

interface CameraFeedProps {
  boundingBox?: { x: number; y: number; width: number; height: number } | null;
  boxLabel?: string;
  boxColor?: 'green' | 'red' | 'blue' | 'amber';
  scanning?: boolean;
}

export const CameraFeed = forwardRef<CameraFeedRef, CameraFeedProps>(({
  boundingBox,
  boxLabel,
  boxColor = 'green',
  scanning = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const startCamera = async () => {
    setLoading(true);
    setPermissionError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setPermissionError('No webcam was found on this computer. Please connect a webcam.');
      } else {
        setPermissionError(`Could not access camera: ${err.message || 'Unknown device error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useImperativeHandle(ref, () => ({
    captureFrame: () => {
      if (!videoRef.current || !canvasRef.current) return null;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return null;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.85);
    },
  }));

  // Render detection box overlay
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (boundingBox) {
      const colors = {
        green: '#10b981',
        red: '#ef4444',
        blue: '#3b82f6',
        amber: '#f59e0b',
      };
      const strokeColor = colors[boxColor] || '#10b981';

      ctx.lineWidth = 3;
      ctx.strokeStyle = strokeColor;
      ctx.strokeRect(boundingBox.x, boundingBox.y, boundingBox.width, boundingBox.height);

      if (boxLabel) {
        ctx.font = 'bold 13px Segoe UI, sans-serif';
        const textMetrics = ctx.measureText(boxLabel);
        const padding = 6;
        ctx.fillStyle = strokeColor;
        ctx.fillRect(
          boundingBox.x,
          Math.max(0, boundingBox.y - 24),
          textMetrics.width + padding * 2,
          24
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillText(boxLabel, boundingBox.x + padding, Math.max(16, boundingBox.y - 7));
      }
    }
  }, [boundingBox, boxLabel, boxColor]);

  // Sync overlay canvas size with video resolution
  const handleLoadedMetadata = () => {
    if (videoRef.current && overlayCanvasRef.current) {
      overlayCanvasRef.current.width = videoRef.current.videoWidth;
      overlayCanvasRef.current.height = videoRef.current.videoHeight;
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-lg aspect-[4/3] max-w-xl mx-auto flex items-center justify-center">
      {loading && (
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Initializing Camera Feed...</span>
        </div>
      )}

      {permissionError ? (
        <div className="p-6 text-center max-w-sm flex flex-col items-center gap-3 text-slate-300">
          <div className="w-12 h-12 rounded-full bg-red-950 text-red-400 flex items-center justify-center border border-red-800">
            <CameraOff className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">Camera Access Error</h4>
          <p className="text-xs text-slate-400">{permissionError}</p>
          <button
            onClick={startCamera}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Camera Access
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleLoadedMetadata}
            className="w-full h-full object-cover transform -scale-x-100" // mirror view for natural user alignment
          />

          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
          />

          {/* Guide Reticle Overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className={`w-48 h-60 border-2 border-dashed rounded-3xl transition-colors duration-300 ${
              boundingBox ? 'border-emerald-400/80' : 'border-white/40'
            } flex items-center justify-center`}>
              <div className="w-3 h-3 rounded-full border border-white/40"></div>
            </div>
          </div>

          {/* Live scanning line animation */}
          {scanning && (
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_#3b82f6] animate-[scan_2s_ease-in-out_infinite]"></div>
          )}

          {/* Status pill bottom left */}
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2 text-[11px] text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Webcam Active (640x480)</span>
          </div>
        </>
      )}

      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
});
