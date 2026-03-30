import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const GOOGLE_URL = `${API_BASE}/auth/google`;
const GOOGLE_ENABLED = import.meta.env.VITE_GOOGLE_OAUTH_ENABLED === 'true';

const S = {
  page: {
    minHeight: '100vh', background: '#111111', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif", padding: 16,
  },
  wrap: {
    width: '100%', maxWidth: 400,
  },
  card: {
    background: '#1c1c1c', borderRadius: 18,
    border: '1px solid #262626',
    padding: '40px 36px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  input: {
    width: '100%', background: '#111111', border: '1px solid #333333',
    color: '#f0ede8', borderRadius: 10, padding: '11px 14px', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'border-color 0.15s',
  },
  label: {
    fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block',
    fontWeight: 500, letterSpacing: '0.01em',
  },
  btn: {
    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    letterSpacing: '-0.01em', transition: 'background 0.15s',
  },
  err: {
    background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72',
  },
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const demoLogin = async () => {
    setLoading(true); setError('');
    try {
      await login('demo@financetracker.com', 'Demo@1234');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Demo login failed. Please try again.');
    } finally { setLoading(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(form.email, form.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={S.page}>
      <div style={S.wrap}>
        {/* Brand mark */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: '#c17f59',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Welcome back</h1>
          <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Sign in to your account</p>
        </div>

        <div style={S.card}>
          {GOOGLE_ENABLED && (
            <>
              <a href={GOOGLE_URL} style={{ display: 'block', textDecoration: 'none', marginBottom: 20 }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: '#fff', color: '#1a1a1a', borderRadius: 10, padding: '10px 16px',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'opacity 0.15s',
                }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <svg width="16" height="16" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.2l6.7-6.7C35.8 2.5 30.2 0 24 0 14.6 0 6.6 5.4 2.5 13.3l7.8 6C12.2 13.3 17.6 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17z"/>
                    <path fill="#FBBC05" d="M10.3 28.7c-.5-1.5-.8-3.1-.8-4.7s.3-3.2.8-4.7l-7.8-6C.9 16.2 0 20 0 24s.9 7.8 2.5 11l7.8-6.3z"/>
                    <path fill="#34A853" d="M24 48c6.2 0 11.4-2.1 15.2-5.6l-7.5-5.8c-2.1 1.4-4.7 2.2-7.7 2.2-6.4 0-11.8-3.8-13.7-9.3l-7.8 6.3C6.6 42.6 14.6 48 24 48z"/>
                  </svg>
                  Continue with Google
                </div>
              </a>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: '#262626' }} />
                <span style={{ color: '#6a6460', fontSize: 11, letterSpacing: '0.02em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: '#262626' }} />
              </div>
            </>
          )}

          {/* Demo Login */}
          <button
            type="button"
            onClick={demoLogin}
            disabled={loading}
            style={{
              ...S.btn,
              background: 'linear-gradient(135deg, #2a1f14 0%, #231a0f 100%)',
              color: loading ? '#6a6460' : '#e8a96a',
              border: '1px solid #3d2b18',
              marginBottom: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '12px 16px',
            }}
            onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = 'linear-gradient(135deg, #321f0f 0%, #2a1a0a 100%)'; e.currentTarget.style.borderColor = '#c17f59'; } }}
            onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = 'linear-gradient(135deg, #2a1f14 0%, #231a0f 100%)'; e.currentTarget.style.borderColor = '#3d2b18'; } }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>
              {loading ? 'Signing in…' : '▶ Try Demo Account'}
            </span>
            {!loading && (
              <span style={{ fontSize: 11, fontWeight: 400, color: '#7a5c3a', letterSpacing: '0.01em' }}>
                Pre-loaded with 6 months of data · No sign-up needed
              </span>
            )}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, marginTop: 16 }}>
            <div style={{ flex: 1, height: 1, background: '#262626' }} />
            <span style={{ color: '#6a6460', fontSize: 11, letterSpacing: '0.02em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#262626' }} />
          </div>

          {error && <div style={{ ...S.err, marginBottom: 16 }}>{error}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Email address</label>
              <input
                style={S.input} type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required
                onFocus={(e) => e.target.style.borderColor = '#c17f59'}
                onBlur={(e) => e.target.style.borderColor = '#333333'}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Password</label>
              <input
                style={S.input} type="password" placeholder="••••••••"
                value={form.password} onChange={set('password')} required
                onFocus={(e) => e.target.style.borderColor = '#c17f59'}
                onBlur={(e) => e.target.style.borderColor = '#333333'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...S.btn,
                background: loading ? '#252525' : '#c17f59',
                color: loading ? '#6a6460' : '#fff',
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#d4916a'; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#c17f59'; }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6a6460' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#c17f59', textDecoration: 'none', fontWeight: 600 }}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
