import { useState, useEffect, useRef } from 'react';
import { transactionsApi, categoriesApi, receiptsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','SGD','AED','SAR','HKD','NZD','SEK','NOK','DKK','MXN','BRL','ZAR'];
const CURRENCY_SYMBOLS = { INR:'₹', USD:'$', EUR:'€', GBP:'£', JPY:'¥', CAD:'CA$', AUD:'A$', CHF:'₣', CNY:'¥', SGD:'S$', AED:'AED', SAR:'SAR', HKD:'HK$', NZD:'NZ$', SEK:'kr', NOK:'kr', DKK:'kr', MXN:'$', BRL:'R$', ZAR:'R' };
const ZERO_DECIMAL = new Set(['JPY','KRW','VND','IDR','HUF','CLP','TWD']);
const fromSmallest = (amount, currency) => ZERO_DECIMAL.has(currency) ? parseInt(amount || 0) : parseFloat(amount || 0) / 100;

const EMPTY_FORM = { type: 'expense', amount: '', currency: 'INR', description: '', category_id: '', transaction_date: new Date().toISOString().split('T')[0], notes: '', tags: '' };

const F = "'Inter', system-ui, sans-serif";

const S = {
  page:  { padding: 24, fontFamily: F, color: '#f0ede8' },
  card:  { background: '#1c1c1c', borderRadius: 14, padding: 20, marginBottom: 14, border: '1px solid #262626' },
  input: { width: '100%', background: '#111111', border: '1px solid #333333', color: '#f0ede8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: F, transition: 'border-color 0.15s' },
  label: { fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block', fontWeight: 500 },
  typePill: (active, isIncome) => ({
    flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${active ? (isIncome ? '#6db48e' : '#c4645c') : '#333333'}`,
    background: active ? (isIncome ? 'rgba(109,180,142,0.12)' : 'rgba(196,100,92,0.12)') : 'transparent',
    color: active ? (isIncome ? '#6db48e' : '#c4645c') : '#6a6460',
    fontWeight: 600, fontSize: 13, textTransform: 'capitalize', transition: 'all 0.15s',
  }),
};

function TransactionModal({ tx, categories, baseCurrency, onClose, onSaved }) {
  const [form, setForm]     = useState(tx
    ? { ...tx, tags: (tx.tags || []).join(', '), amount: String(fromSmallest(tx.amount, tx.currency)) }
    : { ...EMPTY_FORM, currency: baseCurrency || 'INR' });
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef               = useRef();

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const payload = { ...form, amount: parseFloat(form.amount), tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [] };
      if (!payload.category_id) delete payload.category_id;
      const saved = tx
        ? (await transactionsApi.update(tx.id, payload)).data.data.transaction
        : (await transactionsApi.create(payload)).data.data.transaction;
      if (receipt) await receiptsApi.upload(receipt, saved.id).catch(() => {});
      onSaved(saved, !tx);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save transaction.');
    } finally { setLoading(false); }
  };

  const filteredCats = categories.filter((c) => c.type === form.type || !c.type);
  const focusBorder  = (e) => { e.target.style.borderColor = '#c17f59'; };
  const blurBorder   = (e) => { e.target.style.borderColor = '#333333'; };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 18, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0ede8', letterSpacing: '-0.02em' }}>{tx ? 'Edit Transaction' : 'Add Transaction'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 20, cursor: 'pointer', lineHeight: 1, display: 'flex', padding: 2 }}>&times;</button>
        </div>

        {error && (
          <div style={{ background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72', marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={save}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['expense', 'income'].map((t) => (
              <button key={t} type="button"
                onClick={() => setForm((p) => ({ ...p, type: t, category_id: '' }))}
                style={S.typePill(form.type === t, t === 'income')}
              >{t}</button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Amount *</label>
              <input style={S.input} type="number" step="0.01" min="0.01" placeholder="0.00"
                value={form.amount} onChange={set('amount')} required
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
            <div>
              <label style={S.label}>Currency</label>
              <select style={{ ...S.input, cursor: 'pointer' }} value={form.currency} onChange={set('currency')}
                onFocus={focusBorder} onBlur={blurBorder}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c} {CURRENCY_SYMBOLS[c] || ''}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Description *</label>
            <input style={S.input} type="text" placeholder="e.g. Grocery shopping"
              value={form.description} onChange={set('description')} required
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={S.label}>Category</label>
              <select style={{ ...S.input, cursor: 'pointer' }} value={form.category_id} onChange={set('category_id')}
                onFocus={focusBorder} onBlur={blurBorder}>
                <option value="">Uncategorized</option>
                {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Date *</label>
              <input style={S.input} type="date" value={form.transaction_date} onChange={set('transaction_date')} required
                onFocus={focusBorder} onBlur={blurBorder} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={S.label}>Notes (optional)</label>
            <textarea style={{ ...S.input, resize: 'vertical', minHeight: 56 }}
              placeholder="Any additional notes…" value={form.notes} onChange={set('notes')}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={S.label}>Tags (comma-separated)</label>
            <input style={S.input} type="text" placeholder="food, monthly, shared"
              value={form.tags} onChange={set('tags')}
              onFocus={focusBorder} onBlur={blurBorder} />
          </div>

          <div style={{ marginBottom: 22 }}>
            <label style={S.label}>Receipt (optional)</label>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }} onChange={(e) => setReceipt(e.target.files[0] || null)} />
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button type="button" onClick={() => fileRef.current.click()} style={{
                background: '#222222', border: '1px solid #333333', color: '#9e9894',
                borderRadius: 8, padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                transition: 'border-color 0.15s',
              }}>
                {receipt ? receipt.name : 'Attach receipt'}
              </button>
              {receipt && (
                <button type="button" onClick={() => setReceipt(null)}
                  style={{ background: 'none', border: 'none', color: '#6a6460', cursor: 'pointer', fontSize: 12 }}>
                  Remove
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: '#6a6460', marginTop: 5 }}>JPG, PNG, WebP or PDF · max 5MB</div>
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none', fontWeight: 600,
            fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            background: loading ? '#252525' : '#c17f59', color: loading ? '#6a6460' : '#fff',
            fontFamily: F, transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#d4916a'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#c17f59'; }}
          >
            {loading ? 'Saving…' : tx ? 'Save Changes' : 'Add Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user }      = useAuth();
  const [txs, setTxs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [filters, setFilters]       = useState({ type: '', search: '', currency: '' });
  const [cursor, setCursor]         = useState(null);
  const [hasMore, setHasMore]       = useState(false);
  const [deleting, setDeleting]     = useState(null);

  const load = async (reset = true) => {
    setLoading(true);
    try {
      const params = { limit: 20 };
      if (filters.type)     params.type     = filters.type;
      if (filters.search)   params.search   = filters.search;
      if (filters.currency) params.currency = filters.currency;
      if (!reset && cursor) params.cursor   = cursor;
      const { data } = await transactionsApi.list(params);
      const newTxs = Array.isArray(data.data) ? data.data : [];
      setTxs(reset ? newTxs : (p) => [...p, ...newTxs]);
      setCursor(data.meta?.next_cursor || null);
      setHasMore(!!(data.meta?.next_cursor));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(true); }, [filters]);
  useEffect(() => {
    categoriesApi.list().then(({ data }) => setCategories(data.data.categories || [])).catch(() => {});
  }, []);

  const onSaved = (saved, isNew) => {
    setModal(null);
    if (isNew) setTxs((p) => [saved, ...p]);
    else setTxs((p) => p.map((t) => t.id === saved.id ? saved : t));
  };

  const handleDelete = async (tx) => {
    if (!confirm(`Delete "${tx.description}"?`)) return;
    setDeleting(tx.id);
    try {
      await transactionsApi.delete(tx.id);
      setTxs((p) => p.filter((t) => t.id !== tx.id));
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  const sym    = (c) => CURRENCY_SYMBOLS[c] || c;
  const fmtAmt = (amount, currency) => fromSmallest(amount, currency).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Transactions</h1>
            <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Track your income and expenses</p>
          </div>
          <button onClick={() => setModal('create')} style={{
            background: '#c17f59', border: 'none', color: '#fff',
            borderRadius: 10, padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: F,
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
          >+ Add Transaction</button>
        </div>

        {/* Filters */}
        <div style={{ ...S.card, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', padding: '14px 16px' }}>
          <input
            style={{ ...S.input, maxWidth: 220, padding: '8px 14px' }}
            type="text" placeholder="Search transactions…"
            value={filters.search}
            onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            onFocus={(e) => e.target.style.borderColor = '#c17f59'}
            onBlur={(e) => e.target.style.borderColor = '#333333'}
          />
          <select
            style={{ ...S.input, maxWidth: 140, padding: '8px 14px', cursor: 'pointer' }}
            value={filters.type}
            onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            onFocus={(e) => e.target.style.borderColor = '#c17f59'}
            onBlur={(e) => e.target.style.borderColor = '#333333'}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            style={{ ...S.input, maxWidth: 130, padding: '8px 14px', cursor: 'pointer' }}
            value={filters.currency}
            onChange={(e) => setFilters((p) => ({ ...p, currency: e.target.value }))}
            onFocus={(e) => e.target.style.borderColor = '#c17f59'}
            onBlur={(e) => e.target.style.borderColor = '#333333'}
          >
            <option value="">All currencies</option>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Table */}
        <div style={S.card}>
          {loading && txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6a6460' }}>Loading transactions…</div>
          ) : txs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56 }}>
              <div style={{ fontSize: 13, color: '#6a6460', marginBottom: 16 }}>No transactions yet</div>
              <button onClick={() => setModal('create')} style={{
                background: '#c17f59', border: 'none', color: '#fff', borderRadius: 10,
                padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}>Add your first transaction</button>
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #262626' }}>
                      {['Date', 'Description', 'Category', 'Amount', 'Currency', 'Type', ''].map((h) => (
                        <th key={h} style={{
                          padding: '10px 12px', textAlign: h === 'Amount' || h === '' ? 'right' : 'left',
                          color: '#6a6460', fontWeight: 500, fontSize: 11, letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map((tx) => {
                      const cat = catMap[tx.category_id];
                      return (
                        <tr key={tx.id}
                          style={{ borderBottom: '1px solid #1e1e1e', transition: 'background 0.1s' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#1e1e1e'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ padding: '11px 12px', color: '#6a6460', whiteSpace: 'nowrap' }}>{tx.transaction_date}</td>
                          <td style={{ padding: '11px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {tx.description}
                          </td>
                          <td style={{ padding: '11px 12px', color: '#9e9894' }}>{cat ? cat.name : '—'}</td>
                          <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? '#6db48e' : '#c4645c' }}>
                            {tx.type === 'income' ? '+' : '−'}{sym(tx.currency)}{fmtAmt(tx.amount, tx.currency)}
                          </td>
                          <td style={{ padding: '11px 12px' }}>
                            <span style={{ background: '#222222', color: '#9e9894', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
                              {tx.currency || 'INR'}
                            </span>
                          </td>
                          <td style={{ padding: '11px 12px' }}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                              background: tx.type === 'income' ? 'rgba(109,180,142,0.12)' : 'rgba(196,100,92,0.12)',
                              color: tx.type === 'income' ? '#6db48e' : '#c4645c',
                              textTransform: 'capitalize',
                            }}>{tx.type}</span>
                          </td>
                          <td style={{ padding: '11px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button onClick={() => setModal(tx)} style={{
                              background: 'none', border: 'none', color: '#9e9894', cursor: 'pointer',
                              fontSize: 12, fontWeight: 500, marginRight: 12, fontFamily: F, padding: 0,
                              transition: 'color 0.15s',
                            }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#c17f59'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
                            >Edit</button>
                            <button onClick={() => handleDelete(tx)} disabled={deleting === tx.id} style={{
                              background: 'none', border: 'none', fontSize: 12, fontWeight: 500,
                              color: deleting === tx.id ? '#6a6460' : '#9e9894', cursor: 'pointer', fontFamily: F, padding: 0,
                              transition: 'color 0.15s',
                            }}
                              onMouseEnter={(e) => { if (deleting !== tx.id) e.currentTarget.style.color = '#c4645c'; }}
                              onMouseLeave={(e) => { if (deleting !== tx.id) e.currentTarget.style.color = '#9e9894'; }}
                            >
                              {deleting === tx.id ? '…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {hasMore && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <button onClick={() => load(false)} disabled={loading} style={{
                    background: '#222222', border: '1px solid #333333', color: '#9e9894', borderRadius: 8,
                    padding: '8px 24px', fontSize: 13, cursor: 'pointer', fontFamily: F,
                  }}>
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {modal && (
        <TransactionModal
          tx={modal === 'create' ? null : modal}
          categories={categories}
          baseCurrency={user?.base_currency}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
