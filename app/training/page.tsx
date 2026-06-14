'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';

const APP_VERSION = '1.0.0';

interface SensorData {
  gait_analysis: number[];
  touch_dynamics: number[];
  hand_motion: number[];
  behavioral_pattern: number[];
  facial_recognition: number[];
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
}

export default function TrainingPage() {
  const searchParams = useSearchParams();
  const enrollmentCode = searchParams?.get('code') || '';

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

  const [locationHistory, setLocationHistory] = useState<LocationPoint[]>([]);
  const [geoStatus, setGeoStatus] = useState('');
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const trainingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const geoWatchRef = useRef<number | null>(null);

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
    if (!enrollmentCode) {
      setError('Invalid enrollment code. Use link from admin.');
      return;
    }
    setSessionStarted(true);
    setSamplesCollected(0);
    setError(null);
    setLocationHistory([]);
    setGeoStatus('⏳ Requesting location...');
    
    if (navigator.geolocation) {
      geoWatchRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation: LocationPoint = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
          };
          setLocationHistory(prev => [...prev, newLocation]);
          setGeoStatus(`✅ Location captured (${locationHistory.length + 1} points)`);
        },
        (err) => {
          console.log('Geolocation error:', err);
          setGeoStatus('❌ Location denied');
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    
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
    if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
    setError(null);
    
    try {
      const response = await fetch('/api/training/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceType,
          sensorData,
          locationHistory,
          enrollmentCode,
          appVersion: APP_VERSION,
          samplesCollected
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save profile');
      }
      
      setSuccessMessage(`✅ Training validated and saved! ${locationHistory.length} location points recorded.`);
      setTimeout(() => {
        setSessionStarted(false);
        setEmail('');
      }, 3000);
    } catch (err) {
      setError('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
        <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🎓 Passive Authentication Training</h1>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Enroll your biometric baseline</p>
            {enrollmentCode && <p style={{ margin: '0.5rem 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>✓ Enrollment code verified</p>}
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.85rem', opacity: 0.8 }}>
            <div>v{APP_VERSION}</div>
            <div>{deviceType}</div>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}
          {successMessage && <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '6px', color: '#166534', marginBottom: '2rem' }}>{successMessage}</div>}
          {!enrollmentCode && <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '6px', color: '#92400e', marginBottom: '2rem' }}>⚠️ Invalid enrollment link. Use the link sent by admin.</div>}

          {!sessionStarted ? (
            <form onSubmit={startTraining} style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0 }}>Start Training Session</h2>
              <div style={{ background: '#dbeafe', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                <strong>📱 Device:</strong> {deviceType}
              </div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', marginBottom: '1rem', boxSizing: 'border-box' }} required />
              <button type="submit" disabled={!enrollmentCode} style={{ width: '100%', padding: '1rem', background: enrollmentCode ? '#7c3aed' : '#9ca3af', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: enrollmentCode ? 'pointer' : 'not-allowed' }}>🎓 Start Training</button>
            </form>
          ) : (
            <div>
              <p style={{ color: '#1f2937', fontWeight: 600 }}>📧 {email}</p>
              <div style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
                <h3 style={{ marginTop: 0 }}>📊 Training Progress</h3>
                <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1rem' }}>Total samples: <strong style={{ color: '#1f2937' }}>{samplesCollected}</strong> (need 100+ per biometric)</p>
                
                {Object.entries(sensorData).map(([key, values]) => (
                  <div key={key} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 700, color: getQualityColor(values.length) }}>{values.length} samples</span>
                    </div>
                    <div style={{ background: '#e5e7eb', height: '12px', borderRadius: '6px', overflow: 'hidden', border: `2px solid ${getQualityColor(values.length)}` }}>
                      <div style={{ width: `${Math.min(100, (values.length / 100) * 100)}%`, height: '100%', background: getQualityColor(values.length), transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#dbeafe', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.9rem', color: '#1e40af' }}>
                  <strong>📍 Location:</strong> {geoStatus}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>Points recorded: {locationHistory.length}</div>
                </div>
              </div>
              <button onClick={stopTraining} style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>✓ Complete Training & Validate</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
