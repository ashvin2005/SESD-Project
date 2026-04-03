import { useState, useEffect } from 'react';
import { categoriesApi } from '../services/api';

const COLORS = ['#ef4444','#f97316','#eab308','#84cc16','#10b981','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#ec4899','#f43f5e','#14b8a6','#a855f7','#fb923c','#34d399'];

const F = "'Inter', system-ui, sans-serif";

const S = {
  page:  { padding: 24, fontFamily: F, color: '#f0ede8' },
  card:  { background: '#1c1c1c', borderRadius: 14, padding: 20, border: '1px solid #262626' },
  input: { width: '100%', background: '#111111', border: '1px solid #333333', color: '#f0ede8', borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: F, transition: 'border-color 0.15s' },
  label: { fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block', fontWeight: 500 },
};

const EMPTY_FORM = { name: '', type: 'expense', icon: 'box', color: '#c17f59' };

function CategoryModal({ cat, onClose, onSaved }) {
  const [form, setForm]       = useState(cat ? { name: cat.name, type: cat.type, icon: cat.icon || 'box', color: cat.color || '#c17f59' } : { ...EMPTY_FORM });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === 'object' ? v.target.value : v }));

  const save = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const saved = cat
        ? (await categoriesApi.update(cat.id, form)).data.data.category
        : (await categoriesApi.create(form)).data.data.category;
      onSaved(saved, !cat);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to save category.');
    } finally { setLoading(false); }
  };

  const fb = (e) => { e.target.style.borderColor = '#c17f59'; };
  const bb = (e) => { e.target.style.borderColor = '#333333'; };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 18, padding: 28, width: '100%', maxWidth: 460, fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{cat ? 'Edit Category' : 'New Category'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>
        {error && (
          <div style={{ background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72', marginBottom: 14 }}>{error}</div>
        )}
        <form onSubmit={save}>
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Name *</label>
            <input style={S.input} value={form.name} onChange={set('name')} required placeholder="e.g. Groceries" onFocus={fb} onBlur={bb} />
          </div>
          {!cat && (
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['expense', 'income'].map((t) => (
                  <button key={t} type="button" onClick={() => setForm((p) => ({ ...p, type: t }))} style={{
                    flex: 1, padding: '9px', borderRadius: 8,
                    border: `1px solid ${form.type === t ? (t === 'income' ? '#6db48e' : '#c4645c') : '#333333'}`,
                    background: form.type === t ? (t === 'income' ? 'rgba(109,180,142,0.12)' : 'rgba(196,100,92,0.12)') : 'transparent',
                    color: form.type === t ? (t === 'income' ? '#6db48e' : '#c4645c') : '#6a6460',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                    transition: 'all 0.15s',
                  }}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={S.label}>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm((p) => ({ ...p, color: c }))} style={{
                  width: 26, height: 26, borderRadius: '50%', background: c,
                  border: `2px solid ${form.color === c ? '#f0ede8' : 'transparent'}`,
                  cursor: 'pointer', padding: 0, outline: 'none',
                  boxShadow: form.color === c ? `0 0 0 3px ${c}44` : 'none',
                  transition: 'box-shadow 0.15s',
                }} />
              ))}
            </div>
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: 'none', fontWeight: 600,
            fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: F,
            background: loading ? '#252525' : '#c17f59', color: loading ? '#6a6460' : '#fff',
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#d4916a'; }}
            onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#c17f59'; }}
          >{loading ? 'Saving…' : cat ? 'Save Changes' : 'Create Category'}</button>
        </form>
      </div>
    </div>
  );
}

function MergeModal({ source, allCategories, onClose, onMerged }) {
  const [targetId, setTargetId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const eligible = allCategories.filter((c) => c.id !== source.id && c.type === source.type && c.is_active);

  const doMerge = async () => {
    if (!targetId) return;
    setLoading(true); setError('');
    try {
      await categoriesApi.merge(source.id, targetId);
      onMerged(source.id);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Merge failed.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 18, padding: 28, width: '100%', maxWidth: 420, fontFamily: F }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Merge Category</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 20, cursor: 'pointer' }}>&times;</button>
        </div>
        <p style={{ fontSize: 13, color: '#9e9894', marginBottom: 16, lineHeight: 1.6 }}>
          All transactions in <strong style={{ color: '#f0ede8' }}>{source.name}</strong> will be moved to the target category, then this one will be deactivated.
        </p>
        {error && <div style={{ background: 'rgba(196,100,92,0.12)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72', marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 20 }}>
          <label style={S.label}>Merge into</label>
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}
            style={{ ...S.input, cursor: 'pointer' }}>
            <option value="">Select target category…</option>
            {eligible.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #333333',
            background: 'none', color: '#9e9894', cursor: 'pointer', fontWeight: 500, fontFamily: F,
          }}>Cancel</button>
          <button onClick={doMerge} disabled={!targetId || loading} style={{
            flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontWeight: 600,
            cursor: targetId ? 'pointer' : 'not-allowed', fontFamily: F,
            background: targetId ? '#c4645c' : '#252525', color: targetId ? '#fff' : '#6a6460',
            transition: 'background 0.15s',
          }}>{loading ? 'Merging…' : 'Merge & Deactivate'}</button>
        </div>
      </div>
    </div>
  );
}

