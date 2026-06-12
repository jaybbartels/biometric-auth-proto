'use client';

import React, { useState, useEffect, useRef } from 'react';

interface Organization {
  id: string;
  name: string;
}

interface Configuration {
  id: string;
  name: string;
  allow_threshold: number;
  challenge_threshold: number;
  deny_threshold: number;
}

interface TestResult {
  testName: string;
  confidenceScore: number;
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

export default function BiometricTestPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);

  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [isCapturingSensors, setIsCapturingSensors] = useState(false);

  const [sensorReadings, setSensorReadings] = useState<SensorReadings>({
    accelX: 0,
    accelY: 0,
    accelZ: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    touchCount: 0
  });

  const accelDataRef = useRef<number[]>([]);
  const touchEventsRef = useRef<Array<{ pressure: number; velocity: number }>>([]);
  const lastTouchRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  // Load organizations on mount
  useEffect(() => {
    loadOrganizations();
    const ua = navigator.userAgent;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    setIsMobile(isMobileDevice);
  }, []);

  // Load configurations when org changes
  useEffect(() => {
    if (selectedOrg) {
      loadConfigurations(selectedOrg);
    } else {
      setConfigurations([]);
      setSelectedConfig('');
    }
  }, [selectedOrg]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch('/api/biometric/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (err) {
      setError('Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadConfigurations = async (orgId: string) => {
    setLoadingConfigs(true);
    try {
      const response = await fetch(`/api/biometric/configurations?organizationId=${orgId}`);
      if (response.ok) {
        const data = await response.json();
        setConfigurations(data);
      }
    } catch (err) {
      setError('Failed to load configurations');
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleRequestPermissions = async () => {
    try {
      setError(null);

      if (typeof DeviceMotionEvent !== 'undefined') {
        if ((DeviceMotionEvent as any).requestPermission) {
          const permissionMotion = await (DeviceMotionEvent as any).requestPermission();
          if (permissionMotion !== 'granted') {
            setError('Motion sensor permission denied');
            return;
          }
        }
        window.addEventListener('devicemotion', handleDeviceMotion);
      }

      if (typeof DeviceOrientationEvent !== 'undefined') {
        if ((DeviceOrientationEvent as any).requestPermission) {
          const permissionOrientation = await (DeviceOrientationEvent as any).requestPermission();
          if (permissionOrientation !== 'granted') {
            setError('Orientation sensor permission denied');
            return;
          }
        }
        window.addEventListener('deviceorientation', handleDeviceOrientation);
      }

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

    const velocity = deltaTime > 0 ? Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime * 1000 : 0;
    const pressure = (touch as any).force || Math.random() * 100;

    touchEventsRef.current.push({ pressure, velocity });

    setSensorReadings(prev => ({
      ...prev,
      touchCount: touchEventsRef.current.length
    }));

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY, time: now };
  };

  const generateBiometricData = () => {
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
    setSuccessMessage(null);

    try {
      if (!selectedOrg || !selectedConfig || !email || !password) {
        setError('All fields required');
        setIsRunning(false);
        return;
      }

      const biometricData = generateBiometricData();
      const sessionId = 'session-' + Date.now();

      const response = await fetch('/api/biometric/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: email,
          organizationId: selectedOrg,
          configurationId: selectedConfig,
          sessionId,
          ...biometricData
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const result: VerificationResult = await response.json();
      setVerificationResult(result);
      setSuccessMessage('✅ Test completed! Click "Save Results" to store in database.');

      accelDataRef.current = [];
      touchEventsRef.current = [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSaveResults = async () => {
    if (!verificationResult) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/biometric/save-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: email,
          organizationId: selectedOrg,
          configurationId: selectedConfig,
          overallConfidence: verificationResult.overallConfidence,
          decision: verificationResult.decision,
          testResults: verificationResult.testResults
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save results');
      }

      setSuccessMessage('✅ Results saved to database! Check admin dashboard.');
    } catch (err) {
      setError('Failed to save results: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
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
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>
            🔐 Biometric Test Suite
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>
            Select organization, configuration, and run verification
          </p>
          {isMobile && permissionsGranted && (
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
              ✅ Mobile sensors active
            </p>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '2rem' }}>
          {/* Mobile Banner */}
          {!permissionsGranted && isMobile && (
            <div style={{
              padding: '1rem',
              background: '#dbeafe',
              border: '1px solid #93c5fd',
              borderRadius: '6px',
              color: '#1e40af',
              marginBottom: '2rem'
            }}>
              <strong>📱 Enable Sensors</strong> for real biometric data
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
              <strong>❌ Error:</strong> {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div style={{
              padding: '1rem',
              background: '#dcfce7',
              border: '1px solid #86efac',
              borderRadius: '6px',
              color: '#166534',
              marginBottom: '2rem'
            }}>
              {successMessage}
            </div>
          )}

          {/* Form Section */}
          {!verificationResult && (
            <div style={{
              background: '#f9fafb',
              padding: '2rem',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginBottom: '2rem'
            }}>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>
                Test Configuration
              </h2>

              {/* Organization Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                  Organization:
                </label>
                {loadingOrgs ? (
                  <div style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#e5e7eb',
                    borderRadius: '6px',
                    color: '#6b7280'
                  }}>
                    Loading...
                  </div>
                ) : (
                  <select
                    value={selectedOrg}
                    onChange={(e) => setSelectedOrg(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      background: 'white'
                    }}
                    required
                  >
                    <option value="">Select an organization</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Configuration Dropdown */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                  Configuration:
                </label>
                {loadingConfigs ? (
                  <div style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#e5e7eb',
                    borderRadius: '6px',
                    color: '#6b7280'
                  }}>
                    Loading...
                  </div>
                ) : (
                  <select
                    value={selectedConfig}
                    onChange={(e) => setSelectedConfig(e.target.value)}
                    disabled={!selectedOrg || configurations.length === 0}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '0.95rem',
                      boxSizing: 'border-box',
                      background: 'white',
                      cursor: selectedOrg ? 'pointer' : 'not-allowed',
                      opacity: selectedOrg ? 1 : 0.5
                    }}
                    required
                  >
                    <option value="">
                      {configurations.length === 0 && selectedOrg ? 'No configurations available' : 'Select a configuration'}
                    </option>
                    {configurations.map((config) => (
                      <option key={config.id} value={config.id}>
                        {config.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Email Input */}
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  disabled={!selectedOrg || !selectedConfig}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    opacity: selectedOrg && selectedConfig ? 1 : 0.5
                  }}
                  required
                />
              </div>

              {/* Password Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                  Password:
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={!selectedOrg || !selectedConfig}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    boxSizing: 'border-box',
                    opacity: selectedOrg && selectedConfig ? 1 : 0.5
                  }}
                  required
                />
              </div>

              {/* Run Test Button */}
              <button
                onClick={handleVerify}
                disabled={isRunning || !selectedOrg || !selectedConfig || !email || !password}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: isRunning || !selectedOrg || !selectedConfig || !email || !password ? '#9ca3af' : '#2e75b6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  cursor: isRunning || !selectedOrg || !selectedConfig || !email || !password ? 'not-allowed' : 'pointer'
                }}
              >
                {isRunning ? '⏳ Running Tests...' : '▶️ Run Biometric Test'}
              </button>
            </div>
          )}

          {/* Results */}
          {verificationResult && (
            <div>
              {/* Overall Score */}
              <div style={{
                background: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '2px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
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
                  justifyContent: 'center',
                  marginBottom: '1.5rem'
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

                {/* Save Button */}
                <button
                  onClick={handleSaveResults}
                  disabled={isSaving}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: isSaving ? '#9ca3af' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    marginBottom: '1rem'
                  }}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Results to Database'}
                </button>

                {/* Run Another Test Button */}
                <button
                  onClick={() => {
                    setVerificationResult(null);
                    setEmail('');
                    setPassword('');
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#6366f1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Run Another Test
                </button>
              </div>

              {/* Test Results */}
              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>
                  Individual Test Results
                </h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
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
                      <div>
                        <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                          {test.testName.replace(/_/g, ' ')}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          color: getConfidenceColor(test.confidenceScore)
                        }}>
                          {test.confidenceScore.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
