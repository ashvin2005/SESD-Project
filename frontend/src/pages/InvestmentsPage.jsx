import { useState, useEffect, useCallback } from 'react';
import { investmentsApi } from '../services/api';

const TYPES = ['stock', 'mutual_fund', 'crypto'];
const TYPE_LABEL = { stock: 'Stock', mutual_fund: 'Mutual Fund', crypto: 'Crypto' };

const fmt = (n, d = 0) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d }).format(n || 0);
const money = (n) => `₹${fmt(n)}`;
const plColor = (v) => (v > 0 ? '#5ba882' : v < 0 ? '#c4645c' : '#9e9894');

const EMPTY_FORM = {
  type: 'stock', name: '', symbol: '', quantity: '', buy_price: '',
  current_price: '', currency: 'INR', investment_date: new Date().toISOString().split('T')[0], notes: '',
};

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #262626', borderRadius: 14, padding: '18px 22px', flex: 1 }}>
      <div style={{ fontSize: 12, color: '#6a6460', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || '#f0ede8' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#9e9894', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a1a', border: '1px solid #333', borderRadius: 16,
        padding: '24px 28px', width: 480, maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto',
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#f0ede8' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6460', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#9e9894', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', background: '#111', border: '1px solid #333', borderRadius: 8,
  padding: '8px 12px', color: '#f0ede8', fontSize: 13, boxSizing: 'border-box', outline: 'none',
};

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [newPrice, setNewPrice] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await investmentsApi.list();
      setInvestments(data.data.investments || []);
      setSummary(data.data.summary || null);
    } catch {
      setError('Failed to load investments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        type: form.type, name: form.name, symbol: form.symbol || undefined,
        quantity: parseFloat(form.quantity), buy_price: parseFloat(form.buy_price),
        current_price: form.current_price ? parseFloat(form.current_price) : undefined,
        currency: form.currency, investment_date: form.investment_date,
        notes: form.notes || undefined,
      };
      await investmentsApi.create(payload);
      setShowAdd(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      alert(err.response?.data?.error?.message || 'Failed to add investment.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePrice = async (id) => {
    if (!newPrice) return;
    try {
      await investmentsApi.update(id, { current_price: parseFloat(newPrice) });
      setEditingPrice(null);
      setNewPrice('');
      load();
    } catch {
      alert('Failed to update price.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await investmentsApi.delete(id);
      setDeleteId(null);
      load();
    } catch {
      alert('Failed to delete investment.');
    }
  };

  const plPct = summary
    ? `${summary.profit_loss >= 0 ? '+' : ''}${Number(summary.profit_loss_pct || 0).toFixed(2)}%`
    : null;

  return (
    <div style={{ padding: '28px 28px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#f0ede8' }}>Investments</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6a6460' }}>Track your portfolio — stocks, mutual funds, crypto</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{
            background: '#c17f59', border: 'none', borderRadius: 9, color: '#fff',
            padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Add Investment</button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <SummaryCard label="Total Invested" value={money(summary.total_invested)} />
          <SummaryCard label="Current Value" value={money(summary.current_value)} />
          <SummaryCard
            label="Total P&amp;L"
            value={`${summary.profit_loss >= 0 ? '+' : ''}${money(summary.profit_loss)}`}
            sub={plPct}
            color={plColor(summary.profit_loss)}
          />
          <SummaryCard label="Holdings" value={investments.length} sub="active positions" />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(196,100,92,0.1)', border: '1px solid #c4645c', borderRadius: 10, padding: '12px 16px', color: '#c4645c', fontSize: 13, marginBottom: 18 }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#161616', border: '1px solid #222', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6a6460', fontSize: 13 }}>Loading…</div>
        ) : investments.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#6a6460', fontSize: 14 }}>
            No investments yet. Click <strong style={{ color: '#c17f59' }}>+ Add Investment</strong> to get started.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Name', 'Type', 'Symbol', 'Qty', 'Buy Price', 'Current Price', 'Invested', 'Current Value', 'P&L', 'P&L %', ''].map((h) => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#6a6460', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {investments.map((inv, i) => (
                  <tr key={inv.id} style={{ borderBottom: i < investments.length - 1 ? '1px solid #1e1e1e' : 'none' }}>
                    <td style={{ padding: '12px 14px', color: '#f0ede8', fontWeight: 500 }}>{inv.name}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                        background: inv.type === 'crypto' ? 'rgba(193,127,89,0.15)' : inv.type === 'stock' ? 'rgba(91,168,130,0.15)' : 'rgba(106,143,181,0.15)',
                        color: inv.type === 'crypto' ? '#c17f59' : inv.type === 'stock' ? '#5ba882' : '#6a8fb5',
                      }}>{TYPE_LABEL[inv.type] || inv.type}</span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9e9894' }}>{inv.symbol || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#9e9894' }}>{inv.quantity}</td>
                    <td style={{ padding: '12px 14px', color: '#9e9894' }}>₹{fmt(inv.buy_price, 2)}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {editingPrice === inv.id ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                            style={{ ...inputStyle, width: 90, padding: '4px 8px' }}
                            autoFocus
                          />
                          <button onClick={() => handleUpdatePrice(inv.id)} style={{ background: '#c17f59', border: 'none', borderRadius: 6, color: '#fff', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✓</button>
                          <button onClick={() => { setEditingPrice(null); setNewPrice(''); }} style={{ background: '#262626', border: 'none', borderRadius: 6, color: '#9e9894', padding: '4px 8px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        <span
                          style={{ color: '#9e9894', cursor: 'pointer', borderBottom: '1px dashed #333' }}
                          title="Click to update price"
                          onClick={() => { setEditingPrice(inv.id); setNewPrice(inv.current_price || ''); }}
                        >
                          {inv.current_price ? `₹${fmt(inv.current_price, 2)}` : <span style={{ color: '#444', fontSize: 11 }}>Set price</span>}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#9e9894' }}>{money(inv.total_invested)}</td>
                    <td style={{ padding: '12px 14px', color: '#9e9894' }}>{money(inv.current_value)}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: plColor(inv.profit_loss) }}>
                      {inv.profit_loss >= 0 ? '+' : ''}{money(inv.profit_loss)}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: plColor(inv.profit_loss_pct) }}>
                      {inv.profit_loss_pct >= 0 ? '+' : ''}{Number(inv.profit_loss_pct || 0).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        style={{ background: 'none', border: '1px solid #333', borderRadius: 6, color: '#c4645c', padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(196,100,92,0.1)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                      >Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Investment" onClose={() => { setShowAdd(false); setForm(EMPTY_FORM); }}>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Type *">
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ ...inputStyle }}>
                  {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
                </select>
              </Field>
              <Field label="Currency">
                <input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} style={inputStyle} placeholder="INR" />
              </Field>
            </div>
            <Field label="Name *">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} placeholder="e.g. Reliance Industries" />
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <Field label="Symbol">
                <input value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} style={inputStyle} placeholder="e.g. RELIANCE" />
              </Field>
              <Field label="Quantity *">
                <input required type="number" step="any" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} style={inputStyle} placeholder="10" />
              </Field>
              <Field label="Buy Price *">
                <input required type="number" step="any" min="0" value={form.buy_price} onChange={(e) => setForm({ ...form, buy_price: e.target.value })} style={inputStyle} placeholder="2500" />
              </Field>
              <Field label="Current Price">
                <input type="number" step="any" min="0" value={form.current_price} onChange={(e) => setForm({ ...form, current_price: e.target.value })} style={inputStyle} placeholder="Optional" />
              </Field>
              <Field label="Investment Date *">
                <input required type="date" value={form.investment_date} onChange={(e) => setForm({ ...form, investment_date: e.target.value })} style={inputStyle} />
              </Field>
            </div>
            <Field label="Notes">
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={inputStyle} placeholder="Optional notes" />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => { setShowAdd(false); setForm(EMPTY_FORM); }} style={{ background: '#262626', border: '1px solid #333', borderRadius: 8, color: '#9e9894', padding: '8px 18px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
              <button type="submit" disabled={saving} style={{ background: '#c17f59', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Add Investment'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Delete Investment" onClose={() => setDeleteId(null)}>
          <p style={{ color: '#9e9894', fontSize: 13, marginTop: 0 }}>Are you sure you want to delete this investment? This cannot be undone.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => setDeleteId(null)} style={{ background: '#262626', border: '1px solid #333', borderRadius: 8, color: '#9e9894', padding: '8px 18px', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
            <button onClick={() => handleDelete(deleteId)} style={{ background: '#c4645c', border: 'none', borderRadius: 8, color: '#fff', padding: '8px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
