'use client';
import React, { useState, useEffect } from 'react';

interface AuthEvent {
  id: string;
  user_id?: string;
  organization_id: string;
  configuration_id: string;
  configuration_name?: string;
  overall_confidence: number;
  decision: string;
  test_results?: any;
  device_info?: any;
  ip_address: string;
  created_at: string;
}

export default function RawDataPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const orgId = localStorage.getItem('organizationId');
    if (!orgId) {
      window.location.href = '/admin/login';
      return;
    }
    setOrganizationId(orgId);
    loadData(orgId);
  }, []);

  const loadData = async (orgId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/raw-data?organizationId=${orgId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Raw data loaded:', data);
        setEvents(data);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('Error loading data: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const refresh = () => {
    if (organizationId) loadData(organizationId);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui' }}>
      <div style={{ background: 'linear-gradient(135deg, #2e75b6 0%, #1e40af 100%)', color: 'white', padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>📊 Raw Authentication Data</h1>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9, fontSize: '0.9rem' }}>Org: {organizationId}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={refresh} style={{ padding: '0.75rem 1.5rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>🔄 Refresh</button>
          <button onClick={() => window.location.href = '/admin'} style={{ padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid white', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>← Back</button>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        {error && <div style={{ padding: '1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', color: '#991b1b', marginBottom: '2rem' }}>{error}</div>}

        {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>}

        {!loading && events.length === 0 && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>No events found</div>}

        {!loading && events.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Date & Time</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Configuration</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Decision</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Confidence</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Tests Used</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Device</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>IP Address</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, idx) => {
                  const testResults = event.test_results || {};
                  const deviceInfo = event.device_info || {};
                  const testsUsed = testResults.tests_used || [];
                  const dateTime = new Date(event.created_at);
                  
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {dateTime.toLocaleDateString()} {dateTime.toLocaleTimeString()}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#1f2937' }}>
                        {event.configuration_name || 'N/A'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '0.25rem 0.75rem', background: event.decision === 'allow' ? '#dcfce7' : '#fee2e2', color: event.decision === 'allow' ? '#166534' : '#991b1b', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {event.decision.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 600, color: '#2e75b6' }}>
                        {event.overall_confidence}%
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.8rem', color: '#6b7280' }}>
                        {testsUsed.length > 0 ? testsUsed.join(', ') : 'N/A'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#6b7280' }}>
                        {deviceInfo.type || 'N/A'} {deviceInfo.app_version ? `v${deviceInfo.app_version}` : ''}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#6b7280', fontFamily: 'monospace' }}>
                        {event.ip_address}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.8rem' }}>
                        <details style={{ cursor: 'pointer' }}>
                          <summary style={{ fontWeight: 600, color: '#2e75b6' }}>View</summary>
                          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f3f4f6', borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace', overflow: 'auto', maxHeight: '200px' }}>
                            <div style={{ marginBottom: '0.5rem' }}>
                              <strong>Test Results:</strong>
                              <pre style={{ margin: '0.25rem 0 0 0', color: '#4b5563' }}>
                                {JSON.stringify(testResults, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <strong>Device Info:</strong>
                              <pre style={{ margin: '0.25rem 0 0 0', color: '#4b5563' }}>
                                {JSON.stringify(deviceInfo, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
