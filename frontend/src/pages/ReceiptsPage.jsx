import { useState, useEffect, useRef } from 'react';
import { receiptsApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [preview, setPreview]   = useState(null);
  const fileRef                 = useRef();

  const load = () => {
    setLoading(true);
    receiptsApi.list()
      .then(({ data }) => setReceipts(data.data.receipts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      await receiptsApi.upload(file);
      load();
    } catch (e) {
      setError(e.response?.data?.error?.message || 'Upload failed. Check file type and size.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this receipt?')) return;
    await receiptsApi.delete(id).catch(() => {});
    setReceipts((p) => p.filter((r) => r.id !== id));
    if (preview?.id === id) setPreview(null);
  };

  return (
    <div style={{ padding: 24, fontFamily: F, color: '#f0ede8' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 4px', letterSpacing: '-0.02em' }}>Receipts</h1>
            <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Store and manage transaction receipts</p>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }} onChange={(e) => handleUpload(e.target.files[0])} />
            <button onClick={() => fileRef.current.click()} disabled={uploading} style={{
              background: uploading ? '#252525' : '#c17f59',
              border: 'none', color: uploading ? '#6a6460' : '#fff', borderRadius: 10,
              padding: '9px 18px', fontWeight: 600, fontSize: 13, cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: F,
              transition: 'background 0.15s',
            }}
              onMouseEnter={(e) => { if (!uploading) e.currentTarget.style.background = '#d4916a'; }}
              onMouseLeave={(e) => { if (!uploading) e.currentTarget.style.background = '#c17f59'; }}
            >
              {uploading ? 'Uploading…' : 'Upload Receipt'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(196,100,92,0.10)', border: '1px solid rgba(196,100,92,0.30)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#c4645c' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#6a6460' }}>Loading receipts…</div>
        ) : receipts.length === 0 ? (
          <div style={{ background: '#1c1c1c', borderRadius: 16, padding: 64, textAlign: 'center', border: '1px solid #262626' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12, background: '#222222', border: '1px solid #2a2a2a',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9e9894" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div style={{ fontSize: 14, color: '#9e9894', fontWeight: 500, marginBottom: 6 }}>No receipts yet</div>
            <p style={{ color: '#6a6460', fontSize: 13, marginBottom: 20 }}>Upload receipts to keep records of your transactions.</p>
            <button onClick={() => fileRef.current.click()} style={{
              background: '#c17f59', border: 'none', color: '#fff',
              borderRadius: 10, padding: '9px 20px', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: F,
            }}>Upload First Receipt</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
            {receipts.map((r) => {
              const isImg = r.mime_type?.startsWith('image/');
              return (
                <div key={r.id} style={{
                  background: '#1c1c1c', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                  border: `1px solid ${preview?.id === r.id ? '#c17f59' : '#262626'}`,
                  transition: 'border-color 0.15s',
                }}
                  onClick={() => setPreview(r)}
                  onMouseEnter={(e) => { if (preview?.id !== r.id) e.currentTarget.style.borderColor = '#333333'; }}
                  onMouseLeave={(e) => { if (preview?.id !== r.id) e.currentTarget.style.borderColor = '#262626'; }}
                >
                  <div style={{ height: 110, background: '#111111', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {isImg ? (
                      <img
                        src={receiptsApi.fileUrl(r.id, true)}
                        alt={r.file_name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6a6460" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                      </svg>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3, color: '#f0ede8' }}>
                      {r.file_name}
                    </div>
                    <div style={{ fontSize: 11, color: '#6a6460' }}>
                      {(r.file_size / 1024).toFixed(0)} KB · {r.mime_type?.split('/')[1]?.toUpperCase()}
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
                      <a href={receiptsApi.fileUrl(r.id)} target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ fontSize: 11, color: '#c17f59', textDecoration: 'none' }}>View</a>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }}
                        style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 11, cursor: 'pointer', padding: 0, fontFamily: F, transition: 'color 0.15s' }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#c4645c'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#6a6460'}
                      >Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview modal */}
        {preview && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setPreview(null)}
          >
            <div
              style={{ background: '#1c1c1c', border: '1px solid #333333', borderRadius: 16, padding: 20, maxWidth: 700, width: '100%', maxHeight: '90vh', overflow: 'auto', fontFamily: F }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f0ede8', letterSpacing: '-0.01em' }}>{preview.file_name}</h3>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#6a6460', fontSize: 20, cursor: 'pointer' }}>&times;</button>
              </div>
              {preview.mime_type?.startsWith('image/') ? (
                <img src={receiptsApi.fileUrl(preview.id)} alt={preview.file_name} style={{ width: '100%', borderRadius: 10 }} />
              ) : (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 11, color: '#9e9894', marginBottom: 16 }}>
                    PDF receipt · {(preview.file_size / 1024).toFixed(0)} KB
                  </div>
                  <a href={receiptsApi.fileUrl(preview.id)} target="_blank" rel="noreferrer" style={{
                    display: 'inline-block', background: '#c17f59', color: '#fff', padding: '9px 20px',
                    borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 13,
                  }}>Open PDF</a>
                </div>
              )}
              <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <a href={receiptsApi.fileUrl(preview.id)} target="_blank" rel="noreferrer" style={{
                  background: '#222222', border: '1px solid #333333', color: '#f0ede8', padding: '7px 16px',
                  borderRadius: 8, textDecoration: 'none', fontSize: 13, fontWeight: 500,
                }}>Download</a>
                <button onClick={() => handleDelete(preview.id)} style={{
                  background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)',
                  color: '#c4645c', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: F,
                }}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