function CategoryCard({ cat, onEdit, onDelete, onMerge }) {
  return (
    <div style={{
      background: '#1c1c1c', borderRadius: 12, padding: 16,
      border: '1px solid #262626',
      opacity: cat.is_active ? 1 : 0.5,
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = cat.color || '#c17f59'}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#262626'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: (cat.color || '#c17f59') + '18',
          border: `1px solid ${(cat.color || '#c17f59')}33`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: cat.color || '#c17f59' }} />
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#f0ede8' }}>{cat.name}</div>
          {!cat.is_active && <div style={{ fontSize: 10, color: '#c4645c', marginTop: 1, fontWeight: 500 }}>Inactive</div>}
          {cat.is_default && <div style={{ fontSize: 10, color: '#6a6460', marginTop: 1 }}>Default</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onEdit} style={{
          flex: 1, padding: '6px', borderRadius: 7, background: '#222222',
          border: '1px solid #333333', color: '#9e9894', fontSize: 12, cursor: 'pointer',
          fontWeight: 500, fontFamily: F, transition: 'color 0.15s',
        }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
        >Edit</button>
        {!cat.is_default && cat.is_active && (
          <>
            <button onClick={onMerge} style={{
              flex: 1, padding: '6px', borderRadius: 7, background: '#222222',
              border: '1px solid #333333', color: '#9e9894', fontSize: 12, cursor: 'pointer',
              fontWeight: 500, fontFamily: F, transition: 'color 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9e9894'}
            >Merge</button>
            <button onClick={() => onDelete(cat)} style={{
              flex: 1, padding: '6px', borderRadius: 7, background: 'rgba(196,100,92,0.08)',
              border: '1px solid rgba(196,100,92,0.20)', color: '#c4645c', fontSize: 12,
              cursor: 'pointer', fontWeight: 500, fontFamily: F, transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(196,100,92,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(196,100,92,0.08)'}
            >Remove</button>
          </>
        )}
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [mergeSource, setMergeSource] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = () => {
    setLoading(true);
    categoriesApi.list()
      .then(({ data }) => setCategories(data.data.categories || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSaved = (saved, isNew) => {
    setModal(null);
    if (isNew) setCategories((p) => [...p, saved]);
    else setCategories((p) => p.map((c) => c.id === saved.id ? saved : c));
  };

  const handleDelete = async (cat) => {
    if (cat.is_default) { alert('Default categories cannot be deleted.'); return; }
    if (!confirm(`Deactivate "${cat.name}"?`)) return;
    try {
      await categoriesApi.delete(cat.id);
      setCategories((p) => p.map((c) => c.id === cat.id ? { ...c, is_active: false } : c));
    } catch (e) { alert(e.response?.data?.error?.message || 'Failed.'); }
  };

  const onMerged = (sourceId) => {
    setMergeSource(null);
    setCategories((p) => p.map((c) => c.id === sourceId ? { ...c, is_active: false } : c));
  };

  const filtered = categories.filter((c) => {
    if (!showInactive && !c.is_active) return false;
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    return true;
  });
  const income  = filtered.filter((c) => c.type === 'income');
  const expense = filtered.filter((c) => c.type === 'expense');

  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Categories</h1>
            <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Organize your income and expenses</p>
          </div>
          <button onClick={() => setModal('create')} style={{
            background: '#c17f59', border: 'none', color: '#fff', borderRadius: 10,
            padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: F,
            transition: 'background 0.15s',
          }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d4916a'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#c17f59'}
          >+ New Category</button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'expense', 'income'].map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} style={{
              padding: '6px 14px', borderRadius: 6, border: '1px solid',
              borderColor: typeFilter === t ? '#c17f59' : '#262626',
              background: typeFilter === t ? 'rgba(193,127,89,0.12)' : 'transparent',
              color: typeFilter === t ? '#c17f59' : '#6a6460',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              textTransform: 'capitalize', fontFamily: F, transition: 'all 0.15s',
            }}>{t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
          <label style={{ fontSize: 12, color: '#6a6460', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto', fontFamily: F }}>
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
            Show inactive
          </label>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6a6460' }}>Loading categories…</div>
        ) : (
          <>
            {(typeFilter === 'all' || typeFilter === 'expense') && expense.length > 0 && (
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#c4645c', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Expense Categories
                  <span style={{ background: 'rgba(196,100,92,0.12)', color: '#c4645c', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{expense.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 10 }}>
                  {expense.map((c) => <CategoryCard key={c.id} cat={c} onEdit={() => setModal(c)} onDelete={handleDelete} onMerge={() => setMergeSource(c)} />)}
                </div>
              </div>
            )}
            {(typeFilter === 'all' || typeFilter === 'income') && income.length > 0 && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6db48e', marginBottom: 12, letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
                  Income Categories
                  <span style={{ background: 'rgba(109,180,142,0.12)', color: '#6db48e', borderRadius: 4, padding: '1px 6px', fontSize: 10 }}>{income.length}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: 10 }}>
                  {income.map((c) => <CategoryCard key={c.id} cat={c} onEdit={() => setModal(c)} onDelete={handleDelete} onMerge={() => setMergeSource(c)} />)}
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#6a6460', fontSize: 13 }}>No categories to show</div>
            )}
          </>
        )}
      </div>

      {modal && <CategoryModal cat={modal === 'create' ? null : modal} onClose={() => setModal(null)} onSaved={onSaved} />}
      {mergeSource && <MergeModal source={mergeSource} allCategories={categories} onClose={() => setMergeSource(null)} onMerged={onMerged} />}
    </div>
  );
}
