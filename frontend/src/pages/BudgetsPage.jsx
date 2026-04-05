import { useState, useEffect } from 'react';
import { budgetsApi, categoriesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','SGD','AED','SAR','HKD','NZD','SEK','NOK','DKK','MXN','BRL','ZAR'];
const PERIODS    = ['monthly','weekly','yearly'];
const F          = "'Inter', system-ui, sans-serif";

const S = {
  page:  { padding: 24, fontFamily: F, color: '#f0ede8' },
  input: { width: '100%', background: '#111111', border: '1px solid #333333', color: '#f0ede8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: F, transition: 'border-color 0.15s' },
  label: { fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block', fontWeight: 500 },
};

function progressColor(pct) {
  if (pct >= 100) return '#c4645c';
  if (pct >= 80)  return '#c49a4a';
  return '#6db48e';
}

function BudgetModal({ budget, categories, baseCurrency, onClose, onSaved }) {
  const isEdit = !!budget;
  const [form, setForm] = useState(isEdit
    ? { amount: String(budget.limit || ''), currency: budget.currency || baseCurrency || 'INR', period: budget.period, category_id: budget.category_id || '', alert_threshold: budget.alert_threshold || 80, start_date: budget.start_date || '' }
    : { amount: '', currency: baseCurrency || 'INR', period: 'monthly', category_id: '', alert_threshold: 80, start_date: new Date().toISOString().split('T')[0] }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount), alert_threshold: parseInt(form.alert_threshold) };
      if (!payload.category_id) delete payload.category_id;
      if (!payload.start_date) delete payload.start_date;
      const saved = isEdit
        ? (await budgetsApi.update(budget.id, payload)).data.data.budget
        : (await budgetsApi.create(payload)).data.data.budget;
      onSaved(saved, !isEdit);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save budget.');
    } finally { setLoading(false); }
  };

  const expenseCats = categories.filter((c) => c.type === 'expense' && c.is_active);
  const fb = (e) => { e.target.style.borderColor = '#c17f59'; };
  const bb = (e) => { e.target.style.borderColor = '#333333'; };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{isEdit ? 'Edit Budget' : 'New Budget'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>
        {error && (
          <div style={{ background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72', marginBottom: 14 }}>{error}</div>
        )}
        <form onSubmit={save}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Limit amount *</label>
              <input style={S.input} type="number" step="0.01" min="1" placeholder="5000"
                value={form.amount} onChange={set('amount')} required onFocus={fb} onBlur={bb} />
            </div>
            <div>
              <label style={S.label}>Currency</label>
              <select style={{ ...S.input, cursor: 'pointer' }} value={form.currency} onChange={set('currency')} onFocus={fb} onBlur={bb}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {!isEdit && (
            <div style={{ marginBottom: 12 }}>
              <label style={S.label}>Period</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PERIODS.map((p) => (
                  <button key={p} type="button" onClick={() => setForm((f) => ({ ...f, period: p }))} style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    border: `1px solid ${form.period === p ? '#c17f59' : '#333333'}`,
                    background: form.period === p ? 'rgba(193,127,89,0.12)' : 'transparent',
                    color: form.period === p ? '#c17f59' : '#6a6460',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer', textTransform: 'capitalize', fontFamily: F,
                    transition: 'all 0.15s',
                  }}>{p}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Category (leave empty for overall spending)</label>
            <select style={{ ...S.input, cursor: 'pointer' }} value={form.category_id} onChange={set('category_id')} disabled={isEdit} onFocus={fb} onBlur={bb}>
              <option value="">Overall spending</option>
              {expenseCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Alert threshold: {form.alert_threshold}%</label>
            <input type="range" min="50" max="100" step="5" value={form.alert_threshold} onChange={set('alert_threshold')} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6a6460', marginTop: 4 }}>
              <span>50%</span><span style={{ color: '#9e9894' }}>Alert at {form.alert_threshold}%</span><span>100%</span>
            </div>
          </div>

          {!isEdit && (
            <div style={{ marginBottom: 22 }}>
              <label style={S.label}>Start date</label>
              <input style={S.input} type="date" value={form.start_date} onChange={set('start_date')} onFocus={fb} onBlur={bb} />
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none', fontWeight: 600,
            fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F,
            background: loading ? '#252525' : '#c17f59', color: loading ? '#6a6460' : '#fff',
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#d4916a'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#c17f59'; }}
          >{loading ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Budget'}</button>
        </form>
      </div>
    </div>
  );
}

function BudgetCard({ b, onEdit, onDeactivate, onDelete }) {
  const pct      = b.percentage || 0;
  const color    = progressColor(pct);
  const catLabel = b.category_name || 'Overall Spending';
  const borderAccent = pct >= 100 ? 'rgba(196,100,92,0.30)' : pct >= 80 ? 'rgba(196,154,74,0.30)' : '#262626';

  return (
    <div style={{ background: '#1c1c1c', borderRadius: 14, padding: '18px 20px', border: `1px solid ${borderAccent}`, transition: 'border-color 0.2s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#f0ede8' }}>{catLabel}</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{
              background: '#222222', color: '#9e9894', borderRadius: 5, padding: '2px 8px',
              fontSize: 11, fontWeight: 500, textTransform: 'capitalize',
            }}>{b.period}</span>
            {!b.is_active && (
              <span style={{ background: 'rgba(196,100,92,0.12)', color: '#c4645c', borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 500 }}>Inactive</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{pct}%</div>
          <div style={{ fontSize: 10, color: '#6a6460', marginTop: 2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>used</div>
        </div>
      </div>

      <div style={{ height: 4, background: '#222222', borderRadius: 2, marginBottom: 12, overflow: 'hidden' }}>
        <div style={{ height: 4, background: color, borderRadius: 2, width: `${Math.min(pct, 100)}%`, transition: 'width 0.6s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9e9894', marginBottom: b.period_start ? 10 : 14 }}>
        <span>Spent <strong style={{ color: '#f0ede8' }}>₹{parseFloat(b.spent || 0).toLocaleString()}</strong></span>
        <span>Left <strong style={{ color: pct >= 100 ? '#c4645c' : '#6db48e' }}>₹{parseFloat(b.remaining || 0).toLocaleString()}</strong></span>
        <span>Limit <strong style={{ color: '#f0ede8' }}>₹{parseFloat(b.limit || 0).toLocaleString()}</strong></span>
      </div>

      {b.period_start && (
        <div style={{ fontSize: 11, color: '#6a6460', marginBottom: 12 }}>
          {b.period_start} — {b.period_end}
        </div>
      )}

      {b.is_active && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onEdit(b)} style={{
            flex: 1, padding: '7px', borderRadius: 8, background: '#222222',
            border: '1px solid #333333', color: '#9e9894', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F,
            transition: 'color 0.15s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
          >Edit</button>
          <button onClick={() => onDeactivate(b)} style={{
            flex: 1, padding: '7px', borderRadius: 8, background: 'rgba(196,154,74,0.08)',
            border: '1px solid rgba(196,154,74,0.25)', color: '#c49a4a', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F,
          }}>Pause</button>
          <button onClick={() => onDelete(b)} style={{
            flex: 1, padding: '7px', borderRadius: 8, background: 'rgba(196,100,92,0.08)',
            border: '1px solid rgba(196,100,92,0.25)', color: '#c4645c', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: F,
          }}>Delete</button>
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const { user }    = useAuth();
  const [budgets, setBudgets]         = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(null);
  const [periodFilter, setPeriodFilter] = useState('all');
  const [showInactive, setShowInactive] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([budgetsApi.summary(), categoriesApi.list()])
      .then(([b, c]) => {
        setBudgets(b.data.data.budgets || []);
        setCategories(c.data.data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSaved = () => { setModal(null); load(); };

  const handleDeactivate = async (b) => {
    if (!confirm(`Deactivate "${b.category_name || 'Overall'}" ${b.period} budget?`)) return;
    try {
      await budgetsApi.deactivate(b.id);
      setBudgets((p) => p.map((x) => x.id === b.id ? { ...x, is_active: false } : x));
    } catch (e) { alert(e.response?.data?.error?.message || 'Failed.'); }
  };

  const handleDelete = async (b) => {
    if (!confirm('Permanently delete this budget?')) return;
    try {
      await budgetsApi.delete(b.id);
      setBudgets((p) => p.filter((x) => x.id !== b.id));
    } catch (e) { alert(e.response?.data?.error?.message || 'Failed.'); }
  };

  const filtered = budgets.filter((b) => {
    if (!showInactive && !b.is_active) return false;
    if (periodFilter !== 'all' && b.period !== periodFilter) return false;
    return true;
  });

  const active          = filtered.filter((b) => b.is_active);
  const totalLimit      = active.reduce((s, b) => s + parseFloat(b.limit || 0), 0);
  const totalSpent      = active.reduce((s, b) => s + parseFloat(b.spent || 0), 0);
  const overBudgetCount = active.filter((b) => (b.percentage || 0) >= 100).length;

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Budgets</h1>
            <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Set spending limits and track progress</p>
          </div>
          <button onClick={() => setModal('create')} style={{
            background: '#c17f59', border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: F, transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
          >+ New Budget</button>
        </div>

        {/* Summary stats */}
        {active.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Active Budgets',  value: active.length, color: '#c17f59' },
              { label: 'Total Limit',     value: `₹${totalLimit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#6a8fb5' },
              { label: 'Total Spent',     value: `₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#c49a4a' },
              { label: 'Over Budget',     value: overBudgetCount, color: overBudgetCount > 0 ? '#c4645c' : '#6db48e' },
            ].map((s) => (
              <div key={s.label} style={{ background: '#1c1c1c', borderRadius: 12, padding: '14px 16px', border: '1px solid #262626' }}>
                <div style={{ fontSize: 10, color: '#6a6460', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Period filter */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', ...PERIODS].map((p) => (
            <button key={p} onClick={() => setPeriodFilter(p)} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid',
              borderColor: periodFilter === p ? '#c17f59' : '#262626',
              background: periodFilter === p ? 'rgba(193,127,89,0.12)' : 'transparent',
              color: periodFilter === p ? '#c17f59' : '#6a6460',
              fontSize: 12, fontWeight: 500, cursor: 'pointer', textTransform: 'capitalize', fontFamily: F,
              transition: 'all 0.15s',
            }}>{p === 'all' ? 'All' : p}</button>
          ))}
          <label style={{ fontSize: 12, color: '#6a6460', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto', fontFamily: F }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6a6460' }}>Loading budgets…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: 64, textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{ fontSize: 13, color: '#6a6460', marginBottom: 16 }}>No budgets yet</div>
            <p style={{ color: '#6a6460', fontSize: 13, marginBottom: 20 }}>Set spending limits to stay on track.</p>
            <button onClick={() => setModal('create')} style={{
              background: '#c17f59', border: 'none', color: '#fff', borderRadius: 10,
              padding: '9px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: F,
            }}>Create First Budget</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px,1fr))', gap: 14 }}>
            {filtered.map((b) => (
              <BudgetCard key={b.id} b={b} onEdit={(b) => setModal(b)} onDeactivate={handleDeactivate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <BudgetModal
          budget={modal === 'create' ? null : modal}
          categories={categories}
          baseCurrency={user?.base_currency}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
