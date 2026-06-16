'use client';
import React, { useState, useEffect, useRef } from 'react';

interface SensorData {
  gait_analysis: number[];
  touch_dynamics: number[];
  hand_motion: number[];
  behavioral_pattern: number[];
  facial_recognition: number[];
}

interface Configuration {
  id: string;
  name: string;
  allow_threshold: number;
  allow_redirect_url?: string;
  deny_redirect_url?: string;
}

interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function BiometricPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [email, setEmail] = useState('');
  
  const [appStarted, setAppStarted] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    personConfidence: number;
    threshold: number;
  } | null>(null);
  
  const [deviceType, setDeviceType] = useState('Unknown');
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  
  const [sensorData, setSensorData] = useState<SensorData>({
    gait_analysis: [],
    touch_dynamics: [],
    hand_motion: [],
    behavioral_pattern: [],
    facial_recognition: []
  });

  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [debugMessage, setDebugMessage] = useState('');
  
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const geoWatchRef = useRef<number | null>(null);

  const SAMPLE_TARGET = 15; // Changed from 100+ to 15

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) setDeviceType('Android');
    else if (/iPhone|iPad|iPod/.test(ua)) setDeviceType('iOS');
    else setDeviceType('Desktop');
    
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await fetch('/api/biometric/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  const handleOrgChange = async (orgId: string) => {
    setSelectedOrg(orgId);
    setSelectedConfig(null);
    setConfigurations([]);
    
    try {
      const res = await fetch(`/api/admin/configurations?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setConfigurations(data);
      }
    } catch (err) {
      console.error('Failed to load configurations:', err);
    }
  };

  const startApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setDebugMessage('');

    if (!selectedOrg || !selectedConfig || !email) {
      setError('Organization, configuration, and email required');
      return;
    }

    setAppStarted(true);
    setSamplesCollected(0);
    setStatusMessage(`🟢 App running - collecting 15 biometric samples...`);

    trainingIntervalRef.current = setInterval(() => {
      setSensorData(prev => ({
        gait_analysis: [...prev.gait_analysis, Math.random() * 100],
        touch_dynamics: [...prev.touch_dynamics, Math.random() * 100],
        hand_motion: [...prev.hand_motion, Math.random() * 100],
        behavioral_pattern: [...prev.behavioral_pattern, Math.random() * 100],
        facial_recognition: [...prev.facial_recognition, Math.random() * 100]
      }));
      setSamplesCollected(prev => prev + 1);
    }, 500);

    if (navigator.geolocation) {
      setLocationStatus('⏳ Requesting location...');
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          });
          setLocationStatus('✅ Location active');
        },
        (err) => {
          if (err.code === 1) {
            setLocationStatus('❌ Location denied - iOS: Settings > Privacy > Location > Allow');
          } else if (err.code === 2) {
            setLocationStatus('⚠️ Location unavailable');
          } else {
            setLocationStatus('❌ Location error');
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  const handleVerify = async () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    
    setIsVerifying(true);
    setStatusMessage('🔍 Verifying identity...');
    setDebugMessage('Sending to API...');

    try {
      // Take only LAST 15 samples from each biometric
      const getLast15 = (arr: number[]) => arr.slice(-SAMPLE_TARGET);

      const compareRes = await fetch('/api/biometric/compare-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceType,
          organizationId: selectedOrg,
          configurationId: selectedConfig?.id,
          sensorData: {
            gait_analysis: getLast15(sensorData.gait_analysis),
            touch_dynamics: getLast15(sensorData.touch_dynamics),
            hand_motion: getLast15(sensorData.hand_motion),
            behavioral_pattern: getLast15(sensorData.behavioral_pattern),
            facial_recognition: getLast15(sensorData.facial_recognition)
          }
        })
      });

      const compareData = await compareRes.json();
      
      setDebugMessage(`API Response: ${compareRes.status} - ${JSON.stringify(compareData).substring(0, 100)}`);

      if (!compareRes.ok || !compareData.is_validated_user) {
        setStatusMessage('❌ Not validated');
        setError(compareData.error || 'No validated training profile found');
        setIsVerifying(false);
        return;
      }

      const personConfidence = compareData.person_confidence;
      const passed = personConfidence >= selectedConfig!.allow_threshold;

      setVerificationResult({
        passed,
        personConfidence,
        threshold: selectedConfig!.allow_threshold
      });
      setVerificationComplete(true);

      if (passed) {
        setStatusMessage(`✅ VERIFIED (${personConfidence}%)`);
        const redirectUrl = selectedConfig!.allow_redirect_url;
        setTimeout(() => {
          if (redirectUrl) window.open(redirectUrl, '_blank');
        }, 1500);
      } else {
        setStatusMessage(`❌ DENIED (${personConfidence}%)`);
        const redirectUrl = selectedConfig!.deny_redirect_url;
        setTimeout(() => {
          if (redirectUrl) window.open(redirectUrl, '_blank');
        }, 1500);
      }

      setIsVerifying(false);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      setError('Verification failed: ' + errMsg);
      setDebugMessage(`Error: ${errMsg}`);
      setIsVerifying(false);
    }
  };

  const handleTryAgain = () => {
    setSensorData({
      gait_analysis: [],
      touch_dynamics: [],
      hand_motion: [],
      behavioral_pattern: [],
      facial_recognition: []
    });
    setSamplesCollected(0);
    setVerificationComplete(false);
    setVerificationResult(null);
    setStatusMessage(`🟢 App running - collecting 15 biometric samples...`);
    setDebugMessage('');

    trainingIntervalRef.current = setInterval(() => {
      setSensorData(prev => ({
        gait_analysis: [...prev.gait_analysis, Math.random() * 100],
        touch_dynamics: [...prev.touch_dynamics, Math.random() * 100],
        hand_motion: [...prev.hand_motion, Math.random() * 100],
        behavioral_pattern: [...prev.behavioral_pattern, Math.random() * 100],
        facial_recognition: [...prev.facial_recognition, Math.random() * 100]
      }));
      setSamplesCollected(prev => prev + 1);
    }, 500);
  };

  const handleChangeConfig = async () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    
    setAppStarted(false);
    setVerificationComplete(false);
    setVerificationResult(null);
    setSelectedConfig(null);
    setSensorData({
      gait_analysis: [],
      touch_dynamics: [],
      hand_motion: [],
      behavioral_pattern: [],
      facial_recognition: []
    });
    setSamplesCollected(0);
    setDebugMessage('');
  };

  const handleFullReset = () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    
    setAppStarted(false);
    setVerificationComplete(false);
    setVerificationResult(null);
    setSelectedOrg('');
    setSelectedConfig(null);
    setEmail('');
    setSensorData({
      gait_analysis: [],
      touch_dynamics: [],
      hand_motion: [],
      behavioral_pattern: [],
      facial_recognition: []
    });
    setSamplesCollected(0);
    setCurrentLocation(null);
    setError(null);
    setStatusMessage('');
    setLocationStatus('');
    setDebugMessage('');
  };

  // INITIAL FORM SCREEN
  if (!appStarted) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '2rem', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Biometric Access</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>📱 {deviceType}</p>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

            <form onSubmit={startApp} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Organization</label>
                <select 
                  value={selectedOrg} 
                  onChange={(e) => handleOrgChange(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
                  required
                >
                  <option value="">Select...</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Configuration</label>
                <select 
                  value={selectedConfig?.id || ''} 
                  onChange={(e) => {
                    const config = configurations.find(c => c.id === e.target.value);
                    setSelectedConfig(config || null);
                  }}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
                  required
                  disabled={!selectedOrg}
                >
                  <option value="">Select...</option>
                  {configurations.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.allow_threshold}%)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="user@example.com" 
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} 
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={!selectedOrg || !selectedConfig || !email}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  background: (selectedOrg && selectedConfig && email) ? '#7c3aed' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: (selectedOrg && selectedConfig && email) ? 'pointer' : 'not-allowed' 
                }}
              >
                🚀 Start
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // COLLECTING DATA SCREEN (BEFORE VERIFICATION)
  if (!verificationComplete) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '2rem', color: 'white' }}>
            <h1 style={{ margin: 0, fontSize: '1.6rem' }}>🟢 ACTIVE</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Collecting biometric data...</p>
          </div>

          <div style={{ padding: '2rem' }}>
            {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

            <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #10b981' }}>
              <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Status</p>
              <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#059669' }}>{statusMessage}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ color: '#6b7280' }}>Samples</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#059669' }}>{samplesCollected}/{SAMPLE_TARGET}</div>
                </div>
                <div style={{ background: 'white', padding: '0.75rem', borderRadius: '6px' }}>
                  <div style={{ color: '#6b7280' }}>Location</div>
                  <div style={{ fontSize: '0.75rem', color: currentLocation ? '#059669' : '#d1d5db', fontWeight: 600 }}>
                    {locationStatus || (currentLocation ? `✓` : '⏳')}
                  </div>
                </div>
              </div>

              {locationStatus && locationStatus.includes('iOS') && (
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '0.75rem', color: '#92400e' }}>
                  📱 {locationStatus}
                </div>
              )}
            </div>

            {debugMessage && (
              <div style={{ padding: '0.75rem', background: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.75rem', color: '#4b5563', marginBottom: '1rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                DEBUG: {debugMessage}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <button 
                onClick={handleVerify} 
                disabled={isVerifying || samplesCollected < SAMPLE_TARGET}
                style={{ 
                  padding: '1rem', 
                  background: (samplesCollected >= SAMPLE_TARGET && !isVerifying) ? '#059669' : '#9ca3af', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: (samplesCollected >= SAMPLE_TARGET && !isVerifying) ? 'pointer' : 'not-allowed',
                  fontSize: '0.95rem'
                }}
              >
                {isVerifying ? '⏳' : '✓ Verify'}
              </button>

              <button 
                onClick={handleFullReset}
                style={{ 
                  padding: '1rem', 
                  background: '#6b7280', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                ↻ Reset
              </button>
            </div>

            <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
              {samplesCollected < SAMPLE_TARGET ? `Need ${SAMPLE_TARGET - samplesCollected} more samples (~${Math.ceil((SAMPLE_TARGET - samplesCollected) * 0.5)}s)` : 'Ready to verify'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RESULT SCREEN (AFTER VERIFICATION)
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ maxWidth: '500px', width: '100%', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: verificationResult?.passed ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', padding: '2rem', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '1.6rem' }}>{verificationResult?.passed ? '✅ VERIFIED' : '❌ DENIED'}</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '1rem', fontWeight: 600 }}>
            {verificationResult?.personConfidence}% / {verificationResult?.threshold}%
          </p>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

          <div style={{ background: verificationResult?.passed ? '#f0fdf4' : '#fef2f2', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: `2px solid ${verificationResult?.passed ? '#10b981' : '#ef4444'}` }}>
            <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Organization</p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{organizations.find(o => o.id === selectedOrg)?.name}</p>
            
            <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Configuration</p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{selectedConfig?.name}</p>
            
            <p style={{ margin: '0.5rem 0', fontSize: '0.85rem', color: '#6b7280' }}>Email</p>
            <p style={{ margin: '0', fontSize: '1rem', fontWeight: 600, color: '#1f2937' }}>{email}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <button 
              onClick={handleTryAgain}
              style={{ 
                padding: '1rem', 
                background: '#2e75b6', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: 600, 
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🔄 Try Again
            </button>

            <button 
              onClick={handleChangeConfig}
              style={{ 
                padding: '1rem', 
                background: '#7c3aed', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                fontWeight: 600, 
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              ⚙️ Config
            </button>
          </div>

          <button 
            onClick={handleFullReset}
            style={{ 
              width: '100%',
              padding: '1rem', 
              background: '#6b7280', 
              color: 'white', 
              border: 'none', 
              borderRadius: '6px', 
              fontWeight: 600, 
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            ↻ Reset
          </button>
        </div>
      </div>
    </div>
  );
}
