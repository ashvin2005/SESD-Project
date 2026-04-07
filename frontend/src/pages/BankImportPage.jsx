import { useState, useRef } from 'react';
import { importApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

const S = {
  page: { padding: 24, fontFamily: F, color: '#f0ede8', minHeight: '100vh', background: '#111111' },
  card: { background: '#1c1c1c', borderRadius: 16, padding: '20px 22px', marginBottom: 18, border: '1px solid #262626' },
  btn:  (v) => ({
    padding: '9px 18px', borderRadius: 10, border: 'none', cursor: v ? 'pointer' : 'not-allowed',
    fontWeight: 600, fontSize: 13, fontFamily: F, transition: 'background 0.15s',
    background: v ? '#c17f59' : '#252525',
    color: v ? '#fff' : '#6a6460',
  }),
  badge: (isDup) => ({
    display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
    letterSpacing: '0.03em', textTransform: 'uppercase',
    background: isDup ? 'rgba(196,100,92,0.12)' : 'rgba(109,180,142,0.12)',
    color: isDup ? '#c4645c' : '#6db48e',
  }),
  tag: (type) => ({
    display: 'inline-block', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600,
    textTransform: 'capitalize',
    background: type === 'income' ? 'rgba(109,180,142,0.12)' : 'rgba(196,100,92,0.12)',
    color: type === 'income' ? '#6db48e' : '#c4645c',
  }),
};

function DropZone({ onFile, loading }) {
  const [drag, setDrag] = useState(false);
  const fileRef         = useRef();

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current.click()}
      style={{
        border: `2px dashed ${drag ? '#c17f59' : '#333333'}`,
        borderRadius: 14, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
        background: drag ? 'rgba(193,127,89,0.06)' : 'transparent',
        transition: 'all 0.2s',
      }}
    >
      <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{
        width: 44, height: 44, borderRadius: 12, background: '#222222', border: '1px solid #2a2a2a',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9e9894" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#f0ede8' }}>
        {loading ? 'Analyzing…' : 'Drop your bank statement CSV here'}
      </div>
      <div style={{ color: '#6a6460', fontSize: 13, marginBottom: 8 }}>or click to browse · CSV format · Max 5MB</div>
      <div style={{ fontSize: 11, color: '#504c48' }}>
        Supports HDFC, SBI, ICICI, Axis, Kotak and most Indian bank CSV exports
      </div>
    </div>
  );
}

const STEPS = ['upload', 'preview', 'done'];

