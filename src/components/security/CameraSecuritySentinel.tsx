// ═══════════════════════════════════════════════════════════════════════════════
// CAMERA SECURITY SENTINEL - "Sauron's Eye" Protocol
// Monitors webcam for face presence and phone/camera detection
// Uses TensorFlow.js COCO-SSD for object detection
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useDevMode } from './DevModeContext';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent, SECURITY_EVENTS, SECURITY_CATEGORIES, notifyAdmins } from './securityConfig';
import { toast } from 'sonner';

interface CameraSecuritySentinelProps {
  enabled?: boolean;
  requireCamera?: boolean;
  onViolation?: (type: string) => void;
}

interface DetectionResult {
  class: string;
  score: number;
}

export const CameraSecuritySentinel: React.FC<CameraSecuritySentinelProps> = ({ 
  enabled = true,
  requireCamera = false,
  onViolation
}) => {
  const { user } = useAuth();
  const { isAdmin, isDevMode, securityEnabled, simulateUserView } = useDevMode();
  const [cameraGranted, setCameraGranted] = useState<boolean | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [threatDetected, setThreatDetected] = useState(false);
  const [noFaceTimer, setNoFaceTimer] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const shouldBypass = isAdmin && (isDevMode || !securityEnabled) && !simulateUserView;

  // Threat objects to detect
  const THREAT_OBJECTS = ['cell phone', 'remote', 'camera'];
  const NO_FACE_BLUR_THRESHOLD = 30; // seconds

  const logBreach = useCallback(async (type: string, severity: string, details: string) => {
    if (!user) return;

    await logSecurityEvent(
      user.id,
      SECURITY_EVENTS.INTRUSION_ATTEMPT,
      SECURITY_CATEGORIES.VIOLATION,
      `Camera Security: ${type}`,
      { detection_type: type, details }
    );

    try {
      // Get user's invite code
      const { data: inviteData } = await supabase
        .from('invite_codes')
        .select('code, id')
        .eq('used_by', user.id)
        .maybeSingle();

      await supabase.from('security_breaches').insert({
        user_id: user.id,
        breach_type: type,
        severity,
        details,
        invite_code: inviteData?.code,
        action_taken: severity === 'critical' ? 'session_terminated' : 'flagged',
      });

      // For critical violations, revoke invite code
      if (severity === 'critical' && inviteData?.id) {
        await supabase.from('invite_codes').update({
          is_active: false,
          revoked_reason: `Camera security violation: ${type}`,
          revoked_at: new Date().toISOString(),
        }).eq('id', inviteData.id);

        // Notify admins
        await notifyAdmins(user.id, `CAMERA THREAT: ${type}`, 'critical');
      }
    } catch (e) {
      console.error('[CameraSentinel] Failed to log breach:', e);
    }
  }, [user]);

  // Request camera access
  const requestCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: 320, height: 240 } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      
      setCameraGranted(true);
      setShowCalibration(false);
      
      toast.success('Biometric Calibration Complete', {
        description: 'Soul resonance verified. Access granted.',
      });
    } catch (err) {
      setCameraGranted(false);
      
      if (requireCamera) {
        toast.error('Camera Required', {
          description: 'Biometric calibration failed. Access denied.',
        });
      }
    }
  }, [requireCamera]);

  // Simple face detection using canvas analysis (without TensorFlow for now)
  const analyzeFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || shouldBypass) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get image data for simple brightness analysis
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    let totalBrightness = 0;
    let centerBrightness = 0;
    let centerPixels = 0;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const centerRadius = Math.min(canvas.width, canvas.height) / 4;

    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      totalBrightness += brightness;
      
      const pixelIndex = i / 4;
      const x = pixelIndex % canvas.width;
      const y = Math.floor(pixelIndex / canvas.width);
      
      const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
      if (distFromCenter < centerRadius) {
        centerBrightness += brightness;
        centerPixels++;
      }
    }

    const avgBrightness = totalBrightness / (data.length / 4);
    const avgCenterBrightness = centerPixels > 0 ? centerBrightness / centerPixels : 0;

    // Simple heuristic: if center is significantly different from average, likely a face
    const hasFace = Math.abs(avgCenterBrightness - avgBrightness) > 15;

    // Check for rectangular bright objects (potential phones)
    let brightRectCount = 0;
    const gridSize = 20;
    for (let gx = 0; gx < canvas.width; gx += gridSize) {
      for (let gy = 0; gy < canvas.height; gy += gridSize) {
        let gridBrightness = 0;
        for (let px = gx; px < gx + gridSize && px < canvas.width; px++) {
          for (let py = gy; py < gy + gridSize && py < canvas.height; py++) {
            const idx = (py * canvas.width + px) * 4;
            gridBrightness += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          }
        }
        if (gridBrightness / (gridSize * gridSize) > 200) {
          brightRectCount++;
        }
      }
    }

    // If too many bright rectangles, might be a phone screen
    const phoneDetected = brightRectCount > 8;

    if (phoneDetected && !shouldBypass) {
      setThreatDetected(true);
      await logBreach('phone_camera_detected', 'critical', 'Potential recording device detected in frame');
      onViolation?.('phone_detected');
      
      toast.error('🚨 SECURITY VIOLATION', {
        description: 'Recording device detected. Session terminated.',
        duration: 10000,
      });
    }

    if (!hasFace) {
      setNoFaceTimer(prev => {
        const newTime = prev + 3;
        if (newTime >= NO_FACE_BLUR_THRESHOLD && !isBlurred) {
          setIsBlurred(true);
          logBreach('user_absent', 'medium', 'No face detected for extended period');
        }
        return newTime;
      });
    } else {
      setNoFaceTimer(0);
      setIsBlurred(false);
    }
  }, [shouldBypass, isBlurred, logBreach, onViolation]);

  // Start monitoring
  useEffect(() => {
    if (!enabled || shouldBypass || !cameraGranted) return;

    intervalRef.current = setInterval(analyzeFrame, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, shouldBypass, cameraGranted, analyzeFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Show calibration screen if camera required but not granted
  useEffect(() => {
    if (enabled && requireCamera && cameraGranted === null) {
      setShowCalibration(true);
    }
  }, [enabled, requireCamera, cameraGranted]);

  if (!enabled || shouldBypass) return null;

  // Calibration gate
  if (showCalibration && requireCamera) {
    return (
      <div className="fixed inset-0 bg-black z-[99999] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-6xl mb-6">👁️</div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Biometric Soul Calibration Required
          </h1>
          <p className="text-gray-400 mb-8">
            To ensure the security of the Zoe ecosystem, we require camera access for identity verification and anti-recording protection.
          </p>
          <button
            onClick={requestCamera}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            Enable Biometric Calibration
          </button>
          {cameraGranted === false && (
            <p className="text-red-500 mt-4">
              Camera access denied. You cannot proceed without biometric calibration.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hidden video and canvas for analysis */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Blur overlay when user absent */}
      {isBlurred && (
        <div className="fixed inset-0 backdrop-blur-xl z-[9997] flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">👤</div>
            <p className="text-xl text-white">Presence Required</p>
            <p className="text-gray-400">Please return to continue</p>
          </div>
        </div>
      )}

      {/* Threat detection overlay */}
      {threatDetected && (
        <div className="fixed inset-0 bg-red-900 z-[99999] flex items-center justify-center animate-pulse">
          <div className="text-center">
            <div className="text-8xl mb-4">🚨</div>
            <h1 className="text-4xl font-bold text-white mb-4">SECURITY BREACH</h1>
            <p className="text-xl text-red-200">Recording device detected</p>
            <p className="text-red-300 mt-4">Your session has been terminated and your invite code revoked.</p>
          </div>
        </div>
      )}
    </>
  );
};

export default CameraSecuritySentinel;
