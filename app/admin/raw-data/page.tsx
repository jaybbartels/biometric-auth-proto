'use client';
import React, { useState, useEffect } from 'react';

interface AuthEvent {
  id: string;
  user_id: string;
  email: string;
  organization_id: string;
  configuration_name: string;
  overall_confidence: number;
  decision: string;
  device_info: {
    deviceType: string;
    browser: string;
    osVersion: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    userAgent?: string;
  };
  ip_address: string;
  created_at: string;
}

export default function RawDataPage() {
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [allEvents, setAllEvents] = useState<AuthEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuthEvent[]>([]);
  
  const [emailFilter, setEmailFilter] = useState('');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('');
  const [browserFilter, setBrowserFilter] = useState('');
  const [resultFilter, setResultFilter] = useState<'all' | 'allow' | 'challenge' | 'deny'>('all');

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const orgId = localStorage.getItem('organizationId');
    const orgName = localStorage.getItem('organizationName');

    if (!token || !orgId) {
      window.location.href = '/admin/login';
      return;
    }

    setOrganizationName(orgName);
    loadRawData(orgId);
  }, []);

  useEffect(() => {
    let filtered = allEvents;
    
    if (emailFilter) {
      filtered = filtered.filter(e => e.email.toLowerCase().includes(emailFilter.toLowerCase()));
    }
    if (deviceTypeFilter) {
      filtered = filtered.filter(e => e.device_info.deviceType === deviceTypeFilter);
    }
    if (browserFilter) {
      filtered = filtered.filter(e => e.device_info.browser === browserFilter);
    }
    if (resultFilter !== 'all') {
      filtered = filtered.filter(e => e.decision === resultFilter);
    }
    
    setFilteredEvents(filtered);
  }, [allEvents, emailFilter, deviceTypeFilter, browserFilter, resultFilter]);

  const loadRawData = async (orgId: string) => {
    try {
      const res = await fetch(`/api/admin/raw-data?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setAllEvents(data);
      }
    } catch (err) {
      console.error('Failed to load raw data:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('organizationId');
    localStorage.removeItem('organizationName');
    window.location.href = '/admin/login';
  };

  const uniqueDeviceTypes = [...new Set(allEvents.map(e => e.device_info.deviceType))];
  const uniqueBrowsers = [...new Set(allEvents.map(e => e.device_info.browser))];

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)', color: 'white', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📊 Raw Authentication Data</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>Organization: {organizationName}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={() => window.location.href = '/admin'} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>← Back to Admin</button>
          <button onClick={handleLogout} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Logout</button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Filters */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginTop: 0, color: '#1f2937' }}>Filters</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Email:</label>
              <input type="text" placeholder="Search..." value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Device Type:</label>
              <select value={deviceTypeFilter} onChange={(e) => setDeviceTypeFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}>
                <option value="">All Devices</option>
                {uniqueDeviceTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Browser:</label>
              <select value={browserFilter} onChange={(e) => setBrowserFilter(e.target.value)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}>
                <option value="">All Browsers</option>
                {uniqueBrowsers.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Result:</label>
              <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value as any)} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', background: 'white' }}>
                <option value="all">All Results</option>
                <option value="allow">Allow</option>
                <option value="challenge">Challenge</option>
                <option value="deny">Deny</option>
              </select>
            </div>
          </div>
          <button onClick={() => { setEmailFilter(''); setDeviceTypeFilter(''); setBrowserFilter(''); setResultFilter('all'); }} style={{ padding: '0.75rem 1.5rem', background: '#6b7280', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Clear Filters</button>
        </div>

        {/* Results */}
        <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#6b7280' }}>Showing {filteredEvents.length} of {allEvents.length} records</div>

          {filteredEvents.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No events found</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Email</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Device</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Browser</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>OS</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Decision</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>IP</th>
                    <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event, idx) => (
                    <React.Fragment key={idx}>
                      <tr style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                        <td style={{ padding: '1rem' }}>{event.email}</td>
                        <td style={{ padding: '1rem' }}>{event.device_info.deviceType}</td>
                        <td style={{ padding: '1rem' }}>{event.device_info.browser}</td>
                        <td style={{ padding: '1rem' }}>{event.device_info.osVersion}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: '#2e75b6' }}>{event.overall_confidence?.toFixed(1)}%</td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: event.decision === 'allow' ? '#dcfce7' : event.decision === 'challenge' ? '#fef3c7' : '#fee2e2',
                            color: event.decision === 'allow' ? '#166534' : event.decision === 'challenge' ? '#92400e' : '#991b1b',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            {event.decision}
                          </span>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                          {event.device_info.latitude && event.device_info.longitude ? `${event.device_info.latitude.toFixed(3)}, ${event.device_info.longitude.toFixed(3)}` : 'N/A'}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>{event.ip_address}</td>
                        <td style={{ padding: '1rem' }}>
                          <button onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)} style={{ padding: '0.25rem 0.75rem', background: '#2e75b6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                            {expandedIndex === idx ? '▼' : '▶'}
                          </button>
                        </td>
                      </tr>
                      {expandedIndex === idx && (
                        <tr style={{ background: '#f0f9ff', borderBottom: '1px solid #e5e7eb' }}>
                          <td colSpan={9} style={{ padding: '1rem' }}>
                            <pre style={{ background: '#1f2937', color: '#10b981', padding: '1rem', borderRadius: '6px', overflow: 'auto', fontSize: '0.75rem', margin: 0 }}>
                              {JSON.stringify({
                                device_info: event.device_info,
                                timestamp: event.created_at
                              }, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
