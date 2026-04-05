import { useState, useEffect } from 'react';
import { reportsApi } from '../services/api';
import { BarChart, DonutChart, LineChart } from '../components/Charts';

const MONTH_OPTIONS = [3, 6, 12];
const F = "'Inter', system-ui, sans-serif";

function dateRange(months) {
  const now = new Date();
  const to  = now.toISOString().split('T')[0];
  const from = new Date(now.getFullYear(), now.getMonth() - months + 1, 1).toISOString().split('T')[0];
  return { from, to };
}

export default function ReportsPage() {
  const [months, setMonths]               = useState(6);
  const [catType, setCatType]             = useState('expense');
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [savingsTrend, setSavingsTrend]   = useState([]);
  const [loading, setLoading]             = useState(true);
  const [exporting, setExporting]         = useState(false);

  const load = () => {
    setLoading(true);
    const { from, to } = dateRange(months);
    Promise.all([
      reportsApi.monthlySummary({ months }),
      reportsApi.categoryBreakdown({ date_from: from, date_to: to, type: catType }),
      reportsApi.savingsTrend({ months }),
    ])
      .then(([ms, cb, st]) => {
        setMonthlySummary(ms.data.data.summary || []);
        setCategoryBreakdown(cb.data.data.breakdown || []);
        setSavingsTrend(st.data.data.trend || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [months, catType]);

  const handleExport = async () => {
    const { from, to } = dateRange(months);
    setExporting(true);
    try {
      const resp = await reportsApi.export({ date_from: from, date_to: to, format: 'csv' });
      const url = URL.createObjectURL(new Blob([resp.data], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = `transactions-${from}-${to}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    finally { setExporting(false); }
  };

  const barData    = monthlySummary.map((r) => ({ label: r.label, income: r.income, expense: r.expense }));
  const donutData  = categoryBreakdown.map((c) => ({ label: c.category_name, value: c.total_amount, color: c.color || '#c17f59' }));
  const lineData   = savingsTrend.map((r) => ({ label: r.label, value: r.savings_rate }));

  const totalIncome  = monthlySummary.reduce((s, r) => s + r.income, 0);
  const totalExpense = monthlySummary.reduce((s, r) => s + r.expense, 0);
  const avgSavings   = savingsTrend.length ? Math.round(savingsTrend.reduce((s, r) => s + r.savings_rate, 0) / savingsTrend.length) : 0;
  const fmt          = (n) => `₹${parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <div style={{ padding: 24, fontFamily: F, color: '#f0ede8', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Reports</h1>
          <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Analyse your financial patterns</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 2, background: '#1c1c1c', border: '1px solid #262626', borderRadius: 10, padding: 3 }}>
            {MONTH_OPTIONS.map((m) => (
              <button key={m} onClick={() => setMonths(m)} style={{
                padding: '5px 14px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: F, transition: 'all 0.15s',
                background: months === m ? '#c17f59' : 'transparent',
                color: months === m ? '#fff' : '#6a6460',
              }}>{m}M</button>
            ))}
          </div>
          <button onClick={handleExport} disabled={exporting} style={{
            background: '#222222', border: '1px solid #333333', color: exporting ? '#6a6460' : '#9e9894',
            borderRadius: 10, padding: '7px 16px', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F,
            transition: 'color 0.15s',
          }}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 64, color: '#6a6460' }}>Loading reports…</div>
      ) : (
        <>
          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 10, marginBottom: 18 }}>
            {[
              { label: `Income (${months}mo)`,   value: fmt(totalIncome),               color: '#6db48e' },
              { label: `Expenses (${months}mo)`, value: fmt(totalExpense),              color: '#c4645c' },
              { label: 'Net Savings',             value: fmt(totalIncome - totalExpense), color: totalIncome >= totalExpense ? '#c17f59' : '#c4645c' },
              { label: 'Avg Savings Rate',        value: `${avgSavings}%`,              color: avgSavings >= 20 ? '#6db48e' : avgSavings >= 0 ? '#c49a4a' : '#c4645c' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#1c1c1c', borderRadius: 12, padding: '14px 16px', border: '1px solid #262626' }}>
                <div style={{ fontSize: 10, color: '#6a6460', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly bar chart */}
          <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '20px 24px', marginBottom: 14, border: '1px solid #262626' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: '#9e9894' }}>Monthly Income vs Expenses</div>
            <BarChart
              data={barData}
              bars={[
                { key: 'income',  color: '#6db48e', label: 'Income' },
                { key: 'expense', color: '#c4645c', label: 'Expense' },
              ]}
              height={240}
            />
          </div>

          {/* Category breakdown + savings line */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '20px 24px', border: '1px solid #262626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9e9894' }}>Category Breakdown</div>
                <div style={{ display: 'flex', gap: 2, background: '#111111', border: '1px solid #262626', borderRadius: 8, padding: 3 }}>
                  {['expense','income'].map((t) => (
                    <button key={t} onClick={() => setCatType(t)} style={{
                      padding: '4px 10px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: F, transition: 'all 0.15s', textTransform: 'capitalize',
                      background: catType === t ? '#c17f59' : 'transparent',
                      color: catType === t ? '#fff' : '#6a6460',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <DonutChart data={donutData} />
              {categoryBreakdown.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {categoryBreakdown.slice(0, 6).map((c) => (
                    <div key={c.category_id || c.category_name} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 0', borderBottom: '1px solid #1e1e1e',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color || '#c17f59' }} />
                        <span style={{ fontSize: 12, color: '#9e9894' }}>{c.category_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#f0ede8' }}>{fmt(c.total_amount)}</div>
                        <div style={{ fontSize: 10, color: '#6a6460' }}>{c.percentage}% · {c.transaction_count} txns</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '20px 24px', border: '1px solid #262626' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 18, color: '#9e9894' }}>Savings Rate Trend</div>
              <LineChart data={lineData} color="#c17f59" unit="%" />
              <div style={{ marginTop: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ color: '#6a6460', borderBottom: '1px solid #262626' }}>
                      <th style={{ textAlign: 'left', padding: '6px 0', fontWeight: 500 }}>Month</th>
                      <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>Income</th>
                      <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>Expense</th>
                      <th style={{ textAlign: 'right', padding: '6px 0', fontWeight: 500 }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummary.slice(-6).reverse().map((r) => (
                      <tr key={r.label} style={{ borderBottom: '1px solid #1e1e1e' }}>
                        <td style={{ padding: '7px 0', color: '#9e9894' }}>{r.label}</td>
                        <td style={{ padding: '7px 0', textAlign: 'right', color: '#6db48e' }}>{fmt(r.income)}</td>
                        <td style={{ padding: '7px 0', textAlign: 'right', color: '#c4645c' }}>{fmt(r.expense)}</td>
                        <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 700, color: r.savings_rate >= 0 ? '#c17f59' : '#c4645c' }}>
                          {r.savings_rate}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
