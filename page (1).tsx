'use client';

import React, { useState, useEffect } from 'react';

interface Configuration {
  id: string;
  name: string;
}

export default function BiometricLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [configuration, setConfiguration] = useState('');
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConfigs, setLoadingConfigs] = useState(false);

  // Load configurations when organization changes
  useEffect(() => {
    if (organization) {
      loadConfigurations();
    }
  }, [organization]);

  const loadConfigurations = async () => {
    setLoadingConfigs(true);
    try {
      const response = await fetch(`/api/biometric/configurations?organization=${encodeURIComponent(organization)}`);
      if (response.ok) {
        const data = await response.json();
        setConfigurations(data);
      }
    } catch (err) {
      console.error('Failed to load configurations');
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!email || !password || !organization || !configuration) {
        setError('All fields required');
        return;
      }

      const response = await fetch('/api/biometric/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          organization,
          configuration
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Save session data
      localStorage.setItem('userToken', data.token);
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('userEmail', data.email);
      localStorage.setItem('organizationId', data.organizationId);
      localStorage.setItem('organizationName', data.organizationName);
      localStorage.setItem('configurationId', data.configurationId);
      localStorage.setItem('configurationName', data.configurationName);

      // Redirect to biometric test page
      window.location.href = '/biometric';
    } catch (err) {
      setError('Connection error');
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
        maxWidth: '450px'
      }}>
        <h1 style={{
          margin: '0 0 0.5rem 0',
          fontSize: '1.8rem',
          textAlign: 'center',
          color: '#1f2937'
        }}>
          🔐 Biometric Authentication
        </h1>
        <p style={{
          margin: '0 0 2rem 0',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.9rem'
        }}>
          Enter your credentials and select configuration
        </p>

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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
              Organization:
            </label>
            <input
              type="text"
              value={organization}
              onChange={(e) => {
                setOrganization(e.target.value);
                setConfiguration('');
              }}
              placeholder="e.g., Demo Corp"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
              Configuration:
            </label>
            {loadingConfigs ? (
              <div style={{
                width: '100%',
                padding: '0.75rem',
                background: '#f3f4f6',
                borderRadius: '6px',
                color: '#6b7280'
              }}>
                Loading configurations...
              </div>
            ) : (
              <select
                value={configuration}
                onChange={(e) => setConfiguration(e.target.value)}
                disabled={!organization || configurations.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  background: 'white',
                  cursor: organization ? 'pointer' : 'not-allowed',
                  opacity: organization ? 1 : 0.5
                }}
                required
              >
                <option value="">
                  {configurations.length === 0 && organization
                    ? 'No configurations available'
                    : 'Select a configuration'}
                </option>
                {configurations.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !organization || configurations.length === 0}
            style={{
              padding: '0.75rem',
              background: loading || !organization || configurations.length === 0 ? '#9ca3af' : '#2e75b6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: loading || !organization || configurations.length === 0 ? 'not-allowed' : 'pointer',
              marginTop: '1rem'
            }}
          >
            {loading ? 'Logging in...' : 'Login & Start Test'}
          </button>
        </form>

        <p style={{
          marginTop: '1.5rem',
          textAlign: 'center',
          color: '#6b7280',
          fontSize: '0.85rem'
        }}>
          Demo: Demo Corp / (created user email) / (password)
        </p>
      </div>
    </div>
  );
}
