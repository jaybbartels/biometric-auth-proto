'use client';

import React, { useState, useEffect } from 'react';

interface Organization {
  id: string;
  name: string;
  username: string;
  created_at: string;
}

interface OrgUser {
  id: string;
  email: string;
  api_key: string;
  created_at: string;
}

interface Configuration {
  description?: string;
  id: string;
  name: string;
  included_modules: any;
  allow_threshold: number;
  challenge_threshold: number;
  deny_threshold: number;
  allow_redirect_url: string;
  challenge_redirect_url: string;
  deny_redirect_url: string;
  created_at: string;
}

interface TrustScore {
  user_id: string;
  email: string;
  configuration_name: string;
  confidence_score: number;
  decision: string;
  last_verified_at: string;
}

type TabType = 'overview' | 'users' | 'configurations' | 'trust-scores';

export default function AdminDashboard() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // User management
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Configuration management
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    allow_threshold: 80,
    challenge_threshold: 70,
    deny_threshold: 50,
    allow_redirect_url: '',
    challenge_redirect_url: '',
    deny_redirect_url: ''
  });

  // Trust scores
  const [trustScores, setTrustScores] = useState<TrustScore[]>([]);

  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const orgId = localStorage.getItem('organizationId');
    const orgName = localStorage.getItem('organizationName');

    if (!token || !orgId) {
      window.location.href = '/admin/login';
      return;
    }

    setOrganizationId(orgId);
    setOrganizationName(orgName);
    loadDashboardData(orgId);
  }, []);

  const loadDashboardData = async (orgId: string) => {
    setLoading(true);
    try {
      // Load users
      const usersRes = await fetch(`/api/admin/users?organizationId=${orgId}`);
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }

      // Load configurations
      const configRes = await fetch(`/api/admin/configurations?organizationId=${orgId}`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfigurations(configData);
      }

      // Load trust scores
      const trustRes = await fetch(`/api/admin/trust-scores?organizationId=${orgId}`);
      if (trustRes.ok) {
        const trustData = await trustRes.json();
        setTrustScores(trustData);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword || !organizationId) {
      setError('Email and password required');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          email: newUserEmail,
          password: newUserPassword
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create user');
        return;
      }

      setNewUserEmail('');
      setNewUserPassword('');
      loadDashboardData(organizationId);
      setError('');
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleCreateConfiguration = async () => {
    if (!newConfig.name || !organizationId) {
      setError('Configuration name required');
      return;
    }

    try {
      const res = await fetch('/api/admin/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ...newConfig,
          included_modules: ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern']
        })
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to create configuration');
        return;
      }

      setNewConfig({
        name: '',
        description: '',
        allow_threshold: 80,
        challenge_threshold: 70,
        deny_threshold: 50,
        allow_redirect_url: '',
        challenge_redirect_url: '',
        deny_redirect_url: ''
      });
      setShowConfigForm(false);
      loadDashboardData(organizationId);
      setError('');
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('organizationName');
    window.location.href = '/admin/login';
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        padding: '0.75rem 1.5rem',
        background: activeTab === tab ? '#2e75b6' : '#e5e7eb',
        color: activeTab === tab ? 'white' : '#374151',
        border: 'none',
        borderRadius: '6px',
        fontWeight: 600,
        cursor: 'pointer',
        marginRight: '0.5rem'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f3f4f6',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)',
        color: 'white',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Admin Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
            Organization: {organizationName}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid white',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
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
            {error}
          </div>
        )}

        {/* Tabs */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
          <TabButton tab="overview" label="📊 Overview" />
          <TabButton tab="users" label="👥 Users" />
          <TabButton tab="configurations" label="⚙️ Configurations" />
          <TabButton tab="trust-scores" label="📈 Confidence Scores" />
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Organization Overview</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                background: '#f0f9ff',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #bfdbfe'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>
                  Total Users
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af', marginTop: '0.5rem' }}>
                  {users.length}
                </div>
              </div>
              <div style={{
                background: '#f0fdf4',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #bbf7d0'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>
                  Configurations
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534', marginTop: '0.5rem' }}>
                  {configurations.length}
                </div>
              </div>
              <div style={{
                background: '#fefce8',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #fef08a'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                  Confidence Score Records
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e', marginTop: '0.5rem' }}>
                  {trustScores.length}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>User Management</h2>

            {/* Create User Form */}
            <div style={{
              background: '#f9fafb',
              padding: '1.5rem',
              borderRadius: '8px',
              marginBottom: '2rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ marginTop: 0, color: '#374151', fontSize: '1.1rem' }}>Create New User</h3>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr auto' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.95rem'
                  }}
                />
                <button
                  onClick={handleCreateUser}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Create User
                </button>
              </div>
            </div>

            {/* Users List */}
            <h3 style={{ color: '#374151', fontSize: '1.1rem' }}>Users ({users.length})</h3>
            {users.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No users yet</p>
            ) : (
              <div style={{
                overflowX: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>API Key</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{user.email}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {user.api_key?.substring(0, 12)}...
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Configurations Tab */}
        {activeTab === 'configurations' && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Configurations</h2>
              <button
                onClick={() => setShowConfigForm(!showConfigForm)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#2e75b6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {showConfigForm ? 'Cancel' : '+ New Configuration'}
              </button>
            </div>

            {/* Create Config Form */}
            {showConfigForm && (
              <div style={{
                background: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ marginTop: 0, color: '#374151', fontSize: '1.1rem' }}>Create New Configuration</h3>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <input
                    type="text"
                    placeholder="Configuration Name"
                    value={newConfig.name}
                    onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      gridColumn: '1 / -1'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newConfig.description}
                    onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      gridColumn: '1 / -1'
                    }}
                  />
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      Allow Threshold: {newConfig.allow_threshold}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newConfig.allow_threshold}
                      onChange={(e) => setNewConfig({ ...newConfig, allow_threshold: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 600 }}>
                      Challenge Threshold: {newConfig.challenge_threshold}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newConfig.challenge_threshold}
                      onChange={(e) => setNewConfig({ ...newConfig, challenge_threshold: parseInt(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Allow Redirect URL"
                    value={newConfig.allow_redirect_url}
                    onChange={(e) => setNewConfig({ ...newConfig, allow_redirect_url: e.target.value })}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      gridColumn: '1 / -1'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Challenge Redirect URL"
                    value={newConfig.challenge_redirect_url}
                    onChange={(e) => setNewConfig({ ...newConfig, challenge_redirect_url: e.target.value })}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      gridColumn: '1 / -1'
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Deny Redirect URL"
                    value={newConfig.deny_redirect_url}
                    onChange={(e) => setNewConfig({ ...newConfig, deny_redirect_url: e.target.value })}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      gridColumn: '1 / -1'
                    }}
                  />
                  <button
                    onClick={handleCreateConfiguration}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      gridColumn: '1 / -1'
                    }}
                  >
                    Create Configuration
                  </button>
                </div>
              </div>
            )}

            {/* Configurations List */}
            {configurations.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No configurations yet</p>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {configurations.map((config) => (
                  <div key={config.id} style={{
                    background: '#f9fafb',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{config.name}</h4>
                    <p style={{ margin: '0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>
                      {config.description}
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(3, 1fr)',
                      gap: '1rem',
                      marginTop: '1rem',
                      fontSize: '0.85rem'
                    }}>
                      <div>
                        <strong>Allow:</strong> {config.allow_threshold}%
                      </div>
                      <div>
                        <strong>Challenge:</strong> {config.challenge_threshold}%
                      </div>
                      <div>
                        <strong>Deny:</strong> {config.deny_threshold}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confidence Scores Tab */}
        {activeTab === 'trust-scores' && (
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Confidence Score History</h2>
            {trustScores.length === 0 ? (
              <p style={{ color: '#6b7280' }}>No trust scores yet</p>
            ) : (
              <div style={{
                overflowX: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Configuration</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Score</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Decision</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Last Verified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trustScores.map((score, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '1rem' }}>{score.email}</td>
                        <td style={{ padding: '1rem' }}>{score.configuration_name || 'N/A'}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#2e75b6' }}>
                          {score.confidence_score?.toFixed(1)}%
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: score.decision === 'allow' ? '#dcfce7' : score.decision === 'challenge' ? '#fef3c7' : '#fee2e2',
                            color: score.decision === 'allow' ? '#166534' : score.decision === 'challenge' ? '#92400e' : '#991b1b',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {score.decision}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', color: '#6b7280' }}>
                          {score.last_verified_at ? new Date(score.last_verified_at).toLocaleString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
