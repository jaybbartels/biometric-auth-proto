'use client';

import React, { useState } from 'react';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, organization })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Save token
      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('organizationId', data.organizationId);
      localStorage.setItem('organizationName', data.organizationName);
      
      // Redirect to dashboard
      window.location.href = '/admin';
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 20px 25px rgba(0,0,0,0.1)',
        padding: '2rem',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{
          margin: '0 0 2rem 0',
          fontSize: '1.8rem',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          🔐 Admin Portal
        </h1>

        {error && (
          <div style={{
            padding: '1rem',
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '6px',
            color: '#991b1b',
            marginBottom: '1.5rem',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
              Organization Name:
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => setOrganization(e.target.value)}
              placeholder="Enter organization"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              background: loading ? '#9ca3af' : '#2e75b6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '1rem'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.9rem'
        }}>
          Demo: Demo Corp / admin / admin123
        </p>
      </div>
    </div>
  );
}
