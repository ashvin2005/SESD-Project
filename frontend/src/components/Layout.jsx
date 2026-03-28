import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsApi } from '../services/api';

// ── SVG Icons ─────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {typeof d === 'string' ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  Dashboard:    <Icon d={<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>} />,
  Transactions: <Icon d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />,
  Budgets:      <Icon d={<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>} />,
  Categories:   <Icon d="M4 6h16M4 10h16M4 14h10" />,
  Reports:      <Icon d="M3 3v18h18M7 16l4-4 4 4 4-5" />,
  Receipts:     <Icon d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} />,
  Chat:         <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  Anomalies:    <Icon d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="12"/><line x1="11" y1="16" x2="11.01" y2="16"/></>} />,
  Goal:         <Icon d={<><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>} />,
  Import:       <Icon d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} />,
  BudgetAI:     <Icon d={<><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>} />,
  Bell:         <Icon d={<><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></>} />,
  Investments:  <Icon d={<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>} />,
  Logo:         <Icon size={18} d={<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></>} />,
  Collapse:     <Icon d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />,
  Expand:       <Icon d="M13 5l7 7-7 7M6 5l7 7-7 7" />,
  Logout:       <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
};

const NAV_ITEMS = [
  { path: '/dashboard',    label: 'Dashboard',      icon: Icons.Dashboard },
  { path: '/transactions', label: 'Transactions',   icon: Icons.Transactions },
  { path: '/budgets',      label: 'Budgets',         icon: Icons.Budgets },
  { path: '/categories',   label: 'Categories',      icon: Icons.Categories },
  { path: '/reports',      label: 'Reports',         icon: Icons.Reports },
  { path: '/receipts',     label: 'Receipts',        icon: Icons.Receipts },
  { path: '/investments',  label: 'Investments',     icon: Icons.Investments },
  { divider: true },
  { path: '/chat',         label: 'AI Assistant',    icon: Icons.Chat,      ai: true },
  { path: '/anomalies',    label: 'Anomaly Scan',    icon: Icons.Anomalies, ai: true },
  { path: '/goal-plan',    label: 'Goal Planner',    icon: Icons.Goal,      ai: true },
  { path: '/import',       label: 'Bank Import',     icon: Icons.Import,    ai: true },
  { path: '/budget-recs',  label: 'Budget Advisor',  icon: Icons.BudgetAI,  ai: true },
];

const SEV_COLOR = {
  budget_exceeded: '#c4645c',
  budget_warning:  '#c49a4a',
  anomaly:         '#c17f59',
  system:          '#6a8fb5',
};

