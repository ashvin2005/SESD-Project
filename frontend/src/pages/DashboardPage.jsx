import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi, insightsApi } from '../services/api';
import { BarChart, DonutChart } from '../components/Charts';

const F = "'Inter', system-ui, sans-serif";

function StatCard({ label, value, sub, accent = '#c17f59' }) {
  return (
    <div style={{
      background: '#1c1c1c', borderRadius: 14, padding: '18px 20px',
      border: '1px solid #262626',
    }}>
      <div style={{ fontSize: 11, color: '#6a6460', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: '#f0ede8', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#6a6460', marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function HealthScore({ score, breakdown }) {
  if (!score && score !== 0) return null;
  const color = score >= 70 ? '#6db48e' : score >= 40 ? '#c49a4a' : '#c4645c';
  const label = score >= 70 ? 'Healthy' : score >= 40 ? 'Fair' : 'Needs Work';
  const R = 44, circ = 2 * Math.PI * R;
  const dash = (score / 100) * circ;
  return (
    <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', border: '1px solid #262626' }}>
      <div style={{ fontSize: 11, color: '#6a6460', fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 14 }}>Financial Health</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <svg viewBox="0 0 100 100" style={{ width: 80, flexShrink: 0 }}>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#222222" strokeWidth="10" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
            strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.6s' }} />
          <text x="50" y="48" textAnchor="middle" fontSize="18" fontWeight="700" fill="#f0ede8">{score}</text>
          <text x="50" y="62" textAnchor="middle" fontSize="9" fill={color}>{label}</text>
        </svg>
        {breakdown && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
            {Object.entries(breakdown).map(([k, v]) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6a6460', marginBottom: 3 }}>
                  <span style={{ textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontWeight: 600, color: '#9e9894' }}>{v}%</span>
                </div>
                <div style={{ height: 3, background: '#222222', borderRadius: 2 }}>
                  <div style={{
                    height: 3, borderRadius: 2, width: `${v}%`,
                    background: v >= 70 ? '#6db48e' : v >= 40 ? '#c49a4a' : '#c4645c',
                    transition: 'width 0.6s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const AI_FEATURES = [
  { path: '/chat',        label: 'Finance Assistant', desc: 'Ask about your spending in plain English', accent: '#c17f59' },
  { path: '/anomalies',   label: 'Anomaly Scanner',   desc: 'Detect unusual transactions',             accent: '#c4645c' },
  { path: '/goal-plan',   label: 'Goal Planner',      desc: 'Build a personalized savings plan',       accent: '#6db48e' },
  { path: '/import',      label: 'Bank Import',        desc: 'Auto-categorize bank statements',         accent: '#c49a4a' },
  { path: '/budget-recs', label: 'Budget Advisor',    desc: 'AI-suggested budget per category',        accent: '#6a8fb5' },
];

const SEV_COLOR = { info: '#6a8fb5', warning: '#c49a4a', critical: '#c4645c' };

export default function DashboardPage() {
  const [data, setData]       = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([dashboardApi.get(), insightsApi.generate()])
      .then(([d, ins]) => {
        setData(d.data.data);
        setInsights(ins.data.data?.insights || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => n != null
    ? `₹${parseFloat(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : '—';

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center', color: '#6a6460', fontFamily: F }}>
      Loading dashboard…
    </div>
  );

  const summary      = data?.summary || {};
  const trend        = (data?.monthly_trend || []).map((r) => ({ label: r.label, income: r.income, expense: r.expense }));
  const catBreakdown = (data?.category_breakdown || []).map((c) => ({ label: c.category_name, value: c.amount, color: c.color || '#c17f59' }));
  const budgetAlerts = data?.budget_alerts || [];
  const health       = data?.health_score;
  const recentTx     = data?.recent_transactions || [];

  return (
    <div style={{ padding: 24, fontFamily: F, color: '#f0ede8', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Your financial overview</p>
        </div>
        <Link to="/transactions" style={{
          background: '#c17f59', color: '#fff', textDecoration: 'none',
          borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600,
          letterSpacing: '-0.01em', transition: 'background 0.15s', display: 'inline-block',
        }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
        >+ Add Transaction</Link>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 12, marginBottom: 20 }}>
        <StatCard label="Income" value={fmt(summary.total_income)} sub="this month" accent="#6db48e" />
        <StatCard label="Expenses" value={fmt(summary.total_expense)} sub="this month" accent="#c4645c" />
        <StatCard label="Net Savings" value={fmt(summary.net_savings)} sub="this month" accent="#c17f59" />
        <StatCard label="Savings Rate" value={summary.savings_rate != null ? `${summary.savings_rate}%` : '—'} sub="this month" accent="#c49a4a" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '20px 20px', border: '1px solid #262626' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9e9894', letterSpacing: '-0.01em' }}>Income vs Expenses</div>
          <BarChart
            data={trend}
            bars={[
              { key: 'income',  color: '#6db48e', label: 'Income' },
              { key: 'expense', color: '#c4645c', label: 'Expense' },
            ]}
          />
        </div>
        <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '20px 20px', border: '1px solid #262626' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#9e9894', letterSpacing: '-0.01em' }}>Expenses by Category</div>
          <DonutChart data={catBreakdown} total={summary.total_expense} />
        </div>
      </div>

      {/* Health + Budget Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <HealthScore score={health?.score} breakdown={health?.breakdown} />

        <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', border: '1px solid #262626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9e9894' }}>Budget Alerts</div>
            <Link to="/budgets" style={{ fontSize: 12, color: '#c17f59', textDecoration: 'none' }}>Manage</Link>
          </div>
          {budgetAlerts.length === 0 ? (
            <div style={{ color: '#6a6460', fontSize: 13, padding: '8px 0' }}>All budgets within limits</div>
          ) : budgetAlerts.map((b) => (
            <div key={b.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 500 }}>{b.category_name}</span>
                <span style={{ color: b.percentage >= 100 ? '#c4645c' : '#c49a4a', fontWeight: 700 }}>{b.percentage}%</span>
              </div>
              <div style={{ height: 4, background: '#222222', borderRadius: 2 }}>
                <div style={{
                  height: 4, borderRadius: 2, width: `${Math.min(b.percentage, 100)}%`,
                  background: b.percentage >= 100 ? '#c4645c' : '#c49a4a',
                  transition: 'width 0.5s',
                }} />
              </div>
              <div style={{ fontSize: 11, color: '#6a6460', marginTop: 4 }}>
                ₹{parseFloat(b.spent || 0).toLocaleString()} / ₹{parseFloat(b.limit || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTx.length > 0 && (
        <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', marginBottom: 14, border: '1px solid #262626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9e9894' }}>Recent Transactions</div>
            <Link to="/transactions" style={{ fontSize: 12, color: '#c17f59', textDecoration: 'none' }}>View all</Link>
          </div>
          {recentTx.slice(0, 8).map((tx, i) => (
            <div key={tx.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 0',
              borderBottom: i < Math.min(recentTx.length, 8) - 1 ? '1px solid #1e1e1e' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: '#222222',
                  border: '1px solid #2a2a2a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, flexShrink: 0,
                }}>
                  {tx.category_icon || '·'}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#f0ede8' }}>{tx.description}</div>
                  <div style={{ fontSize: 11, color: '#6a6460', marginTop: 1 }}>
                    {tx.transaction_date}{tx.category_name ? ` · ${tx.category_name}` : ''}
                  </div>
                </div>
              </div>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: tx.type === 'income' ? '#6db48e' : '#c4645c',
                letterSpacing: '-0.01em',
              }}>
                {tx.type === 'income' ? '+' : '−'}₹{(parseFloat(tx.amount || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Features */}
      <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', marginBottom: insights.length ? 14 : 0, border: '1px solid #262626' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#9e9894' }}>AI-Powered Features</span>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
            background: 'rgba(193,127,89,0.15)', color: '#c17f59',
            padding: '2px 6px', borderRadius: 4,
          }}>BETA</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: 10 }}>
          {AI_FEATURES.map((f) => (
            <Link key={f.path} to={f.path} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: '#111111', borderRadius: 10, padding: '14px 14px',
                  border: '1px solid #262626', transition: 'border-color 0.15s, background 0.15s',
                  height: '100%',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = f.accent;
                  e.currentTarget.style.background = f.accent + '0d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#262626';
                  e.currentTarget.style.background = '#111111';
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: f.accent + '18',
                  border: `1px solid ${f.accent}33`,
                  marginBottom: 10,
                }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f0ede8', marginBottom: 4, letterSpacing: '-0.01em' }}>{f.label}</div>
                <div style={{ fontSize: 11, color: '#6a6460', lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', border: '1px solid #262626' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#9e9894', marginBottom: 14 }}>AI Insights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {insights.map((ins, i) => (
              <div key={i} style={{
                background: '#111111', borderRadius: 10, padding: '14px 16px',
                border: '1px solid #222222',
                borderLeft: `2px solid ${SEV_COLOR[ins.severity] || '#c17f59'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#f0ede8' }}>{ins.title}</span>
                  <span style={{
                    fontSize: 10, color: SEV_COLOR[ins.severity],
                    background: (SEV_COLOR[ins.severity] || '#c17f59') + '18',
                    padding: '2px 8px', borderRadius: 4, fontWeight: 600, letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}>{ins.severity}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: '#9e9894', lineHeight: 1.6 }}>{ins.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
