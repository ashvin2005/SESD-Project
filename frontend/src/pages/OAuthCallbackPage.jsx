import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Backend redirects here after Google OAuth:
 *   /auth/oauth-callback?token=<JWT>&refresh_token=<RT>
 * We extract the tokens, store them, refresh the user, then navigate to dashboard.
 */
export default function OAuthCallbackPage() {
  const { setTokens } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refresh_token');
    const error = params.get('error');

    if (error || !token) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    setTokens(token, refreshToken);
    navigate('/dashboard', { replace: true });
  }, [navigate, setTokens]);

  return (
    <div style={{
      minHeight: '100vh', background: '#111111', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif", color: '#f0ede8',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          border: '3px solid #2a2a2a', borderTopColor: '#c17f59',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: '#9e9894', fontSize: 13 }}>Completing sign-in…</p>
      </div>
    </div>
  );
}
