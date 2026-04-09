import { useState, useRef, useEffect } from 'react';
import { chatApi } from '../services/api';

const F = "'Inter', system-ui, sans-serif";

const SUGGESTIONS = [
  'How much did I spend on food last month?',
  'Am I on track with my savings goal?',
  'What are my top spending categories?',
  'How does this month compare to last month?',
  'Which budget am I closest to exceeding?',
];

function UserAvatar() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: '#252525', border: '1px solid #333333',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#c17f59', fontSize: 12, fontWeight: 700, flexShrink: 0,
    }}>U</div>
  );
}

function AIAvatar() {
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: 'rgba(193,127,89,0.12)',
      border: '1px solid rgba(193,127,89,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c17f59"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    </div>
  );
}

function TypingDots() {
  return (
    <div style={{ display: 'inline-flex', gap: 4, padding: '4px 0', alignItems: 'center' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: '50%', background: '#6a6460',
          animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      flexDirection: isUser ? 'row-reverse' : 'row',
      marginBottom: 14,
      animation: 'fadeIn 0.2s ease',
    }}>
      {isUser ? <UserAvatar /> : <AIAvatar />}
      <div style={{
        maxWidth: '72%',
        background: isUser ? '#c17f59' : '#1c1c1c',
        color: isUser ? '#fff' : '#f0ede8',
        borderRadius: isUser ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
        padding: '10px 14px',
        fontSize: 14,
        lineHeight: 1.6,
        border: isUser ? 'none' : '1px solid #262626',
      }}>
        {msg.loading ? <TypingDots /> : msg.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: "Hi! I'm your finance assistant. Ask me anything about your spending, budgets, savings, or financial goals — I'll answer based on your real data.",
  }]);
  const [input, setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef           = useRef(null);
  const inputRef            = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getHistory = () =>
    messages.filter((m) => !m.loading).map((m) => ({ role: m.role, content: m.content }));

  const send = async (text) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
    setLoading(true);
    const loadingId = Date.now();
    setMessages((prev) => [...prev, { role: 'assistant', content: '', loading: true, id: loadingId }]);
    try {
      const { data } = await chatApi.message(trimmed, getHistory());
      setMessages((prev) => prev.map((m) => m.id === loadingId ? { role: 'assistant', content: data.data.reply } : m));
    } catch {
      setMessages((prev) => prev.map((m) => m.id === loadingId ? { role: 'assistant', content: 'Sorry, I could not process that. Please try again.' } : m));
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', maxHeight: '100vh', overflow: 'hidden',
      background: '#111111', color: '#f0ede8', fontFamily: F,
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        textarea::-webkit-scrollbar{width:3px}
        textarea::-webkit-scrollbar-thumb{background:#333333;border-radius:3px}
      `}</style>

      {/* Page header */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid #1e1e1e',
        background: '#111111', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <AIAvatar />
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: '-0.01em' }}>Finance Assistant</div>
          <div style={{ fontSize: 11, color: '#6db48e', marginTop: 1 }}>Powered by AI · Your data stays private</div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 20px 12px', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 11, color: '#6a6460', marginBottom: 8, fontWeight: 500, letterSpacing: '0.02em' }}>Try asking:</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} style={{
                background: '#1c1c1c', border: '1px solid #2a2a2a', color: '#9e9894',
                borderRadius: 20, padding: '6px 14px', fontSize: 12, cursor: 'pointer', fontFamily: F,
                transition: 'all 0.15s',
              }}
                onMouseEnter={(e) => { e.target.style.borderColor = '#c17f59'; e.target.style.color = '#f0ede8'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = '#2a2a2a'; e.target.style.color = '#9e9894'; }}
              >{s}</button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: '12px 20px 18px', borderTop: '1px solid #1e1e1e',
        background: '#111111', maxWidth: 800, width: '100%', margin: '0 auto', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your finances…"
            rows={1}
            style={{
              flex: 1, background: '#1c1c1c', border: '1px solid #333333', color: '#f0ede8',
              borderRadius: 12, padding: '11px 14px', fontSize: 14, resize: 'none',
              outline: 'none', fontFamily: F, lineHeight: 1.5,
              maxHeight: 120, overflowY: 'auto', transition: 'border-color 0.15s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#c17f59'}
            onBlur={(e) => e.target.style.borderColor = '#333333'}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            style={{
              width: 42, height: 42, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: loading || !input.trim() ? '#1c1c1c' : '#c17f59',
              color: loading || !input.trim() ? '#6a6460' : '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
            onMouseEnter={(e) => { if (!loading && input.trim()) e.currentTarget.style.background = '#d4916a'; }}
            onMouseLeave={(e) => { if (!loading && input.trim()) e.currentTarget.style.background = '#c17f59'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
            </svg>
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#6a6460', textAlign: 'center', marginTop: 7 }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}
