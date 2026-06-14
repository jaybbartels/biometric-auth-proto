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

export default function BiometricPage() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<Configuration | null>(null);
  const [email, setEmail] = useState('');
  
  const [sessionStarted, setSessionStarted] = useState(false);
  const [deviceType, setDeviceType] = useState('Unknown');
  
  const [sensorData, setSensorData] = useState<SensorData>({
    gait_analysis: [],
    touch_dynamics: [],
    hand_motion: [],
    behavioral_pattern: [],
    facial_recognition: []
  });

  const [samplesCollected, setSamplesCollected] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedOrg || !selectedConfig || !email) {
      setError('Organization, configuration, and email required');
      return;
    }

    setSessionStarted(true);
    setSamplesCollected(0);
    setStatusMessage('Collecting biometric data...');

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

  const completeAuthentication = async () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    
    setIsProcessing(true);
    setStatusMessage('Verifying training profile...');

    try {
      const compareRes = await fetch('/api/biometric/compare-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceType,
          sensorData,
          organizationId: selectedOrg
        })
      });

      const compareData = await compareRes.json();

      if (!compareRes.ok || !compareData.is_validated_user) {
        setStatusMessage('❌ Not validated');
        setError('No validated training profile found for this email+phone combination. User must complete training enrollment first.');
        setIsProcessing(false);
        return;
      }

      const personConfidence = compareData.person_confidence;
      setStatusMessage(`Score: ${personConfidence}% vs Threshold: ${selectedConfig!.allow_threshold}%`);

      let redirectUrl: string | null = null;
      
      if (personConfidence >= selectedConfig!.allow_threshold) {
        setStatusMessage(`✅ PASS (${personConfidence}% >= ${selectedConfig!.allow_threshold}%)`);
        redirectUrl = selectedConfig!.allow_redirect_url || null;
      } else {
        setStatusMessage(`❌ FAIL (${personConfidence}% < ${selectedConfig!.allow_threshold}%)`);
        redirectUrl = selectedConfig!.deny_redirect_url || null;
      }

      setTimeout(() => {
        if (redirectUrl) {
          window.open(redirectUrl, '_blank');
        } else {
          setError('No redirect URL configured for this result');
          setIsProcessing(false);
        }
      }, 2000);

    } catch (err) {
      setError('Authentication error: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsProcessing(false);
    }
  };

  const getQualityColor = (count: number): string => {
    if (count >= 100) return '#10b981';
    if (count >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '2rem', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Passive Biometric Authentication</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Verify against trained biometric baseline</p>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}
          {statusMessage && <div style={{ padding: '1rem', background: '#dbeafe', borderRadius: '6px', color: '#1e40af', marginBottom: '2rem' }}>{statusMessage}</div>}

          {!sessionStarted ? (
            <form onSubmit={startSession} style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0 }}>Authenticate</h2>
              <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                <strong>📱 Device:</strong> {deviceType}
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Organization</label>
                <select 
                  value={selectedOrg} 
                  onChange={(e) => handleOrgChange(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}
                  required
                >
                  <option value="">Select organization...</option>
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
                  <option value="">Select configuration...</option>
                  {configurations.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} (threshold: {c.allow_threshold}%)</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Email</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="your@email.com" 
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} 
                  required 
                />
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#6b7280' }}>Must be registered and trained on this phone</p>
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
                🔐 Start Authentication
              </button>
            </form>
          ) : (
            <div>
              <p style={{ color: '#1f2937', fontWeight: 600 }}>📧 {email}</p>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>📱 {deviceType}</p>
              <div style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0 }}>📊 Biometric Collection</h3>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>Samples: <strong style={{ color: '#1f2937' }}>{samplesCollected}</strong>/100+</p>
                
                {Object.entries(sensorData).map(([key, values]) => (
                  <div key={key} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 700, color: getQualityColor(values.length) }}>{values.length}</span>
                    </div>
                    <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${getQualityColor(values.length)}` }}>
                      <div style={{ width: `${Math.min(100, (values.length / 100) * 100)}%`, height: '100%', background: getQualityColor(values.length), transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
              
              <button 
                onClick={completeAuthentication} 
                disabled={isProcessing}
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  background: isProcessing ? '#9ca3af' : '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  fontWeight: 600, 
                  cursor: isProcessing ? 'not-allowed' : 'pointer' 
                }}
              >
                {isProcessing ? '⏳ Processing...' : '✓ Complete & Verify'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
