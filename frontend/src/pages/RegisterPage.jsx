import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const GOOGLE_URL = `${API_BASE}/auth/google`;

const CURRENCIES = ['INR','USD','EUR','GBP','JPY','CAD','AUD','CHF','CNY','SGD','AED','SAR','HKD','NZD','SEK','NOK','DKK','MXN','BRL','ZAR'];

const S = {
  page: {
    minHeight: '100vh', background: '#111111', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', system-ui, sans-serif", padding: 16,
  },
  card: {
    background: '#1c1c1c', borderRadius: 18, border: '1px solid #262626',
    padding: '36px 36px', width: '100%', maxWidth: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  },
  input: {
    width: '100%', background: '#111111', border: '1px solid #333333',
    color: '#f0ede8', borderRadius: 10, padding: '11px 14px', fontSize: 14,
    outline: 'none', boxSizing: 'border-box',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'border-color 0.15s',
  },
  label: { fontSize: 12, color: '#9e9894', marginBottom: 6, display: 'block', fontWeight: 500 },
  btn: {
    width: '100%', padding: '11px', borderRadius: 10, border: 'none',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'background 0.15s',
  },
  err: {
    background: 'rgba(196,100,92,0.12)', border: '1px solid rgba(196,100,92,0.30)',
    borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#d47a72',
  },
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', base_currency: 'INR' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await register(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const focusStyle = (e) => { e.target.style.borderColor = '#c17f59'; };
  const blurStyle  = (e) => { e.target.style.borderColor = '#333333'; };

  return (
    <div style={S.page}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
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
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f0ede8', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Create account</h1>
          <p style={{ color: '#6a6460', fontSize: 13, margin: 0 }}>Start tracking your finances today</p>
        </div>

        <div style={S.card}>
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
              Sign up with Google
            </div>
          </a>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#262626' }} />
            <span style={{ color: '#6a6460', fontSize: 11, letterSpacing: '0.02em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#262626' }} />
          </div>

          {error && <div style={{ ...S.err, marginBottom: 16 }}>{error}</div>}

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Full name</label>
              <input style={S.input} type="text" placeholder="Jane Doe"
                value={form.name} onChange={set('name')} required
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Email address</label>
              <input style={S.input} type="email" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Password</label>
              <input style={S.input} type="password" placeholder="At least 8 characters"
                value={form.password} onChange={set('password')} required minLength={8}
                onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={S.label}>Base currency</label>
              <select value={form.base_currency} onChange={set('base_currency')}
                style={{ ...S.input, cursor: 'pointer' }}
                onFocus={focusStyle} onBlur={blurStyle}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
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
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6a6460' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#c17f59', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
