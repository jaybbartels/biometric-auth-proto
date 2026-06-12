'use client';
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

interface Configuration {
  id: string;
  name: string;
  allow_threshold: number;
  challenge_threshold: number;
}

interface ConfidenceScore {
  id: string;
  user_id: string;
  email: string;
  configuration_name: string;
  confidence_score: number;
  decision: string;
  created_at: string;
}

type TabType = 'overview' | 'users' | 'configurations' | 'confidence-scores';

export default function AdminDashboard() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const [users, setUsers] = useState<User[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [newConfig, setNewConfig] = useState({
    name: '',
    allow_threshold: 80,
    challenge_threshold: 70
  });

  const [allScores, setAllScores] = useState<ConfidenceScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<ConfidenceScore[]>([]);
  const [emailFilter, setEmailFilter] = useState('');
  const [configFilter, setConfigFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'allow' | 'challenge' | 'deny'>('all');

  const [error, setError] = useState('');

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
    loadAllData(orgId);
  }, []);

  useEffect(() => {
    let filtered = allScores;
    if (emailFilter) {
      filtered = filtered.filter(s => s.email.toLowerCase().includes(emailFilter.toLowerCase()));
    }
    if (configFilter) {
      filtered = filtered.filter(s => s.configuration_name === configFilter);
    }
    if (resultFilter !== 'all') {
      filtered = filtered.filter(s => s.decision === resultFilter);
    }
    setFilteredScores(filtered);
  }, [allScores, emailFilter, configFilter, resultFilter]);

  const loadAllData = async (orgId: string) => {
    try {
      const usersRes = await fetch(`/api/admin/users?organizationId=${orgId}`);
      if (usersRes.ok) setUsers(await usersRes.json());

      const configRes = await fetch(`/api/admin/configurations?organizationId=${orgId}`);
      if (configRes.ok) setConfigurations(await configRes.json());

      const scoresRes = await fetch(`/api/admin/confidence-scores?organizationId=${orgId}`);
      if (scoresRes.ok) setAllScores(await scoresRes.json());
    } catch (err) {
      console.error('Failed to load data:', err);
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
        body: JSON.stringify({ organizationId, email: newUserEmail, password: newUserPassword })
      });

      if (!res.ok) throw new Error('Failed to create user');
      setNewUserEmail('');
      setNewUserPassword('');
      loadAllData(organizationId);
      setError('');
    } catch (err) {
      setError('Failed to create user');
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
          description: '',
          included_modules: ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern']
        })
      });

      if (!res.ok) throw new Error('Failed to create configuration');
      setNewConfig({ name: '', allow_threshold: 80, challenge_threshold: 70 });
      setShowConfigForm(false);
      loadAllData(organizationId);
      setError('');
    } catch (err) {
      setError('Failed to create configuration');
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
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)', color: 'white', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Admin Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Organization: {organizationName}</p>
        </div>
        <button onClick={handleLogout} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {error && <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem' }}>
          <TabButton tab="overview" label="📊 Overview" />
          <TabButton tab="users" label="👥 Users" />
          <TabButton tab="configurations" label="⚙️ Configurations" />
          <TabButton tab="confidence-scores" label="📈 Confidence Scores" />
        </div>

        {activeTab === 'overview' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Organization Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: '0.9rem', color: '#1e40af', fontWeight: 600 }}>Total Users</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#1e40af', marginTop: '0.5rem' }}>{users.length}</div>
              </div>
              <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <div style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>Configurations</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#166534', marginTop: '0.5rem' }}>{configurations.length}</div>
              </div>
              <div style={{ background: '#fefce8', padding: '1.5rem', borderRadius: '8px', border: '1px solid #fef08a' }}>
                <div style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>Confidence Records</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#92400e', marginTop: '0.5rem' }}>{allScores.length}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>User Management</h2>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
              <h3 style={{ marginTop: 0, color: '#374151' }}>Create New User</h3>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr auto' }}>
                <input type="email" placeholder="Email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <input type="password" placeholder="Password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <button onClick={handleCreateUser} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Create User</button>
              </div>
            </div>
            <h3 style={{ color: '#374151' }}>Users ({users.length})</h3>
            {users.length === 0 ? <p style={{ color: '#6b7280' }}>No users</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', border: '1px solid #e5e7eb' }}>
                <thead><tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}><th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th></tr></thead>
                <tbody>{users.map((u) => <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}><td style={{ padding: '1rem' }}>{u.email}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'configurations' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Configurations</h2>
              <button onClick={() => setShowConfigForm(!showConfigForm)} style={{ padding: '0.75rem 1.5rem', background: '#2e75b6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>{showConfigForm ? 'Cancel' : '+ New Configuration'}</button>
            </div>
            {showConfigForm && (
              <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <input type="text" placeholder="Name" value={newConfig.name} onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }} />
                  <div><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Allow: {newConfig.allow_threshold}%</label><input type="range" min="0" max="100" value={newConfig.allow_threshold} onChange={(e) => setNewConfig({ ...newConfig, allow_threshold: parseInt(e.target.value) })} style={{ width: '100%' }} /></div>
                  <div><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Challenge: {newConfig.challenge_threshold}%</label><input type="range" min="0" max="100" value={newConfig.challenge_threshold} onChange={(e) => setNewConfig({ ...newConfig, challenge_threshold: parseInt(e.target.value) })} style={{ width: '100%' }} /></div>
                  <button onClick={handleCreateConfiguration} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', gridColumn: '1 / -1' }}>Create Configuration</button>
                </div>
              </div>
            )}
            {configurations.length === 0 ? <p style={{ color: '#6b7280' }}>No configurations</p> : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {configurations.map((c) => (
                  <div key={c.id} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{c.name}</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', fontSize: '0.85rem' }}>
                      <div><strong>Allow:</strong> {c.allow_threshold}%</div>
                      <div><strong>Challenge:</strong> {c.challenge_threshold}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'confidence-scores' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>Confidence Score History</h2>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Email:</label>
                <input type="text" placeholder="Search email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Configuration:</label>
                <select value={configFilter} onChange={(e) => setConfigFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}>
                  <option value="">All Configurations</option>
                  {configurations.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Result:</label>
                <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as any)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}>
                  <option value="all">All Results</option>
                  <option value="allow">Allow</option>
                  <option value="challenge">Challenge</option>
                  <option value="deny">Deny</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={() => { setEmailFilter(''); setConfigFilter(''); setResultFilter('all'); }} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Clear Filters</button>
              </div>
            </div>
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>Showing {filteredScores.length} of {allScores.length} records</div>
            {filteredScores.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No confidence scores found</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Configuration</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Decision</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScores.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ padding: '1rem' }}>{s.email}</td>
                      <td style={{ padding: '1rem' }}>{s.configuration_name}</td>
                      <td style={{ padding: '1rem', fontWeight: 600, color: '#2e75b6' }}>{s.confidence_score?.toFixed(1)}%</td>
                      <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.75rem', background: s.decision === 'allow' ? '#dcfce7' : s.decision === 'challenge' ? '#fef3c7' : '#fee2e2', color: s.decision === 'allow' ? '#166534' : s.decision === 'challenge' ? '#92400e' : '#991b1b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{s.decision}</span></td>
                      <td style={{ padding: '1rem', color: '#6b7280', fontSize: '0.8rem' }}>{new Date(s.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
