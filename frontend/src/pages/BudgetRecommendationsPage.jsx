import { useState } from 'react';
import { aiApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

export default function BudgetRecommendationsPage() {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const run = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await aiApi.budgetRecommendations();
      setResult(data.data);
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to generate recommendations.');
    } finally { setLoading(false); }
  };

  const savingsPct = result && result.raw_data?.avgMonthlyIncome > 0
    ? Math.round((result.total_potential_savings / result.raw_data.avgMonthlyIncome) * 100)
    : 0;

  return (
    <div style={{ padding: 24, fontFamily: F, color: '#f0ede8', minHeight: '100vh', background: '#111111' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Budget Advisor</h1>
        <p style={{ color: '#6a6460', fontSize: 13, margin: '0 0 24px' }}>
          AI analyzes your 3-month spending history and suggests realistic budgets per category.
        </p>

        {!result && !loading && (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: '56px 32px', textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: 'rgba(193,127,89,0.12)',
              border: '1px solid rgba(193,127,89,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c17f59" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em' }}>Generate Smart Budgets</h2>
            <p style={{ color: '#6a6460', fontSize: 13, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px', lineHeight: 1.6 }}>
              Based on your actual spending patterns, the AI will suggest personalized monthly budgets with specific reasoning for each category.
            </p>
            <button onClick={run} style={{
              padding: '10px 28px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: F,
              background: '#c17f59', color: '#fff', fontWeight: 600, fontSize: 14, transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
            >Analyze My Spending</button>
          </div>
        )}

        {loading && (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: 56, textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '3px solid #2a2a2a', borderTopColor: '#c17f59',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }} />
            <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            <p style={{ color: '#9e9894', fontSize: 13 }}>Analyzing your 3-month spending history…</p>
          </div>
        )}

        {error && (
          <div style={{ background: 'rgba(196,100,92,0.10)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#c4645c' }}>
            {error}
          </div>
        )}

        {result && (
          <>
            {result.summary && (
              <div style={{ background: 'rgba(193,127,89,0.08)', border: '1px solid rgba(193,127,89,0.20)', borderRadius: 12, padding: '14px 16px', marginBottom: 18, fontSize: 13, color: '#c17f59', lineHeight: 1.6 }}>
                {result.summary}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Total Suggested Budget',    val: `₹${(result.total_suggested_budget || 0).toLocaleString()}`,    color: '#c17f59' },
                { label: 'Potential Monthly Savings',  val: `₹${(result.total_potential_savings || 0).toLocaleString()}`,   color: '#6db48e' },
                { label: 'Savings of Income',         val: `${savingsPct}%`,                                                color: '#c49a4a' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#1c1c1c', borderRadius: 12, padding: '14px 16px', textAlign: 'center', border: '1px solid #262626' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', marginBottom: 6 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: '#6a6460', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ background: '#1c1c1c', borderRadius: 16, padding: '18px 20px', border: '1px solid #262626' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9e9894' }}>Category Budgets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(result.recommendations || []).map((rec, i) => {
                  const overPct = rec.current_avg > 0
                    ? Math.round(((rec.current_avg - rec.suggested_budget) / rec.current_avg) * 100)
                    : 0;
                  const isCut = rec.suggested_budget < rec.current_avg;
                  return (
                    <div key={i} style={{ background: '#111111', borderRadius: 12, padding: '14px 16px', border: '1px solid #222222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#f0ede8', marginBottom: 2 }}>{rec.category}</div>
                          <div style={{ fontSize: 11, color: '#6a6460' }}>Current avg: ₹{(rec.current_avg || 0).toLocaleString()}/mo</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: isCut ? '#6db48e' : '#c17f59', letterSpacing: '-0.01em' }}>
                            ₹{(rec.suggested_budget || 0).toLocaleString()}
                          </div>
                          {rec.potential_savings > 0 && (
                            <div style={{ fontSize: 11, color: '#6db48e', marginTop: 2 }}>
                              Save ₹{(rec.potential_savings || 0).toLocaleString()}/mo ({overPct}% cut)
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ background: '#1c1c1c', borderRadius: 3, height: 3, marginBottom: 10, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, rec.current_avg > 0 ? (rec.suggested_budget / rec.current_avg) * 100 : 100)}%`,
                          height: '100%', background: isCut ? '#6db48e' : '#c17f59', borderRadius: 3,
                        }} />
                      </div>
                      <p style={{ margin: 0, fontSize: 12, color: '#9e9894', lineHeight: 1.6 }}>{rec.reasoning}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button onClick={run} style={{
                background: '#222222', border: '1px solid #333333', color: '#9e9894',
                borderRadius: 10, padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontFamily: F, transition: 'color 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
              >Refresh Analysis</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
