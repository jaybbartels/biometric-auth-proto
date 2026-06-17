'use client';
import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
}

interface Configuration {
  id: string;
  name: string;
  description?: string;
  allow_threshold: number;
  challenge_threshold: number;
  included_modules?: string[];
  location_data?: any;
  allow_redirect_url?: string;
  challenge_redirect_url?: string;
  deny_redirect_url?: string;
}

interface ConfidenceScore {
  id: string;
  email: string;
  confidence_score: number;
  decision: string;
  created_at: string;
  configuration_name?: string;
  device_type?: string;
  app_version?: string;
}

type TabType = 'overview' | 'users' | 'configurations' | 'confidence-scores' | 'enrollment';

const BIOMETRIC_OPTIONS = [
  { id: 'gait_analysis', label: '🚶 Gait Analysis' },
  { id: 'touch_dynamics', label: '👆 Touch Dynamics' },
  { id: 'hand_motion', label: '🤚 Hand Motion' },
  { id: 'behavioral_pattern', label: '🧠 Behavioral Pattern' },
  { id: 'facial_recognition', label: '👤 Facial Recognition' }
];

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
    description: '',
    allow_threshold: 80,
    challenge_threshold: 70,
    included_modules: ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern'],
    allow_redirect_url: '',
    challenge_redirect_url: '',
    deny_redirect_url: '',
    enableLocation: false,
    location_latitude: 37.7749,
    location_longitude: -122.4194,
    location_radius_km: 5,
    geolocation_penalty: 15
  });

  const [allScores, setAllScores] = useState<ConfidenceScore[]>([]);
  const [filteredScores, setFilteredScores] = useState<ConfidenceScore[]>([]);
  const [emailFilter, setEmailFilter] = useState('');
  const [configFilter, setConfigFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'allow' | 'deny'>('all');

  const [enrollmentEmail, setEnrollmentEmail] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [enrollmentLink, setEnrollmentLink] = useState('');
  const [enrollmentMessage, setEnrollmentMessage] = useState('');

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
    
    // Email filter
    if (emailFilter) {
      filtered = filtered.filter(s => (s.email || '').toLowerCase().includes(emailFilter.toLowerCase()));
    }
    
    // Configuration filter
    if (configFilter) {
      filtered = filtered.filter(s => (s.configuration_name || '').toLowerCase().includes(configFilter.toLowerCase()));
    }
    
    // Date range filter
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter(s => new Date(s.created_at) >= fromDate);
    }
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => new Date(s.created_at) <= toDate);
    }
    
    // Result filter
    if (resultFilter !== 'all') {
      filtered = filtered.filter(s => s.decision === resultFilter);
    }
    
    setFilteredScores(filtered);
  }, [allScores, emailFilter, configFilter, dateFromFilter, dateToFilter, resultFilter]);

  const loadAllData = async (orgId: string) => {
    try {
      const usersRes = await fetch(`/api/admin/users?organizationId=${orgId}`);
      if (usersRes.ok) setUsers(await usersRes.json());

      const configRes = await fetch(`/api/admin/configurations?organizationId=${orgId}`);
      if (configRes.ok) setConfigurations(await configRes.json());

      const scoresRes = await fetch(`/api/admin/confidence-scores?organizationId=${orgId}`);
      const scoresData = await scoresRes.json();
      if (scoresRes.ok) setAllScores(scoresData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load data: ' + (err instanceof Error ? err.message : 'Unknown'));
    }
  };

  const refreshConfidenceScores = async () => {
    if (!organizationId) return;
    try {
      const scoresRes = await fetch(`/api/admin/confidence-scores?organizationId=${organizationId}`);
      const scoresData = await scoresRes.json();
      if (scoresRes.ok) {
        setAllScores(scoresData);
      }
    } catch (err) {
      console.error('Failed to refresh scores:', err);
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

    if (newConfig.included_modules.length === 0) {
      setError('At least one biometric type must be selected');
      return;
    }

    try {
      const configData: any = {
        organizationId,
        name: newConfig.name,
        description: newConfig.description,
        included_modules: newConfig.included_modules,
        allow_threshold: newConfig.allow_threshold,
        challenge_threshold: newConfig.challenge_threshold,
        allow_redirect_url: newConfig.allow_redirect_url || null,
        challenge_redirect_url: newConfig.challenge_redirect_url || null,
        deny_redirect_url: newConfig.deny_redirect_url || null
      };

      if (newConfig.enableLocation) {
        configData.location_latitude = newConfig.location_latitude;
        configData.location_longitude = newConfig.location_longitude;
        configData.location_radius_km = newConfig.location_radius_km;
        configData.geolocation_penalty = newConfig.geolocation_penalty;
      }

      const res = await fetch('/api/admin/configurations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });

      if (!res.ok) throw new Error('Failed to create configuration');
      setNewConfig({ 
        name: '', 
        description: '',
        allow_threshold: 80, 
        challenge_threshold: 70,
        included_modules: ['gait_analysis', 'touch_dynamics', 'hand_motion', 'behavioral_pattern'],
        allow_redirect_url: '',
        challenge_redirect_url: '',
        deny_redirect_url: '',
        enableLocation: false,
        location_latitude: 37.7749,
        location_longitude: -122.4194,
        location_radius_km: 5,
        geolocation_penalty: 15
      });
      setShowConfigForm(false);
      loadAllData(organizationId);
      setError('');
    } catch (err) {
      setError('Failed to create configuration');
    }
  };

  const handleGenerateEnrollmentCode = async () => {
    if (!enrollmentEmail || !organizationId) {
      setError('Email required');
      return;
    }

    try {
      const res = await fetch('/api/admin/generate-enrollment-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, email: enrollmentEmail })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to generate code');
      
      setEnrollmentCode(data.enrollmentCode);
      setEnrollmentLink(data.trainingLink);
      setEnrollmentMessage(`✓ Enrollment link generated for ${enrollmentEmail}`);
      setError('');
    } catch (err) {
      setError('Failed to generate code: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(enrollmentLink);
    setEnrollmentMessage('✓ Link copied to clipboard!');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('organizationName');
    window.location.href = '/admin/login';
  };

  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => (
    <button onClick={() => setActiveTab(tab)} style={{ padding: '0.75rem 1.5rem', background: activeTab === tab ? '#2e75b6' : '#e5e7eb', color: activeTab === tab ? 'white' : '#374151', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', marginRight: '0.5rem' }}>{label}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)', color: 'white', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>🔐 Admin Dashboard</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Organization: {organizationName}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => window.location.href = '/admin/raw-data'} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>📊 Raw Data</button>
          <button onClick={handleLogout} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {error && <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

        <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <TabButton tab="overview" label="📊 Overview" />
          <TabButton tab="users" label="👥 Users" />
          <TabButton tab="configurations" label="⚙️ Configurations" />
          <TabButton tab="enrollment" label="🎓 Enrollment" />
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
                <div style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>Auth Records</div>
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
              <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #e5e7eb', maxHeight: '80vh', overflowY: 'auto' }}>
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <input type="text" placeholder="Name" value={newConfig.name} onChange={(e) => setNewConfig({ ...newConfig, name: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1' }} />
                  <textarea placeholder="Description" value={newConfig.description} onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', gridColumn: '1 / -1', minHeight: '60px', fontFamily: 'inherit' }} />
                  
                  <div><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Allow Threshold: {newConfig.allow_threshold}%</label><input type="range" min="0" max="100" value={newConfig.allow_threshold} onChange={(e) => setNewConfig({ ...newConfig, allow_threshold: parseInt(e.target.value) })} style={{ width: '100%' }} /></div>
                  <div><label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Challenge Threshold: {newConfig.challenge_threshold}%</label><input type="range" min="0" max="100" value={newConfig.challenge_threshold} onChange={(e) => setNewConfig({ ...newConfig, challenge_threshold: parseInt(e.target.value) })} style={{ width: '100%' }} /></div>
                  
                  <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#e0f2fe', borderRadius: '6px', border: '1px solid #7dd3fc' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1' }}>📋 Select Biometric Tests</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      {BIOMETRIC_OPTIONS.map((bio) => (
                        <label key={bio.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                          <input 
                            type="checkbox" 
                            checked={newConfig.included_modules.includes(bio.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewConfig({ ...newConfig, included_modules: [...newConfig.included_modules, bio.id] });
                              } else {
                                setNewConfig({ ...newConfig, included_modules: newConfig.included_modules.filter(m => m !== bio.id) });
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          />
                          {bio.label}
                        </label>
                      ))}
                    </div>
                    <p style={{ margin: '1rem 0 0 0', fontSize: '0.8rem', color: '#0c4a6e' }}>Selected: {newConfig.included_modules.length} test(s)</p>
                  </div>

                  <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                    <h4 style={{ margin: '0 0 1rem 0', color: '#92400e' }}>🔗 Redirect URLs (Optional)</h4>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <input type="url" placeholder="Allow Redirect URL" value={newConfig.allow_redirect_url} onChange={(e) => setNewConfig({ ...newConfig, allow_redirect_url: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #fcd34d', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
                      <input type="url" placeholder="Challenge Redirect URL" value={newConfig.challenge_redirect_url} onChange={(e) => setNewConfig({ ...newConfig, challenge_redirect_url: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #fcd34d', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
                      <input type="url" placeholder="Deny Redirect URL" value={newConfig.deny_redirect_url} onChange={(e) => setNewConfig({ ...newConfig, deny_redirect_url: e.target.value })} style={{ padding: '0.75rem', border: '1px solid #fcd34d', borderRadius: '6px', width: '100%', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  
                  <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bfdbfe' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer', marginBottom: '1rem' }}>
                      <input type="checkbox" checked={newConfig.enableLocation} onChange={(e) => setNewConfig({ ...newConfig, enableLocation: e.target.checked })} style={{ cursor: 'pointer' }} />
                      📍 Enable Location Verification (Optional)
                    </label>

                    {newConfig.enableLocation && (
                      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr 1fr' }}>
                        <input type="number" step="0.0001" placeholder="Latitude" value={newConfig.location_latitude} onChange={(e) => setNewConfig({ ...newConfig, location_latitude: parseFloat(e.target.value) })} style={{ padding: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '6px', boxSizing: 'border-box' }} />
                        <input type="number" step="0.0001" placeholder="Longitude" value={newConfig.location_longitude} onChange={(e) => setNewConfig({ ...newConfig, location_longitude: parseFloat(e.target.value) })} style={{ padding: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '6px', boxSizing: 'border-box' }} />
                        <input type="number" step="0.1" placeholder="Radius (km)" value={newConfig.location_radius_km} onChange={(e) => setNewConfig({ ...newConfig, location_radius_km: parseFloat(e.target.value) })} style={{ padding: '0.75rem', border: '1px solid #bfdbfe', borderRadius: '6px', boxSizing: 'border-box' }} />
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Geolocation Penalty: {newConfig.geolocation_penalty}%</label>
                          <input type="range" min="0" max="100" value={newConfig.geolocation_penalty} onChange={(e) => setNewConfig({ ...newConfig, geolocation_penalty: parseInt(e.target.value) })} style={{ width: '100%' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <button onClick={handleCreateConfiguration} style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', gridColumn: '1 / -1' }}>✓ Create Configuration</button>
                </div>
              </div>
            )}

            {configurations.length === 0 ? <p style={{ color: '#6b7280' }}>No configurations</p> : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {configurations.map((c) => (
                  <div key={c.id} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1f2937' }}>{c.name}</h4>
                    {c.description && <p style={{ margin: '0.25rem 0 0.5rem 0', color: '#6b7280', fontSize: '0.9rem' }}>{c.description}</p>}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', fontSize: '0.85rem', marginBottom: '1rem' }}>
                      <div><strong>Allow:</strong> {c.allow_threshold}%</div>
                      <div><strong>Challenge:</strong> {c.challenge_threshold}%</div>
                    </div>
                    {c.included_modules && c.included_modules.length > 0 && (
                      <div style={{ padding: '0.75rem', background: '#e0f2fe', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '0.5rem', border: '1px solid #7dd3fc' }}>
                        <strong>Tests:</strong> {c.included_modules.map(m => BIOMETRIC_OPTIONS.find(b => b.id === m)?.label || m).join(', ')}
                      </div>
                    )}
                    {c.allow_redirect_url && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}><strong>✓</strong> {c.allow_redirect_url}</div>}
                    {c.deny_redirect_url && <div style={{ fontSize: '0.8rem', color: '#6b7280' }}><strong>✗</strong> {c.deny_redirect_url}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'enrollment' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0, color: '#1f2937' }}>🎓 User Enrollment</h2>
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0, color: '#374151' }}>Generate Training Link</h3>
              <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>Create enrollment codes for users. Training is valid for 30 days.</p>
              <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr auto' }}>
                <input type="email" placeholder="User email" value={enrollmentEmail} onChange={(e) => setEnrollmentEmail(e.target.value)} style={{ padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px' }} />
                <button onClick={handleGenerateEnrollmentCode} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Generate Code</button>
              </div>
            </div>

            {enrollmentMessage && <div style={{ padding: '1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', color: '#166534', marginBottom: '2rem' }}>{enrollmentMessage}</div>}

            {enrollmentCode && (
              <div style={{ background: '#dbeafe', padding: '1.5rem', borderRadius: '8px', border: '1px solid #93c5fd' }}>
                <h3 style={{ marginTop: 0, color: '#1e40af' }}>Enrollment Code Generated</h3>
                <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #93c5fd' }}>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Code:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, color: '#1e40af', wordBreak: 'break-all' }}>{enrollmentCode}</div>
                </div>

                <div style={{ background: 'white', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', border: '1px solid #93c5fd' }}>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.5rem' }}>Training Link:</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e40af', wordBreak: 'break-all' }}>{enrollmentLink}</div>
                </div>

                <button onClick={copyToClipboard} style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>📋 Copy Link to Clipboard</button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'confidence-scores' && (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h2 style={{ margin: 0, color: '#1f2937' }}>Confidence Score History ({allScores.length} records)</h2>
              <button onClick={refreshConfidenceScores} style={{ padding: '0.75rem 1.5rem', background: '#2e75b6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
            </div>
            
            <div style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Email:</label>
                  <input type="text" placeholder="Search email..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Configuration:</label>
                  <input type="text" placeholder="Search config..." value={configFilter} onChange={(e) => setConfigFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>From Date:</label>
                  <input type="date" value={dateFromFilter} onChange={(e) => setDateFromFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', background: 'white' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>To Date:</label>
                  <input type="date" value={dateToFilter} onChange={(e) => setDateToFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box', background: 'white' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button onClick={() => { setEmailFilter(''); setConfigFilter(''); setDateFromFilter(''); setDateToFilter(''); setResultFilter('all'); }} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>Filter by Result:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="result" value="all" checked={resultFilter === 'all'} onChange={() => setResultFilter('all')} style={{ cursor: 'pointer' }} />
                    All Results
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="result" value="allow" checked={resultFilter === 'allow'} onChange={() => setResultFilter('allow')} style={{ cursor: 'pointer' }} />
                    Allow
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input type="radio" name="result" value="deny" checked={resultFilter === 'deny'} onChange={() => setResultFilter('deny')} style={{ cursor: 'pointer' }} />
                    Deny
                  </label>
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>Showing {filteredScores.length} of {allScores.length} records</div>
            {filteredScores.length === 0 ? <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem', background: '#f9fafb', borderRadius: '6px' }}>No confidence scores found</p> : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Date & Time</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Configuration</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Decision</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Device / Version</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScores.map((s, i) => {
                    const dateTime = new Date(s.created_at);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {dateTime.toLocaleDateString()} {dateTime.toLocaleTimeString()}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
                          {s.email || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
                          {s.configuration_name || 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#2e75b6' }}>{s.confidence_score}%</td>
                        <td style={{ padding: '1rem' }}><span style={{ padding: '0.25rem 0.75rem', background: s.decision === 'allow' ? '#dcfce7' : '#fee2e2', color: s.decision === 'allow' ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{s.decision.toUpperCase()}</span></td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                          {s.device_type} {s.app_version ? `v${s.app_version}` : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
