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

interface DeviceInfo {
  deviceType: string;
  browser: string;
  osVersion: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

export default function BiometricTestPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedConfig, setSelectedConfig] = useState('');
  const [email, setEmail] = useState('');
  const [isSetup, setIsSetup] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [testResults, setTestResults] = useState<TestResult[]>([
    { testName: 'gait_analysis', confidenceScore: 0 },
    { testName: 'touch_dynamics', confidenceScore: 0 },
    { testName: 'hand_motion', confidenceScore: 0 },
    { testName: 'behavioral_pattern', confidenceScore: 0 }
  ]);

  const [overallConfidence, setOverallConfidence] = useState(0);
  const [decision, setDecision] = useState<'allow' | 'challenge' | 'deny'>('deny');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    deviceType: 'Unknown',
    browser: 'Unknown',
    osVersion: 'Unknown'
  });

  const [geoStatus, setGeoStatus] = useState('⏳ Requesting geolocation...');

  const testIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentOrganization = organizations.find(o => o.id === selectedOrg);
  const currentConfiguration = configurations.find(c => c.id === selectedConfig);

  useEffect(() => {
    captureDeviceInfo();
    loadOrganizations();
    requestGeolocation();
  }, []);

  const captureDeviceInfo = () => {
    const ua = navigator.userAgent;
    
    let deviceType = 'Desktop';
    if (/Android/.test(ua)) deviceType = 'Android';
    else if (/iPhone|iPad|iPod/.test(ua)) deviceType = 'iOS';
    
    let browser = 'Unknown';
    if (/Chrome/.test(ua) && !/Chromium/.test(ua)) browser = 'Chrome';
    else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
    else if (/Firefox/.test(ua)) browser = 'Firefox';
    else if (/Edge/.test(ua)) browser = 'Edge';
    
    let osVersion = 'Unknown';
    const androidMatch = ua.match(/Android (\d+\.\d+)/);
    const iosMatch = ua.match(/OS (\d+_\d+)/);
    if (androidMatch) osVersion = `Android ${androidMatch[1]}`;
    else if (iosMatch) osVersion = `iOS ${iosMatch[1].replace(/_/g, '.')}`;
    
    setDeviceInfo(prev => ({
      ...prev,
      deviceType,
      browser,
      osVersion
    }));
    
    console.log('Device info captured:', { deviceType, browser, osVersion });
  };

  const requestGeolocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('❌ Geolocation not available');
      console.log('Geolocation not available');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDeviceInfo(prev => {
          const updated = {
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          console.log('✅ Geolocation captured:', updated);
          return updated;
        });
        setGeoStatus(`✅ Location captured (±${position.coords.accuracy?.toFixed(0)}m)`);
      },
      (err) => {
        console.log('Geolocation error:', err);
        setGeoStatus(`❌ Location denied (${err.message})`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (selectedOrg) {
      loadConfigurations(selectedOrg);
    } else {
      setConfigurations([]);
      setSelectedConfig('');
    }
  }, [selectedOrg]);

  useEffect(() => {
    if (isSetup && selectedOrg && selectedConfig) {
      runContinuousTests();
      return () => {
        if (testIntervalRef.current) clearInterval(testIntervalRef.current);
      };
    }
  }, [isSetup, selectedOrg, selectedConfig]);

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

  const runContinuousTests = () => {
    performTest();
    testIntervalRef.current = setInterval(performTest, 2000);
  };

  const performTest = () => {
    const newResults: TestResult[] = [
      { testName: 'gait_analysis', confidenceScore: Math.max(0, Math.min(100, 65 + Math.random() * 35 - 15)) },
      { testName: 'touch_dynamics', confidenceScore: Math.max(0, Math.min(100, 70 + Math.random() * 30 - 15)) },
      { testName: 'hand_motion', confidenceScore: Math.max(0, Math.min(100, 65 + Math.random() * 35 - 15)) },
      { testName: 'behavioral_pattern', confidenceScore: Math.max(0, Math.min(100, 55 + Math.random() * 40 - 15)) }
    ];

    setTestResults(newResults);
    const overall = newResults.reduce((sum, r) => sum + r.confidenceScore, 0) / newResults.length;
    setOverallConfidence(overall);

    const config = configurations.find(c => c.id === selectedConfig);
    if (config) {
      if (overall >= config.allow_threshold) {
        setDecision('allow');
      } else if (overall >= config.challenge_threshold) {
        setDecision('challenge');
      } else {
        setDecision('deny');
      }
    }
  };

  const handleStartMonitoring = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedOrg || !selectedConfig || !email) {
      setError('All fields required');
      return;
    }
    setIsSetup(true);
  };

  const handleVerify = async () => {
    setIsSaving(true);
    setError(null);

    console.log('🔍 Current deviceInfo being sent:', deviceInfo);
    
    try {
      const response = await fetch('/api/biometric/save-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: email,
          organizationId: selectedOrg,
          configurationId: selectedConfig,
          overallConfidence,
          decision,
          testResults,
          deviceInfo
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify');
      }

      setSuccessMessage('✅ Results saved to database!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError('Failed to verify: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setIsSetup(false);
    setEmail('');
    setSelectedOrg('');
    setSelectedConfig('');
    setError(null);
    if (testIntervalRef.current) clearInterval(testIntervalRef.current);
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 80) return '#10b981';
    if (confidence >= 70) return '#f59e0b';
    if (confidence >= 50) return '#ef4444';
    return '#991b1b';
  };

  const getDecisionStyle = (dec: string) => {
    switch (dec) {
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
        <div style={{
          background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)',
          padding: '2rem',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem' }}>🔐 Biometric Continuous Monitor</h1>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Real-time confidence monitoring with threshold-based verification</p>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}
          {successMessage && <div style={{ padding: '1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#166534', marginBottom: '2rem' }}>{successMessage}</div>}

          {!isSetup && (
            <form onSubmit={handleStartMonitoring} style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
              <h2 style={{ marginTop: 0, fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Setup Monitoring</h2>

              <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                <strong>📱 Device Info:</strong>
                <div>Device: {deviceInfo.deviceType} | Browser: {deviceInfo.browser} | OS: {deviceInfo.osVersion}</div>
                <div style={{ marginTop: '0.5rem' }}>{geoStatus}</div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Organization:</label>
                {loadingOrgs ? <div style={{ padding: '0.75rem', color: '#6b7280' }}>Loading...</div> : (
                  <select value={selectedOrg} onChange={(e) => setSelectedOrg(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box', background: 'white' }} required>
                    <option value="">Select organization</option>
                    {organizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                )}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Configuration:</label>
                {loadingConfigs ? <div style={{ padding: '0.75rem', color: '#6b7280' }}>Loading...</div> : (
                  <select value={selectedConfig} onChange={(e) => setSelectedConfig(e.target.value)} disabled={!selectedOrg || configurations.length === 0} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box', background: 'white', cursor: selectedOrg ? 'pointer' : 'not-allowed', opacity: selectedOrg ? 1 : 0.5 }} required>
                    <option value="">Select configuration</option>
                    {configurations.map((config) => <option key={config.id} value={config.id}>{config.name}</option>)}
                  </select>
                )}
              </div>

              {currentConfiguration && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#dbeafe', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>Approval Thresholds:</strong>
                  <div>Allow: ≥ {currentConfiguration.allow_threshold}% | Challenge: {currentConfiguration.challenge_threshold}-{currentConfiguration.allow_threshold}% | Deny: &lt; {currentConfiguration.deny_threshold}%</div>
                </div>
              )}

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>Email:</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" disabled={!selectedOrg || !selectedConfig} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', boxSizing: 'border-box', opacity: selectedOrg && selectedConfig ? 1 : 0.5 }} required />
              </div>

              <button type="submit" disabled={!selectedOrg || !selectedConfig || !email} style={{ width: '100%', padding: '1rem', background: !selectedOrg || !selectedConfig || !email ? '#9ca3af' : '#2e75b6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '1.1rem', cursor: !selectedOrg || !selectedConfig || !email ? 'not-allowed' : 'pointer' }}>▶️ Start Monitoring</button>
            </form>
          )}

          {isSetup && (
            <div>
              <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ margin: '0.25rem 0', color: '#1f2937', fontSize: '0.9rem', fontWeight: 600 }}>📧 {email}</p>
                    <p style={{ margin: '0.25rem 0', color: '#1f2937', fontSize: '0.9rem', fontWeight: 600 }}>🏢 {currentOrganization?.name}</p>
                    <p style={{ margin: '0.25rem 0', color: '#1f2937', fontSize: '0.9rem', fontWeight: 600 }}>⚙️ {currentConfiguration?.name}</p>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>📱 {deviceInfo.deviceType} • {deviceInfo.browser} • {deviceInfo.osVersion}</p>
                    {deviceInfo.latitude && <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.85rem' }}>📍 {deviceInfo.latitude.toFixed(4)}, {deviceInfo.longitude?.toFixed(4)}</p>}
                  </div>
                  <button onClick={handleReset} style={{ padding: '0.5rem 1rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>Stop & Reset</button>
                </div>
              </div>

              <div style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '2px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 600 }}>Live Confidence Score</h2>
                  <div style={{ display: 'inline-block', padding: '0.75rem 1.5rem', background: getDecisionStyle(decision).bg, color: getDecisionStyle(decision).text, borderRadius: '6px', fontWeight: 600, fontSize: '1rem' }}>{getDecisionStyle(decision).label}</div>
                </div>

                <div style={{ background: '#e5e7eb', height: '60px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '2rem', position: 'relative' }}>
                  <div style={{ width: `${overallConfidence}%`, height: '100%', background: getConfidenceColor(overallConfidence), transition: 'width 0.3s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.3rem' }}>{overallConfidence.toFixed(1)}%</div>
                </div>

                {currentConfiguration && (
                  <div style={{ marginBottom: '2rem', padding: '1rem', background: '#dbeafe', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                    <strong>Target Threshold: ≥ {currentConfiguration.allow_threshold}%</strong>
                    <div style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                      {overallConfidence >= currentConfiguration.allow_threshold ? '✅ Above threshold - Ready to verify!' : `⏳ ${(currentConfiguration.allow_threshold - overallConfidence).toFixed(1)}% more needed`}
                    </div>
                  </div>
                )}

                <button onClick={handleVerify} disabled={isSaving} style={{ width: '100%', padding: '1rem', background: isSaving ? '#9ca3af' : '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '1rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                  {isSaving ? '💾 Saving...' : '✓ Verify & Save Results'}
                </button>
              </div>

              <div>
                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Live Test Results</h3>
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {testResults.map((test) => (
                    <div key={test.testName} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div><div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{test.testName.replace(/_/g, ' ')}</div></div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: getConfidenceColor(test.confidenceScore) }}>{test.confidenceScore.toFixed(1)}%</div>
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
