'use client';
import React, { useState, useEffect, useRef } from 'react';

export default function TrainingPage() {
  const [email, setEmail] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);
  const [deviceType, setDeviceType] = useState('Unknown');
  const [trainingProgress, setTrainingProgress] = useState({
    gait_analysis: 0,
    touch_dynamics: 0,
    hand_motion: 0,
    behavioral_pattern: 0,
    facial_recognition: 0,
    locations_recorded: 0
  });
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
    trainingIntervalRef.current = setInterval(() => {
      setTrainingProgress(prev => ({
        ...prev,
        gait_analysis: Math.min(100, prev.gait_analysis + Math.random() * 15),
        touch_dynamics: Math.min(100, prev.touch_dynamics + Math.random() * 15),
        hand_motion: Math.min(100, prev.hand_motion + Math.random() * 15),
        behavioral_pattern: Math.min(100, prev.behavioral_pattern + Math.random() * 15),
        facial_recognition: Math.min(100, prev.facial_recognition + Math.random() * 15)
      }));
    }, 2000);
  };

  const stopTraining = async () => {
    if (trainingIntervalRef.current) clearInterval(trainingIntervalRef.current);
    try {
      const response = await fetch('/api/training/save-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          deviceType,
          sessionData: trainingProgress
        })
      });
      if (!response.ok) throw new Error('Failed to save profile');
      setSuccessMessage('✅ Training profile saved!');
      setTimeout(() => {
        setSessionStarted(false);
        setEmail('');
      }, 2000);
    } catch (err) {
      setError('Failed to save training profile');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '2rem', fontFamily: 'system-ui' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', background: 'white', borderRadius: '12px', boxShadow: '0 20px 25px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', padding: '2rem', color: 'white' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🎓 Passive Authentication Training</h1>
        </div>

        <div style={{ padding: '2rem' }}>
          {error && <div style={{ padding: '1rem', background: '#fee2e2', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}
          {successMessage && <div style={{ padding: '1rem', background: '#dcfce7', borderRadius: '6px', color: '#166534', marginBottom: '2rem' }}>{successMessage}</div>}

          {!sessionStarted ? (
            <form onSubmit={startTraining} style={{ background: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <h2 style={{ marginTop: 0 }}>Start Training</h2>
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
                <h3 style={{ marginTop: 0 }}>📊 Progress</h3>
                {['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern', 'facial_recognition'].map(key => (
                  <div key={key} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                      <span>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontWeight: 600 }}>{(trainingProgress[key as keyof typeof trainingProgress] as number).toFixed(0)}%</span>
                    </div>
                    <div style={{ background: '#e5e7eb', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, trainingProgress[key as keyof typeof trainingProgress] as number)}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={stopTraining} style={{ width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>✓ Complete Training</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
