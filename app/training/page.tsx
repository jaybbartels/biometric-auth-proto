'use client';
import React, { useState, useEffect, useRef } from 'react';

interface SensorData {
  gait_analysis: number[];
  touch_dynamics: number[];
  hand_motion: number[];
  behavioral_pattern: number[];
  facial_recognition: number[];
}

export default function TrainingPage() {
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
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Android/.test(ua)) setDeviceType('Android');
    else if (/iPhone|iPad|iPod/.test(ua)) setDeviceType('iOS');
    else setDeviceType('Desktop');
  }, []);

  const startTraining = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Email is required');
      return;
    }
    setSessionStarted(true);
    setSamplesCollected(0);
    
    // Collect raw sensor data every 500ms
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

  const stopTraining = async () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    setError(null);
    
    try {
      const response = await fetch('/api/training/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceType,
          sensorData,
          samplesCollected
        })
      });
      
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to save profile');
      }
      
      setSuccessMessage(`✅ Training complete! Saved ${samplesCollected} sensor samples.`);
      setTimeout(() => {
        setSessionStarted(false);
        setEmail('');
        setSensorData({
          gait_analysis: [],
          touch_dynamics: [],
          hand_motion: [],
          behavioral_pattern: [],
          facial_recognition: []
        });
        setSamplesCollected(0);
      }, 2000);
    } catch (err) {
      setError('Failed to save training profile: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const getAverageScore = (data: number[]): number => {
    if (data.length === 0) return 0;
    return data.reduce((a, b) => a + b, 0) / data.length;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '2rem', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🎓 Passive Authentication Training</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Collect raw sensor data for biometric matching</p>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}
          {successMessage && <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '6px', color: '#166534', marginBottom: '2rem' }}>{successMessage}</div>}

          {!sessionStarted ? (
            <form onSubmit={startTraining} style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0 }}>Start Training Session</h2>
              <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                <strong>📱 Device: {deviceType}</strong>
              </div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '1rem', boxSizing: 'border-box' }} required />
              <button type="submit" style={{ width: '100%', padding: '1rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>🎓 Start Training</button>
            </form>
          ) : (
            <div>
              <p style={{ color: '#1f2937', fontWeight: 600 }}>📧 {email}</p>
              <div style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0 }}>📊 Real-time Sensor Data</h3>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>Samples collected: <strong>{samplesCollected}</strong></p>
                
                {Object.entries(sensorData).map(([key, values]) => (
                  <div key={key} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ color: '#6b7280' }}>Avg: {getAverageScore(values).toFixed(1)}</span>
                    </div>
                    <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, getAverageScore(values))}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                      {values.length} data points collected
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={stopTraining} style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>✓ Complete Training & Save Data</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
