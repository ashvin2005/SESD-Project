import { useState } from 'react';
import { aiApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

const SEV = {
  high:   { bg: 'rgba(196,100,92,0.10)',  border: 'rgba(196,100,92,0.30)',  color: '#c4645c',  label: 'High' },
  medium: { bg: 'rgba(196,154,74,0.10)',  border: 'rgba(196,154,74,0.30)',  color: '#c49a4a',  label: 'Medium' },
  low:    { bg: 'rgba(193,127,89,0.08)',  border: 'rgba(193,127,89,0.25)',  color: '#c17f59',  label: 'Low' },
};

export default function AnomaliesPage() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await aiApi.anomalies();
      setResult(data.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Analysis failed. Please try again.');
    } finally { setLoading(false); }
  };

  const sev = (s) => SEV[s] || SEV.low;

  return (
    <div style={{ padding: 24, fontFamily: F, color: '#f0ede8', minHeight: '100vh', background: '#111111' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Anomaly Detection</h1>
        <p style={{ color: '#6a6460', fontSize: 13, margin: '0 0 24px' }}>
          Compares your last 7 days of transactions against 3-month historical patterns.
        </p>

        {!result && !loading && (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: '56px 32px', textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'rgba(193,127,89,0.12)',
              border: '1px solid rgba(193,127,89,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c17f59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="16" x2="11.01" y2="16"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>Scan for Unusual Activity</h2>
            <p style={{ color: '#6a6460', fontSize: 13, marginBottom: 24, maxWidth: 360, margin: '0 auto 24px', lineHeight: 1.6 }}>
              AI compares each recent transaction against your historical spending patterns and flags anything out of the ordinary.
            </p>
            <button onClick={run} style={{
              padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: F,
              background: '#c17f59', color: '#fff', fontWeight: 600, fontSize: 14, transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
            >Run Analysis</button>
          </div>
        )}

        {loading && (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: 56, textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid #2a2a2a',
              borderTopColor: '#c17f59',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#9e9894', fontSize: 13 }}>Analyzing your transactions…</p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(196,100,92,0.10)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#c4645c', fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && (
          <>
            {result.summary && (
              <div style={{ background: '#1c1c1c', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#9e9894', lineHeight: 1.6, border: '1px solid #262626' }}>
                {result.summary}
              </div>
            )}

            {result.anomalies?.length === 0 ? (
              <div style={{ background: 'rgba(109,180,142,0.08)', border: '1px solid rgba(109,180,142,0.25)', borderRadius: 16, padding: 56, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: '#6db48e', fontWeight: 600, marginBottom: 6 }}>No Anomalies Detected</div>
                <p style={{ color: '#9e9894', fontSize: 13 }}>All recent transactions look normal based on your spending history.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.anomalies.map((a, i) => {
                  const s = sev(a.severity);
                  return (
                    <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 14, padding: '18px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14, color: '#f0ede8', marginBottom: 3 }}>{a.description}</div>
                          <div style={{ fontSize: 12, color: '#9e9894' }}>{a.category}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: 18, color: s.color, letterSpacing: '-0.02em' }}>
                            ₹{(a.amount || 0).toLocaleString()}
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                            background: s.border, color: s.color,
                            padding: '2px 7px', borderRadius: 4, display: 'inline-block', marginTop: 4,
                          }}>{s.label}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 13, color: '#9e9894', margin: '0 0 8px', lineHeight: 1.6 }}>{a.explanation}</p>
                      {a.was_this_intentional && (
                        <div style={{ fontSize: 12, color: '#6a6460', fontStyle: 'italic' }}>{a.was_this_intentional}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ marginTop: 22, textAlign: 'center' }}>
              <button onClick={run} style={{
                background: '#222222', border: '1px solid #333333', color: '#9e9894',
                borderRadius: 10, padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontFamily: F,
                transition: 'color 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
              >Run Again</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
