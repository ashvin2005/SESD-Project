import { useState } from 'react';
import { aiApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

const S = {
  page:  { padding: 24, fontFamily: F, color: '#f0ede8', minHeight: '100vh', background: '#111111' },
  card:  { background: '#1c1c1c', borderRadius: 16, padding: '20px 22px', marginBottom: 18, border: '1px solid #262626' },
  label: { fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block', fontWeight: 500 },
  input: { width: '100%', background: '#111111', border: '1px solid #333333', color: '#f0ede8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: F, transition: 'border-color 0.15s' },
};

const FEASIBILITY = {
  achievable: { bg: 'rgba(109,180,142,0.10)', border: 'rgba(109,180,142,0.30)', color: '#6db48e',  label: 'Achievable' },
  challenging: { bg: 'rgba(196,154,74,0.10)', border: 'rgba(196,154,74,0.30)', color: '#c49a4a',  label: 'Challenging' },
  difficult:   { bg: 'rgba(196,100,92,0.10)', border: 'rgba(196,100,92,0.30)', color: '#c4645c',  label: 'Difficult' },
};

export default function GoalPlanPage() {
  const [form, setForm]     = useState({ goal_amount: '', goal_description: '', months: '6' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError]   = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(''); setResult(null);
    try {
      const { data } = await aiApi.goalPlan({
        goal_amount: parseFloat(form.goal_amount),
        goal_description: form.goal_description,
        months: parseInt(form.months, 10),
      });
      setResult(data.data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to generate plan. Please try again.');
    } finally { setLoading(false); }
  };

  const canSubmit = !loading && form.goal_amount && form.months;
  const fStyle = result ? (FEASIBILITY[result.feasibility] || FEASIBILITY.challenging) : null;

  const fb = (e) => { e.target.style.borderColor = '#c17f59'; };
  const bb = (e) => { e.target.style.borderColor = '#333333'; };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Goal Planning</h1>
        <p style={{ color: '#6a6460', fontSize: 13, margin: '0 0 24px' }}>
          Tell me your savings goal and I'll build a personalized plan based on your spending.
        </p>

        <div style={S.card}>
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={S.label}>Goal Amount (₹) *</label>
                <input style={S.input} type="number" min="1" placeholder="100000"
                  value={form.goal_amount} onChange={set('goal_amount')} required onFocus={fb} onBlur={bb} />
              </div>
              <div>
                <label style={S.label}>Timeframe (months) *</label>
                <input style={S.input} type="number" min="1" max="60" placeholder="6"
                  value={form.months} onChange={set('months')} required onFocus={fb} onBlur={bb} />
              </div>
              <div>
                <label style={S.label}>Description (optional)</label>
                <input style={S.input} type="text" placeholder="Emergency fund, Vacation…"
                  value={form.goal_description} onChange={set('goal_description')} onFocus={fb} onBlur={bb} />
              </div>
            </div>
            {error && (
              <div style={{ background: 'rgba(196,100,92,0.10)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c4645c' }}>
                {error}
              </div>
            )}
            <button type="submit" disabled={!canSubmit} style={{
              padding: '10px 24px', borderRadius: 10, border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 600, fontSize: 14, fontFamily: F, transition: 'background 0.15s',
              background: canSubmit ? '#c17f59' : '#252525',
              color: canSubmit ? '#fff' : '#6a6460',
            }}
              onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = '#d4916a'; }}
              onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.background = '#c17f59'; }}
            >
              {loading ? 'Generating plan…' : 'Generate My Plan'}
            </button>
          </form>
        </div>

        {result && (
          <>
            {/* Feasibility banner */}
            <div style={{ background: fStyle.bg, border: `1px solid ${fStyle.border}`, borderRadius: 14, padding: '18px 20px', marginBottom: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: fStyle.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {fStyle.label}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#9e9894', lineHeight: 1.6, maxWidth: 480 }}>{result.feasibility_reason}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                  <div style={{ fontSize: 11, color: '#6a6460', marginBottom: 4 }}>Required / month</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: fStyle.color, letterSpacing: '-0.02em' }}>
                    ₹{(result.required_monthly_savings || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: '#6a6460', marginTop: 3 }}>
                    Current: ₹{(result.current_monthly_savings || 0).toLocaleString()}/mo
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Monthly Gap',  val: `₹${(result.monthly_gap || 0).toLocaleString()}`, sub: 'to close', color: result.monthly_gap > 0 ? '#c4645c' : '#6db48e' },
                { label: 'Goal Amount',  val: `₹${parseFloat(form.goal_amount).toLocaleString()}`, sub: form.goal_description || 'savings goal', color: '#c17f59' },
                { label: 'Timeframe',    val: `${form.months} months`, sub: 'to achieve goal', color: '#6a8fb5' },
              ].map((s) => (
                <div key={s.label} style={{ background: '#1c1c1c', borderRadius: 12, padding: '14px 16px', textAlign: 'center', border: '1px solid #262626' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em', marginBottom: 4 }}>{s.val}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#9e9894', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#6a6460', marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* Action plan */}
            {result.action_plan?.length > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9e9894' }}>Action Plan</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.action_plan.map((a, i) => (
                    <div key={i} style={{ background: '#111111', borderRadius: 12, padding: '14px 16px', border: '1px solid #222222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            display: 'inline-flex', width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(193,127,89,0.15)', color: '#c17f59', fontSize: 10, fontWeight: 700,
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>{i + 1}</span>
                          <strong style={{ fontSize: 13, color: '#f0ede8' }}>{a.action}</strong>
                          {a.category && <span style={{ fontSize: 11, color: '#6a6460' }}>({a.category})</span>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 11, color: '#6a6460' }}>
                            ₹{(a.current_spend || 0).toLocaleString()} → ₹{(a.target_spend || 0).toLocaleString()}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#6db48e', marginTop: 2 }}>
                            Save ₹{(a.monthly_saving || 0).toLocaleString()}/mo
                          </div>
                        </div>
                      </div>
                      {a.tip && <p style={{ margin: 0, fontSize: 12, color: '#9e9894', paddingLeft: 30, lineHeight: 1.6 }}>{a.tip}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            {result.timeline?.length > 0 && (
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9e9894' }}>Savings Timeline</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {result.timeline.map((t, i) => {
                    const pct = Math.min(100, Math.round((t.cumulative / parseFloat(form.goal_amount)) * 100));
                    return (
                      <div key={i} style={{
                        background: '#111111', borderRadius: 10, padding: '10px 14px', minWidth: 90, textAlign: 'center',
                        border: `1px solid ${pct >= 100 ? 'rgba(109,180,142,0.30)' : '#222222'}`,
                      }}>
                        <div style={{ fontSize: 10, color: '#6a6460', marginBottom: 4, fontWeight: 500 }}>Month {t.month}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? '#6db48e' : '#f0ede8', letterSpacing: '-0.01em' }}>
                          ₹{(t.cumulative || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: 10, color: pct >= 100 ? '#6db48e' : '#c17f59', marginTop: 2, fontWeight: 600 }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Motivational note */}
            {result.motivational_note && (
              <div style={{ background: 'rgba(193,127,89,0.08)', border: '1px solid rgba(193,127,89,0.20)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#c17f59', lineHeight: 1.6, marginBottom: 18 }}>
                {result.motivational_note}
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setResult(null)} style={{
                background: '#222222', border: '1px solid #333333', color: '#9e9894',
                borderRadius: 10, padding: '9px 24px', fontSize: 13, cursor: 'pointer', fontFamily: F, transition: 'color 0.15s',
              }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
              >Plan Another Goal</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