function NotificationBell() {
  const [open, setOpen]         = useState(false);
  const [notifications, setN]   = useState([]);
  const [unread, setUnread]     = useState(0);
  const ref                     = useRef();

  const load = () => {
    notificationsApi.list({ limit: 10 })
      .then(({ data }) => {
        setN(data.data.notifications || []);
        setUnread(data.data.unread_count || 0);
      })
      .catch(() => {});
  };

  useEffect(() => { load(); const id = setInterval(load, 60000); return () => clearInterval(id); }, []);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const markRead = async (id) => {
    await notificationsApi.markRead(id).catch(() => {});
    setN((p) => p.map((n) => n.id === id ? { ...n, is_read: true } : n));
    setUnread((p) => Math.max(0, p - 1));
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setN((p) => p.map((n) => ({ ...n, is_read: true })));
    setUnread(0);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: 'relative', background: open ? '#252525' : 'none',
          border: '1px solid ' + (open ? '#333333' : 'transparent'),
          cursor: 'pointer', padding: '7px 9px', borderRadius: 8,
          color: open ? '#f0ede8' : '#6a6460',
          display: 'flex', alignItems: 'center', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#f0ede8'; e.currentTarget.style.background = '#252525'; }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.color = '#6a6460'; e.currentTarget.style.background = 'none'; } }}
      >
        {Icons.Bell}
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4, background: '#c4645c', color: '#fff',
            borderRadius: '50%', fontSize: 8, fontWeight: 700, minWidth: 14, height: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 46, width: 340,
          background: '#1c1c1c', border: '1px solid #333333',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 1000, overflow: 'hidden',
        }}>
          <div style={{
            padding: '12px 16px', borderBottom: '1px solid #262626',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#f0ede8' }}>
              Notifications
              {unread > 0 && <span style={{ color: '#6a6460', fontWeight: 400, marginLeft: 6 }}>({unread} unread)</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAllRead} style={{
                background: 'none', border: 'none', color: '#c17f59',
                fontSize: 12, cursor: 'pointer', fontWeight: 500,
              }}>Mark all read</button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#6a6460', fontSize: 13 }}>
                No notifications yet
              </div>
            ) : notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markRead(n.id)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #222222',
                  cursor: n.is_read ? 'default' : 'pointer',
                  background: n.is_read ? 'transparent' : 'rgba(193,127,89,0.04)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!n.is_read) e.currentTarget.style.background = 'rgba(193,127,89,0.08)'; }}
                onMouseLeave={(e) => { if (!n.is_read) e.currentTarget.style.background = 'rgba(193,127,89,0.04)'; }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                    background: n.is_read ? 'transparent' : (SEV_COLOR[n.type] || '#c17f59'),
                  }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 600, color: '#f0ede8', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: '#9e9894', lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: 11, color: '#6a6460', marginTop: 4 }}>
                      {new Date(n.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#111111', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 60 : 224,
        background: '#0e0e0e',
        borderRight: '1px solid #222222',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.22s ease',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #1a1a1a',
          minHeight: 58,
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: '#c17f59',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', flexShrink: 0,
              }}>{Icons.Logo}</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#f0ede8', letterSpacing: '-0.02em' }}>FinanceAI</span>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 28, height: 28, borderRadius: 8, background: '#c17f59',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff',
            }}>{Icons.Logo}</div>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{ background: 'none', border: 'none', color: '#6a6460', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6a6460'}
            >{Icons.Collapse}</button>
          )}
        </div>

        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <button
              onClick={() => setCollapsed(false)}
              style={{ background: 'none', border: 'none', color: '#6a6460', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6 }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f0ede8'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#6a6460'}
            >{Icons.Expand}</button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px 8px' }}>
          {NAV_ITEMS.map((item, i) => {
            if (item.divider) return (
              <div key={i} style={{ height: 1, background: '#1e1e1e', margin: '8px 4px' }} />
            );
            return (
              <NavLink
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center',
                  gap: 10, padding: collapsed ? '9px 0' : '8px 10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8, marginBottom: 1, textDecoration: 'none',
                  background: isActive
                    ? (item.ai ? 'rgba(193,127,89,0.12)' : 'rgba(240,237,232,0.06)')
                    : 'transparent',
                  color: isActive
                    ? (item.ai ? '#c17f59' : '#f0ede8')
                    : (item.ai ? '#9e9894' : '#6a6460'),
                  fontSize: 13, fontWeight: isActive ? 600 : 400,
                  transition: 'all 0.12s',
                  borderLeft: isActive && !collapsed
                    ? `2px solid ${item.ai ? '#c17f59' : 'rgba(240,237,232,0.3)'}`
                    : '2px solid transparent',
                  paddingLeft: isActive && !collapsed ? 8 : (!collapsed ? 10 : 0),
                })}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  if (!el.getAttribute('aria-current')) {
                    el.style.background = 'rgba(240,237,232,0.04)';
                    el.style.color = '#f0ede8';
                  }
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  if (!el.getAttribute('aria-current')) {
                    el.style.background = 'transparent';
                    el.style.color = item.ai ? '#9e9894' : '#6a6460';
                  }
                }}
              >
                <span style={{ flexShrink: 0, display: 'flex', width: 16 }}>{item.icon}</span>
                {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>}
                {!collapsed && item.ai && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                    background: 'rgba(193,127,89,0.15)', color: '#c17f59',
                    padding: '1px 5px', borderRadius: 4,
                  }}>AI</span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '10px 10px 14px', borderTop: '1px solid #1a1a1a' }}>
          {!collapsed && user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', background: '#252525',
                border: '1px solid #333333',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600, color: '#c17f59', flexShrink: 0,
              }}>{(user?.name || user?.email || 'U')[0].toUpperCase()}</div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#f0ede8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name || 'User'}
                </div>
                <div style={{ fontSize: 11, color: '#6a6460', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            title="Logout"
            style={{
              width: '100%', background: 'none', border: '1px solid #262626', color: '#6a6460',
              borderRadius: 8, padding: '7px 10px', fontSize: 12, cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start', gap: 8,
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#c4645c'; e.currentTarget.style.borderColor = '#c4645c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#6a6460'; e.currentTarget.style.borderColor = '#262626'; }}
          >
            <span style={{ display: 'flex' }}>{Icons.Logout}</span>
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, minHeight: '100vh', overflowY: 'auto', background: '#111111', display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <div style={{
          padding: '0 24px', height: 52,
          borderBottom: '1px solid #1e1e1e',
          background: '#111111',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <NotificationBell />
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </main>
    </div>
  );
}
