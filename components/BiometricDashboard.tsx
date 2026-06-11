// components/BiometricDashboard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface TestResult {
  testName: string;
  confidenceScore: number;
  running: boolean;
  lastUpdated: string;
}

interface VerificationResult {
  sessionId: string;
  userId: string;
  testResults: TestResult[];
  overallConfidence: number;
  decision: 'allow' | 'challenge' | 'deny';
  timestamp: string;
}

interface SensorReadings {
  accelX: number;
  accelY: number;
  accelZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  touchCount: number;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function BiometricDashboard() {
  const [userId, setUserId] = useState('demo-user-' + Math.random().toString(36).substr(2, 9));
  const [isRunning, setIsRunning] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [sensorReadings, setSensorReadings] = useState<SensorReadings>({
    accelX: 0,
    accelY: 0,
    accelZ: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    touchCount: 0
  });
  const [isCapturingSensors, setIsCapturingSensors] = useState(false);
  const accelDataRef = useRef<number[]>([]);
  const touchEventsRef = useRef<Array<{ pressure: number; velocity: number }>>([]);
  const lastTouchRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const testDescriptions: Record<string, string> = {
    gait_analysis: 'Walking pattern via accelerometer',
    touch_dynamics: 'Touchscreen pressure & velocity',
    hand_motion: 'Device holding signature',
    behavioral_pattern: 'App usage sequences'
  };

  // Detect if mobile device
  useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      setIsMobile(isMobileDevice);
    };