export default function BankImportPage() {
  const [step, setStep]       = useState('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [currency, setCurrency] = useState('INR');
  const [result, setResult]   = useState(null);

  const handleFile = async (file) => {
    setError(''); setLoading(true);
    try {
      const { data } = await importApi.preview(file, currency);
      const p = data.data;
      setPreview(p);
      setSelected(new Set(p.transactions.filter((t) => !t.is_duplicate).map((_, i) => i)));
      setStep('preview');
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Failed to parse file. Please check the format.');
    } finally { setLoading(false); }
  };

  const toggleAll = () => {
    const nonDup = preview.transactions.filter((t) => !t.is_duplicate).length;
    if (selected.size === nonDup) setSelected(new Set());
    else setSelected(new Set(preview.transactions.map((_, i) => i).filter((i) => !preview.transactions[i].is_duplicate)));
  };

  const handleImport = async () => {
    setLoading(true); setError('');
    const toImport = preview.transactions.filter((_, i) => selected.has(i));
    try {
      const { data } = await importApi.confirm(toImport, currency);
      setResult(data.data);
      setStep('done');
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Import failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Bank Statement Import</h1>
        <p style={{ color: '#6a6460', fontSize: 13, margin: '0 0 24px' }}>
          Upload a CSV bank statement — transactions are auto-categorized and duplicates detected.
        </p>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, alignItems: 'center' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 11, fontWeight: 700,
                background: step === s ? '#c17f59' : STEPS.indexOf(step) > i ? '#6db48e' : '#222222',
                color: step === s || STEPS.indexOf(step) > i ? '#fff' : '#6a6460',
                border: `1px solid ${step === s ? '#c17f59' : STEPS.indexOf(step) > i ? '#6db48e' : '#333333'}`,
                transition: 'all 0.2s',
              }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: step === s ? '#f0ede8' : '#6a6460', textTransform: 'capitalize', fontWeight: step === s ? 500 : 400 }}>{s}</span>
              {i < 2 && <span style={{ color: '#333333', fontSize: 14, marginLeft: 2 }}>›</span>}
            </div>
          ))}
        </div>

        {error && (
          <div style={{ background: 'rgba(196,100,92,0.10)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c4645c' }}>
            {error}
          </div>
        )}

        {/* Upload */}
        {step === 'upload' && (
          <div style={S.card}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#9e9894', fontWeight: 500 }}>Currency:</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{
                background: '#111111', border: '1px solid #333333', color: '#f0ede8',
                borderRadius: 8, padding: '6px 12px', fontSize: 13, fontFamily: F, outline: 'none',
              }}>
                <option value="INR">INR</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <DropZone onFile={handleFile} loading={loading} />
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && preview && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Total Found', val: preview.total },
                { label: 'Duplicates',  val: preview.duplicates },
                { label: 'Selected',    val: selected.size },
              ].map((s) => (
                <div key={s.label} style={{ ...S.card, textAlign: 'center', padding: '14px 16px', marginBottom: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: '#6a6460', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={S.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#9e9894' }}>Review Transactions</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={toggleAll} style={{
                    background: '#222222', border: '1px solid #333333', color: '#9e9894',
                    borderRadius: 8, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: F,
                  }}>
                    {selected.size === preview.transactions.filter((t) => !t.is_duplicate).length ? 'Deselect All' : 'Select All'}
                  </button>
                  <button onClick={handleImport} disabled={loading || selected.size === 0} style={S.btn(selected.size > 0 && !loading)}>
                    {loading ? 'Importing…' : `Import ${selected.size} Transactions`}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #262626' }}>
                      {['', 'Date', 'Description', 'Amount', 'Type', 'Category', 'Status'].map((h, i) => (
                        <th key={i} style={{
                          padding: '9px 10px', textAlign: i === 3 ? 'right' : 'left',
                          color: '#6a6460', fontWeight: 500, fontSize: 11,
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.transactions.map((tx, i) => (
                      <tr key={i} style={{
                        borderBottom: '1px solid #1e1e1e',
                        opacity: tx.is_duplicate ? 0.45 : 1,
                        background: selected.has(i) ? 'rgba(193,127,89,0.04)' : 'transparent',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={(e) => { if (!tx.is_duplicate) e.currentTarget.style.background = selected.has(i) ? 'rgba(193,127,89,0.06)' : '#1e1e1e'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = selected.has(i) ? 'rgba(193,127,89,0.04)' : 'transparent'; }}
                      >
                        <td style={{ padding: '9px 10px' }}>
                          <input type="checkbox" checked={selected.has(i)} disabled={tx.is_duplicate}
                            onChange={() => {
                              const n = new Set(selected);
                              n.has(i) ? n.delete(i) : n.add(i);
                              setSelected(n);
                            }} />
                        </td>
                        <td style={{ padding: '9px 10px', color: '#9e9894', whiteSpace: 'nowrap' }}>{tx.date}</td>
                        <td style={{ padding: '9px 10px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{tx.description}</td>
                        <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: tx.type === 'income' ? '#6db48e' : '#c4645c' }}>
                          ₹{tx.amount.toLocaleString()}
                        </td>
                        <td style={{ padding: '9px 10px' }}><span style={S.tag(tx.type)}>{tx.type}</span></td>
                        <td style={{ padding: '9px 10px', color: tx.suggested_category ? '#c17f59' : '#6a6460', fontSize: 12 }}>
                          {tx.suggested_category || '—'}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <span style={S.badge(tx.is_duplicate)}>{tx.is_duplicate ? 'Duplicate' : 'New'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Done */}
        {step === 'done' && result && (
          <div style={{ ...S.card, textAlign: 'center', padding: '56px 32px' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(109,180,142,0.12)', border: '1px solid rgba(109,180,142,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6db48e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.02em' }}>Import Complete</h2>
            <p style={{ color: '#9e9894', marginBottom: 24, fontSize: 13 }}>
              <strong style={{ color: '#6db48e' }}>{result.imported}</strong> transactions imported{' '}
              · <strong style={{ color: '#6a6460' }}>{result.skipped}</strong> skipped (duplicates)
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { setStep('upload'); setPreview(null); setResult(null); }}
                style={S.btn(true)}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
              >Import Another File</button>
              <a href="/transactions" style={{ ...S.btn(true), textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
              >View Transactions</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