    checkMobile();
  }, []);

  // Request sensor permissions and start listening
  const handleRequestPermissions = async () => {
    try {
      setError(null);

      // Request DeviceMotion permission (iOS 13+)
      if (typeof DeviceMotionEvent !== 'undefined') {
        if ((DeviceMotionEvent as any).requestPermission) {
          const permissionMotion = await (DeviceMotionEvent as any).requestPermission();
          if (permissionMotion !== 'granted') {
            setError('Motion sensor permission denied');
            return;
          }
        }

        // Start listening to device motion
        window.addEventListener('devicemotion', handleDeviceMotion);
      }

      // Request DeviceOrientation permission (iOS 13+)
      if (typeof DeviceOrientationEvent !== 'undefined') {
        if ((DeviceOrientationEvent as any).requestPermission) {
          const permissionOrientation = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionOrientation !== 'granted') {
            setError('Orientation sensor permission denied');
            return;
          }
        }

        // Start listening to device orientation
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }

      // Listen to touch events
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);

      setPermissionsGranted(true);
      setIsCapturingSensors(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request permissions');
    }
  };

  const handleDeviceMotion = (event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    if (accel) {
      setSensorReadings(prev => ({
        ...prev,
        accelX: Math.round(accel.x || 0),
        accelY: Math.round(accel.y || 0),
        accelZ: Math.round(accel.z || 0)
      }));

      // Store accelerometer data for later use
      if (isCapturingSensors) {
        accelDataRef.current.push(accel.x || 0, accel.y || 0, accel.z || 0);
      }
    }
  };

  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    setSensorReadings(prev => ({
      ...prev,
      rotX: Math.round(event.beta || 0),
      rotY: Math.round(event.gamma || 0),
      rotZ: Math.round(event.alpha || 0)
    }));
  };

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    lastTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isCapturingSensors) return;

    const touch = e.touches[0];
    const now = Date.now();
    const deltaX = touch.clientX - lastTouchRef.current.x;
    const deltaY = touch.clientY - lastTouchRef.current.y;
    const deltaTime = now - lastTouchRef.current.time;

    // Calculate velocity and pressure
    const velocity = deltaTime > 0 ? Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime * 1000 : 0;
    const pressure = (touch as any).force || Math.random() * 100; // iOS only has real force

    touchEventsRef.current.push({
      pressure,
      velocity
    });

    setSensorReadings(prev => ({
      ...prev,
      touchCount: touchEventsRef.current.length
    }));

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };
  };

  const stopCapturingSensors = () => {
    setIsCapturingSensors(false);
    window.removeEventListener('devicemotion', handleDeviceMotion);
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    window.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
  };

  const generateBiometricData = () => {
    // Use real sensor data if available and capturing, otherwise use simulated
    if (permissionsGranted && accelDataRef.current.length > 0) {
      return {
        accelerometerData: accelDataRef.current,
        touchEvents: touchEventsRef.current,
        deviceMotion: {
          roll: sensorReadings.rotX,
          pitch: sensorReadings.rotY,
          yaw: sensorReadings.rotZ
        }
      };
    }

    // Fallback to simulated data
    const accelData = Array(50).fill(0).map(() => Math.random() * 100);
    const touchEvents = Array(10).fill(0).map(() => ({
      pressure: Math.random() * 100,
      velocity: Math.random() * 500
    }));

    return {
      accelerometerData: accelData,
      touchEvents: touchEvents,
      deviceMotion: {
        roll: Math.random() * 30 - 15,
        pitch: Math.random() * 30 - 15,
        yaw: Math.random() * 360
      }
    };
  };

  const handleVerify = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      const sessionId = 'session-' + Date.now();
      const biometricData = generateBiometricData();

      const response = await fetch('/api/verify-biometric', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          sessionId,
          ...biometricData
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result: VerificationResult = await response.json();
      setVerificationResult(result);

      // Reset sensor data for next reading
      accelDataRef.current = [];
      touchEventsRef.current = [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 70) return '#f59e0b';
    if (confidence >= 50) return '#ef4444';
    return '#991b1b';
  };

  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case 'allow':
        return { bg: '#dcfce7', text: '#166534', label: '✓ Allow' };
      case 'challenge':
        return { bg: '#fef3c7', text: '#92400e', label: '⚠ Challenge' };
      case 'deny':
        return { bg: '#fee2e2', text: '#991b1b', label: '✗ Deny' };
      default:
        return { bg: '#f3f4f6', text: '#374151', label: 'Unknown' };
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)',
          padding: '2rem',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem' }}>
            🔐 Passive Biometric Authentication
          </h1>
          <p style={{ margin: 0, opacity: 0.9 }}>
            Real-time security test verification prototype
          </p>
          {isMobile && permissionsGranted && (
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              ✅ Mobile sensors active
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Mobile Detection Banner */}
          {!permissionsGranted && isMobile && (
            <div style={{
              padding: '1rem',
              background: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '6px',
              color: '#1e40af',
              marginBottom: '2rem'
            }}>
              <strong>📱 Mobile Device Detected!</strong>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem' }}>
                Click "Enable Sensors" to use real biometric data from your phone's accelerometer, gyroscope, and touch sensors.
              </p>
            </div>
          )}

          {isMobile && !permissionsGranted && (
            <button
              onClick={handleRequestPermissions}
              style={{
                width: '100%',
                padding: '1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                marginBottom: '2rem'
              }}
            >
              📡 Enable Sensors
            </button>
          )}

          {/* Sensor Readings Display (Mobile Only) */}
          {permissionsGranted && isCapturingSensors && (
            <div style={{
              padding: '1rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              marginBottom: '2rem'
            }}>
              <h3 style={{ margin: '0 0 1rem 0', color: '#166534', fontSize: '1rem' }}>
                📊 Live Sensor Readings
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                fontSize: '0.85rem',
                color: '#166534'
              }}>
                <div><strong>Accel X:</strong> {sensorReadings.accelX.toFixed(1)} m/s²</div>
                <div><strong>Accel Y:</strong> {sensorReadings.accelY.toFixed(1)} m/s²</div>
                <div><strong>Accel Z:</strong> {sensorReadings.accelZ.toFixed(1)} m/s²</div>
                <div><strong>Rot X:</strong> {sensorReadings.rotX.toFixed(1)}°</div>
                <div><strong>Rot Y:</strong> {sensorReadings.rotY.toFixed(1)}°</div>
                <div><strong>Rot Z:</strong> {sensorReadings.rotZ.toFixed(1)}°</div>
                <div><strong>Touch Events:</strong> {sensorReadings.touchCount}</div>
                <div><strong>Status:</strong> Capturing...</div>
              </div>
            </div>
          )}

          {/* User ID Section */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              User ID (Demo):
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={isRunning}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem'
                }}
              />
              <button
                onClick={handleVerify}
                disabled={isRunning}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isRunning ? '#9ca3af' : '#2e75b6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {isRunning ? 'Running Tests...' : 'Run Verification'}
              </button>
            </div>
            {permissionsGranted && isCapturingSensors && (
              <button
                onClick={stopCapturingSensors}
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Stop Sensor Capture
              </button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div style={{
              padding: '1rem',
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              marginBottom: '2rem'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* Results Section */}
          {verificationResult && (
            <div>
              {/* Overall Confidence Score */}
              <div style={{
                background: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '2px solid #e5e7eb'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>
                      Overall Confidence Score
                    </h2>
                    <div style={{
                      display: 'inline-block',
                      padding: '0.5rem 1rem',
                      background: getDecisionStyle(verificationResult.decision).bg,
                      color: getDecisionStyle(verificationResult.decision).text,
                      borderRadius: '6px',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      {getDecisionStyle(verificationResult.decision).label}
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div style={{
                    background: '#e5e7eb',
                    height: '40px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <div style={{
                      width: `${verificationResult.overallConfidence}%`,
                      height: '100%',
                      background: getConfidenceColor(verificationResult.overallConfidence),
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}>
                      {verificationResult.overallConfidence.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Test Results */}
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
                  Individual Test Results
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '1rem'
                }}>
                  {verificationResult.testResults.map((test) => (
                    <div
                      key={test.testName}
                      style={{
                        background: '#f9fafb',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                          textTransform: 'capitalize'
                        }}>
                          {test.testName.replace(/_/g, ' ')}
                        </div>
                        <div style={{
                          fontSize: '0.85rem',
                          color: '#6b7280'
                        }}>
                          {testDescriptions[test.testName] || 'No description'}
                        </div>
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                      }}>
                        <div style={{
                          padding: '0.25rem 0.75rem',
                          background: '#dbeafe',
                          color: '#1e40af',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          minWidth: '60px',
                          textAlign: 'center'
                        }}>
                          {test.running ? '▶ Running' : '✓ Idle'}
                        </div>

                        <div style={{
                          textAlign: 'right',
                          minWidth: '120px'
                        }}>
                          <div style={{
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: getConfidenceColor(test.confidenceScore),
                            marginBottom: '0.25rem'
                          }}>
                            {test.confidenceScore.toFixed(1)}%
                          </div>
                          <div style={{
                            width: '100px',
                            height: '6px',
                            background: '#e5e7eb',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            display: 'inline-block'
                          }}>
                            <div style={{
                              width: `${test.confidenceScore}%`,
                              height: '100%',
                              background: getConfidenceColor(test.confidenceScore),
                              borderRadius: '3px',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Info */}
              <div style={{
                marginTop: '2rem',
                padding: '1rem',
                background: '#f0f9ff',
                borderRadius: '6px',
                fontSize: '0.85rem',
                color: '#1e40af'
              }}>
                <div><strong>Session ID:</strong> {verificationResult.sessionId}</div>
                <div><strong>User ID:</strong> {verificationResult.userId}</div>
                <div><strong>Data Type:</strong> {permissionsGranted ? '📱 Real Sensors' : '🔄 Simulated'}</div>
                <div><strong>Timestamp:</strong> {new Date(verificationResult.timestamp).toLocaleString()}</div>
              </div>
            </div>
          )}

          {/* Initial State Message */}
          {!verificationResult && !isRunning && (
            <div style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
              <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                Click "Run Verification" to test the biometric authentication system
              </p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                {isMobile && !permissionsGranted 
                  ? 'Enable sensors first to use real biometric data from your phone'
                  : 'Results will show confidence scores from multiple security tests'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: '2rem',
        textAlign: 'center',
        color: 'white',
        fontSize: '0.9rem'
      }}>
        <p>
          Components: React Frontend (Vercel) | Vercel Edge API | Supabase Storage
        </p>
      </div>
    </div>
  );
}
