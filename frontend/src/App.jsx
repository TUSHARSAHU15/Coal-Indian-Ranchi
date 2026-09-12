import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Activity, ArrowRight, BarChart3, Building2, CheckCircle2, ChevronLeft,
  ClipboardCheck, DoorOpen, LogOut, Menu, ScanLine, ShieldCheck, Users,
  UserPlus, XCircle, AlertTriangle, Printer, UserCheck, Clock, Radio, Download,
  Camera, Trash2, Plus, Search
} from 'lucide-react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import api from './services/api';

// --- BULLETPROOF PASS BADGE PRINT ENGINE ---
const triggerPrintBadge = (elementId = 'printable-pass') => {
  const el = document.getElementById(elementId);
  if (!el) {
    window.print();
    return;
  }
  const printWindow = window.open('', '_blank', 'width=520,height=750');
  if (!printWindow) {
    window.print();
    return;
  }
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>CCL Official Digital Pass Badge</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'DM Sans', Arial, -apple-system, sans-serif;
            background: #ffffff;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .badge-shell {
            width: 360px;
            border: 2.5px solid #082b3a;
            border-radius: 14px;
            padding: 20px;
            background: #ffffff;
            box-shadow: none;
            text-align: center;
          }
          .badge-shell .panel-heading {
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 2px solid #e2b34a;
            padding-bottom: 12px;
            margin-bottom: 14px;
            text-align: left;
          }
          .badge-shell .panel-heading img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1.5px solid #e2b34a;
          }
          .badge-shell .eyebrow {
            font-size: 10px;
            font-weight: 700;
            color: #0d6975;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: block;
          }
          .badge-shell h3 {
            margin: 2px 0 0;
            font-size: 17px;
            color: #082b3a;
          }
          .badge-shell .status {
            font-size: 9px;
            font-weight: 800;
            padding: 3px 6px;
            border-radius: 4px;
            background: #e3f3e8;
            color: #22714b;
            text-transform: uppercase;
          }
          .badge-shell .qr-image, .badge-shell img[alt*="QR"] {
            width: 170px;
            height: 170px;
            margin: 10px auto;
            display: block;
          }
          .badge-shell .detail-list {
            margin-top: 14px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 10px;
            text-align: left;
            font-size: 12px;
          }
          .badge-shell .detail-list > div {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .badge-shell .detail-list span {
            color: #64748b;
          }
          .badge-shell .detail-list strong {
            color: #0f172a;
          }
          .no-print, .hologram-stripe, button {
            display: none !important;
          }
          @media print {
            body { padding: 0; }
            .badge-shell { border: 2px solid #000; width: 100%; max-width: 360px; margin: 0 auto; }
          }
        </style>
      </head>
      <body>
        <div class="badge-shell">
          ${el.innerHTML}
        </div>
        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() { window.close(); }, 600);
          };
        <\/script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

function TrafficGraph({ traffic = [] }) {
  const [chartType, setChartType] = useState('area');

  const totalIn = traffic.reduce((acc, curr) => acc + (curr.checkIns || 0), 0);
  const totalOut = traffic.reduce((acc, curr) => acc + (curr.checkOuts || 0), 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="chart-tooltip">
          <strong>{label} (Gate Hours)</strong>
          <div style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🟢 Check-ins:</span> <b>{payload[0]?.value ?? 0}</b>
          </div>
          <div style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px' }}>
            <span>🟡 Check-outs:</span> <b>{payload[1]?.value ?? 0}</b>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.74rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#047857', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            {totalIn} Total In
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#b45309', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            {totalOut} Total Out
          </span>
        </div>

        <div className="chart-tab-group">
          <button
            type="button"
            className={`chart-tab ${chartType === 'area' ? 'active' : ''}`}
            onClick={() => setChartType('area')}
          >
            Wave Curve
          </button>
          <button
            type="button"
            className={`chart-tab ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            Columns
          </button>
        </div>
      </div>

      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={traffic} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="checkInGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="checkOutGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="checkIns"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#checkInGrad)"
                name="Check-Ins"
              />
              <Area
                type="monotone"
                dataKey="checkOuts"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#checkOutGrad)"
                name="Check-Outs"
              />
            </AreaChart>
          ) : (
            <BarChart data={traffic} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="checkIns" fill="#10b981" radius={[4, 4, 0, 0]} name="Check-Ins" />
              <Bar dataKey="checkOuts" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Check-Outs" />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- SYNTHESIZED SOUND EFFECTS (Web Audio API - 100% Offline & Reliable) ---
const playAudioTone = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'checkin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'checkout') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'reject') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
};

const roles = {
  dashboard: ['SUPER_ADMIN', 'ADMIN', 'SECURITY'],
  visitors: ['SUPER_ADMIN', 'ADMIN'],
  approvals: ['SUPER_ADMIN', 'ADMIN', 'EMPLOYEE'],
  scanner: ['SUPER_ADMIN', 'ADMIN', 'SECURITY'],
  history: ['SUPER_ADMIN', 'ADMIN', 'SECURITY'],
  emergency: ['SUPER_ADMIN', 'ADMIN', 'SECURITY'],
  admin: ['SUPER_ADMIN', 'ADMIN'],
  all: ['SUPER_ADMIN', 'ADMIN', 'SECURITY', 'EMPLOYEE']
};

const unwrap = (response) => response.data?.data ?? response.data;
const messageFor = (error) =>
  error.response?.data?.message ||
  (error.response?.status === 403
    ? 'You do not have permission to perform this action.'
    : 'The request could not be completed.');
const formatDate = (value) =>
  value ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '-';

function useAuth() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('ccl_user') || 'null'));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('ccl_access_token')));

  useEffect(() => {
    if (!localStorage.getItem('ccl_access_token')) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((response) => {
        localStorage.setItem('ccl_user', JSON.stringify(response.data.user));
        setUser(response.data.user);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (employeeId, password) => {
    const response = await api.post('/auth/login', { employeeId, password });
    if (response.data.mfaRequired) return response.data;
    localStorage.setItem('ccl_access_token', response.data.accessToken);
    localStorage.setItem('ccl_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
    return response.data;
  };

  const completeMfa = async (tempToken, code) => {
    const response = await api.post('/auth/mfa/verify', { tempToken, code });
    localStorage.setItem('ccl_access_token', response.data.accessToken);
    localStorage.setItem('ccl_user', JSON.stringify(response.data.user));
    setUser(response.data.user);
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('ccl_access_token');
      localStorage.removeItem('ccl_user');
      setUser(null);
    }
  };

  return { user, loading, login, completeMfa, logout };
}

function Status({ value }) {
  const val = String(value || 'UNKNOWN');
  const tone =
    {
      APPROVED: 'status-success',
      INSIDE: 'status-success',
      REJECTED: 'status-danger',
      EXPIRED: 'status-danger',
      PENDING: 'status-warning',
      EXITED: 'status-neutral',
      NOT_ARRIVED: 'status-neutral'
    }[value] || 'status-neutral';

  const dotClass =
    val === 'INSIDE' || val === 'APPROVED'
      ? 'dot-pulse-green'
      : val === 'PENDING'
      ? 'dot-pulse-amber'
      : val === 'REJECTED' || val === 'EXPIRED'
      ? 'dot-pulse-red'
      : '';

  return (
    <span className={`status ${tone}`}>
      {dotClass && <span className={`status-dot ${dotClass}`} />}
      {val.replace('_', ' ')}
    </span>
  );
}

function Shell({ auth }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [toasts, setToasts] = useState([]);
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const addToast = (msg, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  useEffect(() => {
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('gate:event', (data) => {
      if (data.type === 'CHECK_IN') {
        addToast(`🟢 Check-in: ${data.visitor?.fullName || 'Visitor'} entered at ${data.visitor?.gate || 'Gate 01'}`, 'success');
      } else if (data.type === 'CHECK_OUT') {
        addToast(`⚪ Check-out: ${data.visitor?.fullName || 'Visitor'} departed facility`, 'info');
      } else if (data.type === 'NEW_VISITOR') {
        addToast(`📋 New Visitor registered: ${data.visitor?.fullName || 'Visitor'}`, 'info');
      } else if (data.type === 'APPROVAL_UPDATE') {
        addToast(`✅ Request ${data.visitor?.status}: ${data.visitor?.fullName || 'Visitor'}`, 'success');
      }
    });
    return () => socket.disconnect();
  }, []);

  const navigation = [
    ['Dashboard', '/dashboard', BarChart3, roles.dashboard],
    ['Visitors', '/visitors', Users, roles.visitors],
    ['Approval inbox', '/approvals', ClipboardCheck, roles.approvals],
    ['Gate scanner', '/scanner', ScanLine, roles.scanner],
    ['Gate history', '/gate-history', Activity, roles.history],
    ['Emergency roll call', '/emergency', AlertTriangle, roles.emergency],
    ['Departments', '/departments', Building2, roles.admin],
    ['Users', '/users', UserPlus, roles.admin],
    ['Pass lookup', '/lookup', Search, roles.all]
  ].filter(([, , , allowed]) => allowed.includes(auth.user?.role || 'SUPER_ADMIN'));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand">
          <img
            src="/ccl_security_emblem.jpg"
            alt="CCL Emblem"
            style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2b34a', flexShrink: 0 }}
          />
          <div>
            <strong>DVMS</strong>
            <span>Enterprise v2.0</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setOpen(false)} aria-label="Close navigation">
            <XCircle size={18} />
          </button>
        </div>

        <div className="side-label">Operations</div>
        <nav>
          {navigation.map(([label, path, Icon]) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={location.pathname === path ? 'nav-link active' : 'nav-link'}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="identity">
            <div className="avatar">{(auth.user?.employeeId || 'AD').slice(-2)}</div>
            <div>
              <strong>{auth.user?.employeeId || 'Administrator'}</strong>
              <span>{(auth.user?.role || 'SUPER_ADMIN').replace('_', ' ')}</span>
            </div>
          </div>
          <button className="logout-link" onClick={auth.logout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {open && <button className="scrim mobile-only" onClick={() => setOpen(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <div>
            <span className="eyebrow">Central Coalfields Limited</span>
            <h1>{navigation.find(([, path]) => path === location.pathname)?.[0] || 'CCL DVMS'}</h1>
          </div>
          <div className="connection" style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>
              {now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
              <span className="pulse" /> Live Telemetry
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>

      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast-item ${t.type}`}>
              <Radio size={15} style={{ color: '#e2b34a', flexShrink: 0 }} />
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Protected({ auth, allowed }) {
  if (auth.loading) return <div className="loading-screen">Loading secure workspace...</div>;
  if (!auth.user) return <Navigate to="/login" replace />;
  if (allowed && !allowed.includes(auth.user.role)) return <Navigate to="/unauthorized" replace />;
  return <Shell auth={auth} />;
}

function Login({ auth }) {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState('EMP-ADMIN');
  const [password, setPassword] = useState('Password@123');
  const [mfa, setMfa] = useState(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (auth.user) return <Navigate to="/dashboard" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = mfa ? await auth.completeMfa(mfa, code) : await auth.login(employeeId, password);
      if (result?.mfaRequired) setMfa(result.tempToken);
      else navigate('/dashboard');
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = (empId) => {
    setEmployeeId(empId);
    setPassword('Password@123');
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-kicker">CCL / DIGITAL ACCESS</div>
        <h1>
          Every arrival,
          <br />
          <em>accounted for.</em>
        </h1>
        <p>One secure operational view for visitors, hosts, gates, and emergency response.</p>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.35rem 0.65rem', borderRadius: '4px', color: '#e2b34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} /> DPDP Act 2023 Ready
          </span>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.35rem 0.65rem', borderRadius: '4px', color: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Radio size={13} /> Live WebSocket Sync
          </span>
        </div>
        <div className="login-rule" />
      </div>

      <div className="login-panel">
        <div className="brand">
          <img
            src="/ccl_security_emblem.jpg"
            alt="CCL Emblem"
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2b34a' }}
          />
          <div>
            <strong>DVMS</strong>
            <span>Enterprise visitor management</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">Secure sign in</span>
          <h2>Welcome back</h2>
          <p>Use your CCL employee credentials to continue.</p>
        </div>

        <form onSubmit={submit} className="form-stack">
          {mfa ? (
            <label>
              6-digit verification code
              <input
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength="6"
                required
              />
            </label>
          ) : (
            <>
              <label>
                Employee ID
                <input
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="EMP-ADMIN"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </label>
            </>
          )}

          {error && <div className="alert error">{error}</div>}

          <button className="primary-button" disabled={busy}>
            {busy ? 'Authenticating...' : mfa ? 'Verify and continue' : 'Sign in'} <ArrowRight size={17} />
          </button>
        </form>

        {/* Quick Demo Access Shortcuts for Easy Client Testing */}
        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Demo Accounts:
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => quickLogin('EMP-ADMIN')}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
            >
              Admin (EMP-ADMIN)
            </button>
            <button
              type="button"
              onClick={() => quickLogin('EMP-SEC01')}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
            >
              Security (EMP-SEC01)
            </button>
            <button
              type="button"
              onClick={() => quickLogin('EMP-HOST01')}
              style={{ fontSize: '0.72rem', padding: '0.35rem 0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}
            >
              Host (EMP-HOST01)
            </button>
          </div>
        </div>

        <div style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.78rem' }}>
          <Link to="/lookup" style={{ color: '#0d6975', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Search size={14} /> Visitor Pass Self-Lookup / Kiosk &rarr;
          </Link>
        </div>

        <div className="login-note">
          <ShieldCheck size={16} /> Access is protected by AES-256-GCM encryption & JWT role-based security.
        </div>
      </div>
    </div>
  );
}

function PageIntro({ eyebrow, title, children, action }) {
  return (
    <div className="page-intro">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {children && <p>{children}</p>}
      </div>
      {action}
    </div>
  );
}

function Stat({ label, value, detail, icon: Icon, accent = 'blue', index = 0 }) {
  return (
    <div className="stat-card" style={{ animationDelay: `${index * 0.08}s` }}>
      <div className={`stat-icon ${accent}`}>
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value ?? '-'}</strong>
        <small>{detail}</small>
      </div>
    </div>
  );
}

function Empty({ children = 'No records match the current view.' }) {
  return (
    <div className="empty-state">
      <ClipboardCheck size={24} />
      <p>{children}</p>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [gate, setGate] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setRefreshing(true);
    return Promise.all([
      api.get('/dashboard/kpi'),
      api.get('/dashboard/traffic'),
      api.get('/visitors'),
      api.get('/gate/status')
    ])
      .then(([kpi, trend, visitorResponse, gateResponse]) => {
        setData(unwrap(kpi));
        setTraffic(unwrap(trend) || []);
        setVisitors(unwrap(visitorResponse) || []);
        setGate(unwrap(gateResponse));
      })
      .catch((err) => setError(messageFor(err)))
      .finally(() => {
        setTimeout(() => setRefreshing(false), 450);
      });
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export-csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCL_Visitor_Log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open('/api/export-csv', '_blank');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('kpi:update', load);
    socket.on('gate:event', load);
    return () => socket.disconnect();
  }, []);

  const inside = visitors.filter((visitor) => visitor.visitState === 'INSIDE');
  const pending = visitors.filter((visitor) => visitor.status === 'PENDING');

  return (
    <>
      <PageIntro
        eyebrow="Operations overview"
        title="Today at a glance"
        action={
          <div className="intro-actions">
            <span className="live-pill">
              <span className="pulse" /> Live operations
            </span>
            <button
              type="button"
              className="secondary-button"
              onClick={handleExportCsv}
              disabled={exporting}
              title="Download visitor database as Excel CSV"
            >
              <Download size={15} style={{ color: '#0d6975' }} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={load}
              disabled={refreshing}
              title="Fetch latest live records from database"
            >
              <Activity size={16} style={{ color: '#0d6975' }} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      >
        <span>Live movement and access activity across the CCL facility network.</span>
      </PageIntro>

      {error && <div className="alert error">{error}</div>}

      <div className="stats-grid">
        <Stat label="Visitors today" value={data?.visitorsToday} detail="Scheduled arrivals" icon={Users} index={0} />
        <Stat
          label="Currently inside"
          value={data?.currentlyInside}
          detail="Active presence"
          icon={DoorOpen}
          accent="green"
          index={1}
        />
        <Stat
          label="Pending approvals"
          value={data?.pendingApprovals}
          detail="Awaiting host action"
          icon={ClipboardCheck}
          accent="gold"
          index={2}
        />
        <Stat
          label="Completed today"
          value={data?.completedToday}
          detail="Checked out"
          icon={CheckCircle2}
          accent="slate"
          index={3}
        />
        <Stat
          label="Overstays"
          value={data?.overstayCount}
          detail="Needs attention"
          icon={AlertTriangle}
          accent="red"
          index={4}
        />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Gate traffic analytics</span>
              <h3>Today's movement graph</h3>
            </div>
            <span className="subtle">07:00 - 20:00 · Hourly Flow</span>
          </div>
          <TrafficGraph traffic={traffic} />
        </section>

        <section className="panel signal-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Distribution</span>
              <h3>By department</h3>
            </div>
          </div>
          {(data?.departmentDistribution || []).length ? (
            data.departmentDistribution.map((item) => (
              <div className="department-row" key={item.name}>
                <span>{item.name}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <Empty>No department activity for today.</Empty>
          )}
        </section>
      </div>

      <div className="dashboard-grid dashboard-lower">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Live presence</span>
              <h3>People inside</h3>
            </div>
            <span className="subtle">
              <UserCheck size={14} /> {inside.length} active
            </span>
          </div>
          {inside.length ? (
            inside.slice(0, 5).map((visitor) => (
              <div className="activity-row" key={visitor._id}>
                <div className="activity-avatar">{visitor.fullName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{visitor.fullName}</strong>
                  <small>
                    {visitor.departmentId?.code || 'General'} · {visitor.gateIn || 'Gate 01'}
                  </small>
                </div>
                <span className="activity-time">
                  <Clock size={13} /> {formatDate(visitor.checkedInAt)}
                </span>
              </div>
            ))
          ) : (
            <Empty>No visitors are currently inside.</Empty>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Host queue</span>
              <h3>Pending approvals</h3>
            </div>
            <span className="subtle">
              <ClipboardCheck size={14} /> {pending.length} waiting
            </span>
          </div>
          {pending.length ? (
            pending.slice(0, 5).map((visitor) => (
              <div className="activity-row" key={visitor._id}>
                <div className="activity-avatar gold-avatar">{visitor.fullName.slice(0, 2).toUpperCase()}</div>
                <div>
                  <strong>{visitor.fullName}</strong>
                  <small>{visitor.purpose}</small>
                </div>
                <Status value={visitor.status} />
              </div>
            ))
          ) : (
            <Empty>Approval queue is clear.</Empty>
          )}
        </section>
      </div>

      <section className="panel activity-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Live scan stream</span>
            <h3>Recent gate activity</h3>
          </div>
          <span className="subtle">
            <Radio size={14} /> Socket connected
          </span>
        </div>
        {(gate?.recentScans || []).length ? (
          gate.recentScans.slice(0, 6).map((log) => (
            <div className="activity-row" key={log._id}>
              <div className={`activity-avatar ${log.action === 'CHECK_IN' ? 'green-avatar' : 'slate-avatar'}`}>
                <DoorOpen size={15} />
              </div>
              <div>
                <strong>{log.visitorId?.fullName || 'Verified Visitor'}</strong>
                <small>
                  {log.visitorId?.visitorId || '-'} · {log.scannedBy?.employeeId || 'Security'}
                </small>
              </div>
              <Status value={log.action} />
              <span className="activity-time">{formatDate(log.createdAt)}</span>
            </div>
          ))
        ) : (
          <Empty>No gate scans recorded today.</Empty>
        )}
      </section>
    </>
  );
}

function Visitors() {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const load = () =>
    api
      .get('/visitors', { params: { search: query || undefined, status: status || undefined } })
      .then((r) => setVisitors(unwrap(r) || []))
      .catch((e) => setError(messageFor(e)));

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await api.get('/export-csv', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CCL_Visitor_Log_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      window.open('/api/export-csv', '_blank');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    load();
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('gate:event', load);
    socket.on('kpi:update', load);
    return () => socket.disconnect();
  }, [status]);

  return (
    <>
      <PageIntro
        eyebrow="Visitor registry"
        title="Visitors"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="secondary-button"
              onClick={handleExportCsv}
              disabled={exporting}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              title="Download visitor database as Excel CSV"
            >
              <Download size={15} style={{ color: '#0d6975' }} className={exporting ? 'animate-bounce' : ''} />
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
            <button className="primary-button" onClick={() => navigate('/visitors/new')}>
              <UserPlus size={17} /> Register visitor
            </button>
          </div>
        }
      >
        <span>Search and review visitor access records across CCL facilities.</span>
      </PageIntro>

      <div className="toolbar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, mobile, visitor ID or pass code"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <button className="secondary-button" onClick={load}>
          Search
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Host / department</th>
                <th>Visit date</th>
                <th>Approval</th>
                <th>Gate state</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visitors.map((visitor) => (
                <tr key={visitor._id}>
                  <td>
                    <strong>{visitor.fullName}</strong>
                    <small>
                      {visitor.visitorId} · {visitor.mobile}
                    </small>
                  </td>
                  <td>
                    {visitor.hostEmployeeId?.employeeId || '-'}
                    <small>{visitor.departmentId?.code || visitor.departmentId?.name || '-'}</small>
                  </td>
                  <td>{formatDate(visitor.visitDate)}</td>
                  <td>
                    <Status value={visitor.status} />
                  </td>
                  <td>
                    <Status value={visitor.visitState} />
                  </td>
                  <td>
                    <button className="text-button" onClick={() => navigate(`/visitors/${visitor._id}`)}>
                      View <ChevronLeft size={15} className="rotate-180" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visitors.length && <Empty />}
        </div>
      </section>
    </>
  );
}

const GOVT_ID_CONFIG = {
  'Aadhaar Card': {
    name: 'Aadhaar Card',
    limit: 12,
    placeholder: 'Enter 12-digit Aadhaar (e.g. 123456789012)',
    hint: 'Exactly 12 numeric digits required',
    sanitize: (val) => val.replace(/\D/g, '').slice(0, 12),
    isValid: (val) => /^\d{12}$/.test(val),
    errorMsg: 'Aadhaar Card number must be exactly 12 numeric digits.'
  },
  'PAN Card': {
    name: 'PAN Card',
    limit: 10,
    placeholder: 'Enter 10-character PAN (e.g. ABCDE1234F)',
    hint: '10 alphanumeric characters (5 letters, 4 digits, 1 letter)',
    sanitize: (val) => val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    isValid: (val) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val),
    errorMsg: 'PAN Card must be 10 characters in ABCDE1234F format.'
  },
  'Driving License': {
    name: 'Driving License',
    limit: 16,
    placeholder: 'Enter Driving License (up to 16 characters)',
    hint: 'Between 10 and 16 alphanumeric characters',
    sanitize: (val) => val.toUpperCase().replace(/[^A-Z0-9\-\/]/g, '').slice(0, 16),
    isValid: (val) => /^[A-Z0-9\-\/]{10,16}$/.test(val),
    errorMsg: 'Driving License must be between 10 and 16 characters.'
  },
  'Voter ID': {
    name: 'Voter ID',
    limit: 10,
    placeholder: 'Enter 10-character Voter ID / EPIC number',
    hint: 'Exactly 10 alphanumeric characters (e.g. ABC1234567)',
    sanitize: (val) => val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
    isValid: (val) => /^[A-Z0-9]{10}$/.test(val),
    errorMsg: 'Voter ID must be 10 alphanumeric characters.'
  }
};

const getLocalDateTimeString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

function RegisterVisitor() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    fullName: '',
    mobile: '',
    email: '',
    govtIdType: 'Aadhaar Card',
    govtIdNumber: '',
    hostEmployeeId: '',
    departmentId: '',
    purpose: '',
    visitDate: getLocalDateTimeString(),
    expectedDuration: 2,
    photoUrl: ''
  });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [photoCamera, setPhotoCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/departments')])
      .then(([u, d]) => {
        setUsers(unwrap(u) || []);
        setDepartments(unwrap(d) || []);
      })
      .catch((e) => setError(messageFor(e)));
  }, []);

  useEffect(() => {
    let stream = null;
    if (photoCamera) {
      setCameraError('');
      navigator.mediaDevices
        ?.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(() => {
          setCameraError('Camera access denied or unavailable. Please upload a photo instead.');
          setPhotoCamera(false);
        });
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [photoCamera]);

  const snapPhoto = () => {
    if (!videoRef.current) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, 320, 240);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
      setPhotoCamera(false);
    } catch (e) {
      setCameraError('Failed to capture photo frame.');
    }
  };

  const handleFilePhoto = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setForm((prev) => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const clearFieldError = (key) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const update = (key) => (e) => {
    setForm({ ...form, [key]: e.target.value });
    clearFieldError(key);
  };

  const handleGovtIdTypeChange = (e) => {
    const newType = e.target.value;
    const cfg = GOVT_ID_CONFIG[newType] || GOVT_ID_CONFIG['Aadhaar Card'];
    setForm((prev) => ({
      ...prev,
      govtIdType: newType,
      govtIdNumber: cfg.sanitize(prev.govtIdNumber || '')
    }));
    clearFieldError('govtIdNumber');
  };

  const handleGovtIdNumberChange = (e) => {
    const cfg = GOVT_ID_CONFIG[form.govtIdType] || GOVT_ID_CONFIG['Aadhaar Card'];
    const sanitized = cfg.sanitize(e.target.value);
    setForm((prev) => ({ ...prev, govtIdNumber: sanitized }));
    clearFieldError('govtIdNumber');
  };

  const handleMobileChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((prev) => ({ ...prev, mobile: raw }));
    clearFieldError('mobile');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errors = {};

    if (!form.fullName || !form.fullName.trim()) {
      errors.fullName = 'Full name is required.';
    }

    const cleanMobile = form.mobile ? form.mobile.replace(/\D/g, '') : '';
    if (!cleanMobile) {
      errors.mobile = 'Mobile number is required.';
    } else if (cleanMobile.length !== 10) {
      errors.mobile = 'Mobile number must be exactly 10 digits.';
    }

    const cfg = GOVT_ID_CONFIG[form.govtIdType] || GOVT_ID_CONFIG['Aadhaar Card'];
    if (!form.govtIdNumber || !form.govtIdNumber.trim()) {
      errors.govtIdNumber = `${form.govtIdType} number is required.`;
    } else if (!cfg.isValid(form.govtIdNumber.trim())) {
      errors.govtIdNumber = cfg.errorMsg;
    }

    if (!form.hostEmployeeId) {
      errors.hostEmployeeId = 'Please select a host employee.';
    }

    if (!form.departmentId) {
      errors.departmentId = 'Please select a department.';
    }

    if (!form.visitDate) {
      errors.visitDate = 'Visit date & time is required.';
    }

    if (!form.expectedDuration || Number(form.expectedDuration) < 1) {
      errors.expectedDuration = 'Expected duration must be at least 1 hour.';
    }

    if (!form.purpose || !form.purpose.trim()) {
      errors.purpose = 'Purpose of visit is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError('Please fill in all required fields correctly before registering.');
      playAudioTone('reject');
      return;
    }

    setFieldErrors({});
    try {
      const response = await api.post('/visitors', {
        ...form,
        expectedDuration: Number(form.expectedDuration)
      });
      playAudioTone('checkin');
      setResult(unwrap(response));
    } catch (err) {
      playAudioTone('reject');
      setError(messageFor(err));
    }
  };

  if (result)
    return (
      <>
        <PageIntro eyebrow="Registration complete" title="Visitor pass ready">
          <span>Share the one-time pass details with the visitor or print the record.</span>
        </PageIntro>
        <section className="panel success-panel">
          <CheckCircle2 size={34} />
          <div>
            <h3>{result.fullName}</h3>
            <p>
              {result.visitorId} · pass code <strong>{result.passCode}</strong>
            </p>
            <p className="subtle">
              Status: <Status value={result.status} />
            </p>
          </div>
          <button className="secondary-button" onClick={() => navigate(`/visitors/${result._id}`)}>
            Open record
          </button>
        </section>
      </>
    );

  const currentIdConfig = GOVT_ID_CONFIG[form.govtIdType] || GOVT_ID_CONFIG['Aadhaar Card'];
  const isIdLengthComplete = (form.govtIdNumber?.length || 0) === currentIdConfig.limit;
  const isMobileComplete = (form.mobile?.length || 0) === 10;

  return (
    <>
      <PageIntro eyebrow="Visitor registry" title="Register a visitor">
        <span>Fields marked with <span style={{ color: '#ef4444', fontWeight: 700 }}>*</span> are required. PII is encrypted with AES-256-GCM.</span>
      </PageIntro>
      {error && <div className="alert error">{error}</div>}
      <form className="panel form-grid" onSubmit={submit} noValidate>
        <label>
          <span>
            Full name <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <input
            value={form.fullName}
            onChange={update('fullName')}
            placeholder="e.g. Rahul Sharma"
            style={fieldErrors.fullName ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          />
          {fieldErrors.fullName && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>{fieldErrors.fullName}</span>
          )}
        </label>

        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Mobile number <span style={{ color: '#ef4444' }}>*</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: isMobileComplete ? '#059669' : '#64748b',
                background: isMobileComplete ? '#ecfdf5' : '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: isMobileComplete ? '#a7f3d0' : '#e2e8f0'
              }}
            >
              {form.mobile?.length || 0} / 10 digits
            </span>
          </div>
          <input
            type="tel"
            maxLength={10}
            value={form.mobile}
            onChange={handleMobileChange}
            placeholder="10-digit mobile number (e.g. 9876543210)"
            style={{
              borderColor: fieldErrors.mobile ? '#ef4444' : undefined,
              background: fieldErrors.mobile ? '#fff5f5' : undefined,
              letterSpacing: '0.04em',
              fontFamily: 'monospace, sans-serif'
            }}
          />
          {fieldErrors.mobile && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>{fieldErrors.mobile}</span>
          )}
        </label>

        <label>
          Email address
          <input
            type="email"
            value={form.email}
            onChange={update('email')}
            placeholder="visitor@company.com (optional)"
          />
        </label>

        <label>
          <span>
            Government ID type <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <select value={form.govtIdType} onChange={handleGovtIdTypeChange}>
            <option>Aadhaar Card</option>
            <option>PAN Card</option>
            <option>Driving License</option>
            <option>Voter ID</option>
          </select>
        </label>

        <label>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              {form.govtIdType} Number <span style={{ color: '#ef4444' }}>*</span>
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: isIdLengthComplete ? '#059669' : '#64748b',
                background: isIdLengthComplete ? '#ecfdf5' : '#f1f5f9',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid',
                borderColor: isIdLengthComplete ? '#a7f3d0' : '#e2e8f0'
              }}
            >
              {form.govtIdNumber?.length || 0} / {currentIdConfig.limit} {form.govtIdType === 'Aadhaar Card' ? 'digits' : 'chars'}
            </span>
          </div>
          <input
            maxLength={currentIdConfig.limit}
            value={form.govtIdNumber}
            onChange={handleGovtIdNumberChange}
            placeholder={currentIdConfig.placeholder}
            style={{
              borderColor: fieldErrors.govtIdNumber ? '#ef4444' : undefined,
              background: fieldErrors.govtIdNumber ? '#fff5f5' : undefined,
              letterSpacing: '0.04em',
              fontFamily: 'monospace, sans-serif'
            }}
          />
          <small style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '-0.15rem' }}>
            {currentIdConfig.hint}
          </small>
          {fieldErrors.govtIdNumber && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.govtIdNumber}
            </span>
          )}
        </label>

        <label>
          <span>
            Host employee <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <select
            value={form.hostEmployeeId}
            onChange={update('hostEmployeeId')}
            style={fieldErrors.hostEmployeeId ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          >
            <option value="">Select host employee</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.employeeId} ({u.role})
              </option>
            ))}
          </select>
          {fieldErrors.hostEmployeeId && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.hostEmployeeId}
            </span>
          )}
        </label>

        <label>
          <span>
            Department <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <select
            value={form.departmentId}
            onChange={update('departmentId')}
            style={fieldErrors.departmentId ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.code} · {d.name}
              </option>
            ))}
          </select>
          {fieldErrors.departmentId && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.departmentId}
            </span>
          )}
        </label>

        <label>
          <span>
            Visit date & time <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <input
            type="datetime-local"
            value={form.visitDate}
            onChange={update('visitDate')}
            style={fieldErrors.visitDate ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          />
          {fieldErrors.visitDate && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.visitDate}
            </span>
          )}
        </label>

        <label>
          <span>
            Expected duration (hours) <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <input
            type="number"
            min="1"
            max="24"
            value={form.expectedDuration}
            onChange={update('expectedDuration')}
            style={fieldErrors.expectedDuration ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          />
          {fieldErrors.expectedDuration && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.expectedDuration}
            </span>
          )}
        </label>

        <div className="wide" style={{ border: '1px dashed #cbd5e1', padding: '1rem', borderRadius: '0.55rem', background: '#f8fafc' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
            Visitor Photo (Webcam Snapshot or Upload)
          </span>

          {cameraError && <div className="alert error" style={{ marginBottom: '0.6rem' }}>{cameraError}</div>}

          {form.photoUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <img
                src={form.photoUrl}
                alt="Visitor snapshot"
                style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #0d6975' }}
              />
              <div>
                <strong style={{ fontSize: '0.85rem', display: 'block', color: '#0f172a' }}>Photo Captured</strong>
                <button
                  type="button"
                  className="text-button"
                  style={{ color: '#b91c1c', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', marginTop: '0.2rem' }}
                  onClick={() => setForm((prev) => ({ ...prev, photoUrl: '' }))}
                >
                  <Trash2 size={14} /> Remove and retake
                </button>
              </div>
            </div>
          ) : photoCamera ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'flex-start' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '220px', height: '165px', borderRadius: '6px', background: '#000', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="primary-button" onClick={snapPhoto}>
                  <Camera size={15} /> Capture Photo
                </button>
                <button type="button" className="secondary-button" onClick={() => setPhotoCamera(false)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="secondary-button" onClick={() => setPhotoCamera(true)}>
                <Camera size={15} /> Live Webcam Snapshot
              </button>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>or upload file:</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFilePhoto}
                style={{ fontSize: '0.75rem', padding: '0.4rem', maxWidth: '240px' }}
              />
            </div>
          )}
        </div>

        <label className="wide">
          <span>
            Purpose of visit <span style={{ color: '#ef4444' }}>*</span>
          </span>
          <textarea
            value={form.purpose}
            onChange={update('purpose')}
            rows="3"
            placeholder="Official meeting, safety inspection, contractor work, etc."
            style={fieldErrors.purpose ? { borderColor: '#ef4444', background: '#fff5f5' } : undefined}
          />
          {fieldErrors.purpose && (
            <span style={{ color: '#dc2626', fontSize: '0.72rem', fontWeight: 600 }}>
              {fieldErrors.purpose}
            </span>
          )}
        </label>
        <div className="form-actions wide">
          <button type="button" className="secondary-button" onClick={() => navigate('/visitors')}>
            Cancel
          </button>
          <button className="primary-button">
            Register visitor <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </>
  );
}

function VisitorDetail() {
  const { id } = useParams();
  const [visitor, setVisitor] = useState(null);
  const [pass, setPass] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get(`/visitors/${id}`)
      .then((r) => setVisitor(unwrap(r)))
      .catch((e) => setError(messageFor(e)));
    api
      .get(`/visitors/${id}/pass`)
      .then((r) => setPass(unwrap(r)))
      .catch(() => {});
  }, [id]);

  if (error) return <div className="alert error">{error}</div>;
  if (!visitor) return <div className="loading-block">Loading visitor record...</div>;

  return (
    <>
      <PageIntro
        eyebrow="Visitor record"
        title={visitor.fullName}
        action={
          <button className="primary-button no-print" onClick={() => triggerPrintBadge('printable-pass')}>
            <Printer size={16} /> 1-Click Print Badge
          </button>
        }
      >
        <span>
          {visitor.visitorId} · registered {formatDate(visitor.createdAt)}
        </span>
      </PageIntro>
      <div className="detail-grid">
        <section className="panel detail-list">
          <div>
            <span>Visitor ID</span>
            <strong>{visitor.visitorId}</strong>
          </div>
          {[
            ['Mobile', visitor.mobile],
            ['Email', visitor.email],
            ['Host', visitor.hostEmployeeId?.employeeId],
            ['Department', visitor.departmentId?.name],
            ['Purpose', visitor.purpose],
            ['Visit date', formatDate(visitor.visitDate)],
            ['Checked in', formatDate(visitor.checkedInAt)],
            ['Checked out', formatDate(visitor.checkedOutAt)]
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value || '-'}</strong>
            </div>
          ))}
        </section>

        <section className="panel pass-panel holographic-card" id="printable-pass">
          <div className="hologram-stripe" />
          <div className="panel-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img
              src="/ccl_security_emblem.jpg"
              alt="CCL"
              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2b34a', flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <span className="eyebrow">Digital pass</span>
              <h3>{pass?.passCode || visitor.passCode || 'Pass code unavailable'}</h3>
            </div>
            <Status value={visitor.status} />
          </div>
          {visitor.photoUrl && (
            <img
              src={visitor.photoUrl}
              alt={visitor.fullName}
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                margin: '0.6rem auto',
                border: '3px solid #0d6975',
                display: 'block'
              }}
            />
          )}
          {pass?.qrDataUri && <img className="qr-image" src={pass.qrDataUri} alt="Visitor pass QR code" />}
          <p className="subtle">Valid until {formatDate(pass?.expiresAt || visitor.expiresAt)}</p>
        </section>
      </div>
    </>
  );
}

function Approvals() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState({});

  const load = () =>
    api
      .get('/visitors', { params: { status: 'PENDING' } })
      .then((r) => setItems(unwrap(r) || []))
      .catch((e) => setError(messageFor(e)));

  useEffect(() => {
    load();
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('gate:event', load);
    socket.on('kpi:update', load);
    return () => socket.disconnect();
  }, []);

  const decide = async (id, status) => {
    try {
      await api.patch(`/visitors/${id}/approve`, { status, remarks: remarks[id] || undefined });
      if (status === 'APPROVED') {
        playAudioTone('checkin');
      } else {
        playAudioTone('reject');
      }
      setItems(items.filter((item) => item._id !== id));
    } catch (e) {
      setError(messageFor(e));
    }
  };

  return (
    <>
      <PageIntro eyebrow="Host actions" title="Approval inbox">
        <span>Review visit requests awaiting employee or administrator approval.</span>
      </PageIntro>
      {error && <div className="alert error">{error}</div>}
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Purpose</th>
                <th>Visit date</th>
                <th>Host</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <strong>{item.fullName}</strong>
                    <small>{item.mobile}</small>
                  </td>
                  <td>{item.purpose}</td>
                  <td>{formatDate(item.visitDate)}</td>
                  <td>{item.hostEmployeeId?.employeeId || '-'}</td>
                  <td>
                    <div className="action-row">
                      <input
                        placeholder="Remark (optional)"
                        value={remarks[item._id] || ''}
                        onChange={(e) => setRemarks({ ...remarks, [item._id]: e.target.value })}
                        style={{ fontSize: '0.72rem', padding: '0.35rem 0.5rem', width: '130px' }}
                      />
                      <button className="approve-button" onClick={() => decide(item._id, 'APPROVED')}>
                        <CheckCircle2 size={15} /> Approve
                      </button>
                      <button className="reject-button" onClick={() => decide(item._id, 'REJECTED')}>
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <Empty>No pending approvals.</Empty>}
        </div>
      </section>
    </>
  );
}

function Scanner() {
  const [identifier, setIdentifier] = useState('');
  const [gateNumber, setGateNumber] = useState('Main Gate 01');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [camera, setCamera] = useState(false);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    if (!camera) return undefined;
    const reader = new Html5Qrcode('qr-reader');
    let active = true;
    reader
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded) => {
          if (!active) return;
          try {
            const payload = JSON.parse(decoded);
            setIdentifier(payload.code || payload.vId || payload.id || decoded);
          } catch {
            setIdentifier(decoded);
          }
          setCamera(false);
        },
        () => {}
      )
      .catch(() => {
        setCameraError('Camera permission was denied or no camera is available. Use the pass code field instead.');
        setCamera(false);
      });
    return () => {
      active = false;
      reader.stop().catch(() => {});
    };
  }, [camera]);

  const scan = async (action) => {
    setError('');
    try {
      const response = await api.post('/gate/scan', { identifier: identifier.trim(), action, gateNumber });
      const data = unwrap(response);
      setResult(data);
      if (data.action === 'CHECK_IN') {
        playAudioTone('checkin');
      } else {
        playAudioTone('checkout');
      }
      setIdentifier('');
    } catch (e) {
      setResult(null);
      playAudioTone('reject');
      setError(messageFor(e));
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Security operations"
        title="Gate scanner"
        action={
          <span className="live-pill">
            <span className="pulse" /> Scanner ready
          </span>
        }
      >
        <span>Scan the generated visitor QR pass or enter its six-digit code. Verified with audio feedback cues.</span>
      </PageIntro>
      <div className="scanner-grid">
        <section className="panel scanner-panel">
          <div className="scanner-frame">
            <div className="scanner-hud-corner tl" />
            <div className="scanner-hud-corner tr" />
            <div className="scanner-hud-corner bl" />
            <div className="scanner-hud-corner br" />
            {camera && <div className="scanner-laser" />}
            <div id="qr-reader" className={camera ? 'qr-reader active' : 'qr-reader'}>
              {!camera && (
                <>
                  <ScanLine size={48} />
                  <strong>Camera scanner</strong>
                  <span>Position QR code in view.</span>
                </>
              )}
            </div>
          </div>
          {cameraError && <div className="alert error">{cameraError}</div>}
          <button
            className="secondary-button camera-button"
            onClick={() => {
              setCameraError('');
              setCamera(true);
            }}
          >
            <ScanLine size={17} /> {camera ? 'Scanning...' : 'Start camera scan'}
          </button>
          <label>
            Pass code, visitor ID, or QR payload
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="6-digit pass code"
              inputMode="text"
            />
          </label>
          <label>
            Gate
            <input value={gateNumber} onChange={(e) => setGateNumber(e.target.value)} />
          </label>
          <div className="form-actions">
            <button className="primary-button" disabled={!identifier || camera} onClick={() => scan('CHECK_IN')}>
              <DoorOpen size={17} /> Check in
            </button>
            <button className="secondary-button" disabled={!identifier || camera} onClick={() => scan('CHECK_OUT')}>
              <LogOut size={17} /> Check out
            </button>
          </div>
          {error && <div className="alert error">{error}</div>}
        </section>
        <section className={`panel result-panel ${result ? 'result-panel-animate' : ''}`}>
          <span className="eyebrow">Scan result</span>
          {result ? (
            <>
              <div className="result-state">
                <CheckCircle2 size={25} />
                <strong>{result.action === 'CHECK_IN' ? 'CHECK-IN SUCCESSFUL' : 'CHECK-OUT SUCCESSFUL'}</strong>
              </div>
              <h3>{result.visitor?.fullName}</h3>
              <p>{result.visitor?.visitorId}</p>
              <div className="result-meta">
                <span>
                  State <strong>{result.visitor?.visitState}</strong>
                </span>
                <span>
                  Gate <strong>{result.visitor?.gateIn || result.visitor?.gateOut || gateNumber}</strong>
                </span>
              </div>
            </>
          ) : (
            <Empty>Scan a pass to see the verified visitor state.</Empty>
          )}
        </section>
      </div>
    </>
  );
}

function GateHistory() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const load = () => {
    api
      .get('/gate/status')
      .then((r) => setData(unwrap(r)))
      .catch((e) => setError(messageFor(e)));
  };

  useEffect(() => {
    load();
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('gate:event', load);
    socket.on('kpi:update', load);
    return () => socket.disconnect();
  }, []);
  return (
    <>
      <PageIntro eyebrow="Security operations" title="Gate history">
        <span>Recent activity returned by the gate status service.</span>
      </PageIntro>
      {error && <div className="alert error">{error}</div>}
      <section className="panel">
        <div className="panel-heading">
          <h3>Currently inside: {data?.currentlyInside ?? '-'}</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Visitor</th>
                <th>Action</th>
                <th>Security user</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentScans || []).map((log) => (
                <tr key={log._id}>
                  <td>
                    <strong>{log.visitorId?.fullName || 'Verified Person'}</strong>
                    <small>{log.visitorId?.visitorId}</small>
                  </td>
                  <td>
                    <Status value={log.action} />
                  </td>
                  <td>{log.scannedBy?.employeeId || '-'}</td>
                  <td>{formatDate(log.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.recentScans?.length && <Empty />}
        </div>
      </section>
    </>
  );
}

function Emergency() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = () => {
    setRefreshing(true);
    return api
      .get('/dashboard/emergency/rollcall')
      .then((r) => setData(r.data))
      .catch((e) => setError(messageFor(e)))
      .finally(() => {
        setTimeout(() => setRefreshing(false), 450);
      });
  };

  useEffect(() => {
    load();
    const socket = io(window.location.origin, { transports: ['websocket'] });
    socket.on('gate:event', load);
    return () => socket.disconnect();
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="Safety response"
        title="Emergency roll call"
        action={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="secondary-button" onClick={() => window.print()}>
              <Printer size={16} /> Print roll call
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={load}
              disabled={refreshing}
              title="Refresh evacuation headcount"
            >
              <Activity size={16} style={{ color: '#0d6975' }} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        }
      >
        <span>Live list of visitors currently marked inside the facility premises for disaster evacuation.</span>
      </PageIntro>
      {error && <div className="alert error">{error}</div>}

      <div className="emergency-banner">
        <div className="emergency-beacon">
          <AlertTriangle size={24} />
        </div>
        <div>
          <strong style={{ fontSize: '0.92rem', letterSpacing: '0.04em', display: 'block' }}>
            CRITICAL SAFETY ROLL CALL & FACILITY EVACUATION MONITOR
          </strong>
          <p style={{ fontSize: '0.76rem', color: '#fecaca', marginTop: '0.2rem' }}>
            Live real-time headcount synchronized with security gates and facility turnstiles.
          </p>
        </div>
      </div>

      <div className="stats-grid">
        <Stat label="People inside" value={data?.totalInside} detail="Current active presence" icon={Users} accent="red" index={0} />
      </div>
      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Host</th>
                <th>Gate</th>
                <th>Entry time</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {(data?.data || []).map((person) => (
                <tr key={person._id}>
                  <td>
                    <strong>{person.fullName}</strong>
                    <small>{person.visitorId}</small>
                  </td>
                  <td>{person.hostEmployeeId?.employeeId || person.host || '-'}</td>
                  <td>{person.gateIn || '-'}</td>
                  <td>{formatDate(person.checkedInAt)}</td>
                  <td>{person.departmentId?.location || person.location || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.data?.length && <Empty>Everyone is accounted for.</Empty>}
        </div>
      </section>
    </>
  );
}

function Directory({ type }) {
  const [items, setItems] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const isUsers = type === 'users';
  const endpoint = isUsers ? '/users' : '/departments';

  const [deptForm, setDeptForm] = useState({
    code: '',
    name: '',
    location: '',
    type: 'MINE',
    contactNumber: ''
  });

  const [userForm, setUserForm] = useState({
    employeeId: '',
    role: 'EMPLOYEE',
    departmentId: '',
    password: 'Password@123'
  });

  const load = () => {
    api
      .get(endpoint)
      .then((r) => setItems(unwrap(r) || []))
      .catch((e) => setError(messageFor(e)));

    if (isUsers) {
      api.get('/departments').then((r) => setDepartments(unwrap(r) || [])).catch(() => {});
    }
  };

  useEffect(() => {
    load();
    setShowAdd(false);
    setError('');
  }, [endpoint]);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/departments', deptForm);
      setShowAdd(false);
      setDeptForm({ code: '', name: '', location: '', type: 'MINE', contactNumber: '' });
      load();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/users', userForm);
      setShowAdd(false);
      setUserForm({ employeeId: '', role: 'EMPLOYEE', departmentId: '', password: 'Password@123' });
      load();
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageIntro
        eyebrow="Administration"
        title={isUsers ? 'Users' : 'Departments'}
        action={
          <button className="primary-button" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} /> {showAdd ? 'Close' : isUsers ? 'Add user' : 'Add department'}
          </button>
        }
      >
        <span>Directory view populated from Central Coalfields Limited database.</span>
      </PageIntro>

      {error && <div className="alert error">{error}</div>}

      {showAdd && (
        <section className="panel panel-expand-animate" style={{ marginBottom: '1.2rem', border: '1px solid #0d6975', boxShadow: '0 8px 20px -4px rgba(13, 105, 117, 0.15)' }}>
          <div className="panel-heading">
            <h3>{isUsers ? 'Add New User / Employee' : 'Add New Department'}</h3>
          </div>
          {isUsers ? (
            <form onSubmit={handleCreateUser} className="form-grid">
              <label>
                Employee ID
                <input
                  required
                  placeholder="e.g. EMP-SEC02"
                  value={userForm.employeeId}
                  onChange={(e) => setUserForm({ ...userForm, employeeId: e.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="EMPLOYEE">EMPLOYEE (Host)</option>
                  <option value="SECURITY">SECURITY (Gate Officer)</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                </select>
              </label>
              <label>
                Department
                <select
                  value={userForm.departmentId}
                  onChange={(e) => setUserForm({ ...userForm, departmentId: e.target.value })}
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                />
              </label>
              <div className="form-actions wide">
                <button type="button" className="secondary-button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCreateDept} className="form-grid">
              <label>
                Department Code
                <input
                  required
                  placeholder="e.g. MN-PIPAR"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                />
              </label>
              <label>
                Department Name
                <input
                  required
                  placeholder="e.g. Piparwar Open Cast Project"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                />
              </label>
              <label>
                Location
                <input
                  required
                  placeholder="e.g. Piparwar Area, Chatra"
                  value={deptForm.location}
                  onChange={(e) => setDeptForm({ ...deptForm, location: e.target.value })}
                />
              </label>
              <label>
                Facility Type
                <select
                  value={deptForm.type}
                  onChange={(e) => setDeptForm({ ...deptForm, type: e.target.value })}
                >
                  <option value="MINE">MINE</option>
                  <option value="HEADQUARTERS">HEADQUARTERS</option>
                  <option value="WORKSHOP">WORKSHOP</option>
                  <option value="REGIONAL">REGIONAL</option>
                </select>
              </label>
              <label className="wide">
                Contact Number
                <input
                  placeholder="e.g. 0654-250011"
                  value={deptForm.contactNumber}
                  onChange={(e) => setDeptForm({ ...deptForm, contactNumber: e.target.value })}
                />
              </label>
              <div className="form-actions wide">
                <button type="button" className="secondary-button" onClick={() => setShowAdd(false)}>
                  Cancel
                </button>
                <button className="primary-button" disabled={busy}>
                  {busy ? 'Creating...' : 'Create Department'}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      <section className="panel table-panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {isUsers ? (
                  <>
                    <th>Employee ID</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Last login</th>
                  </>
                ) : (
                  <>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th>Contact</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) =>
                isUsers ? (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.employeeId}</strong>
                    </td>
                    <td>
                      <Status value={item.role} />
                    </td>
                    <td>{item.departmentId?.code || item.departmentId?.name || '-'}</td>
                    <td>{formatDate(item.lastLoginAt)}</td>
                  </tr>
                ) : (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.code}</strong>
                    </td>
                    <td>{item.name}</td>
                    <td>{item.location}</td>
                    <td>{item.type}</td>
                    <td>{item.contactNumber || '-'}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
          {!items.length && <Empty />}
        </div>
      </section>
    </>
  );
}

function VisitorLookup() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const search = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get('/visitors/lookup', { params: { query: query.trim() } });
      setResult(unwrap(res));
      playAudioTone('checkin');
    } catch (err) {
      playAudioTone('reject');
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPrint = async () => {
    if (result) {
      triggerPrintBadge('printable-pass');
      return;
    }
    if (!query.trim()) {
      setError('Please enter your Mobile number, Visitor ID, or Passcode to view and print badge.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await api.get('/visitors/lookup', { params: { query: query.trim() } });
      const data = unwrap(res);
      setResult(data);
      playAudioTone('checkin');
      setTimeout(() => {
        triggerPrintBadge('printable-pass');
      }, 350);
    } catch (err) {
      setError(messageFor(err));
      playAudioTone('reject');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-visual">
        <div className="login-kicker">CCL / SELF-SERVICE KIOSK</div>
        <h1>
          Instant pass
          <br />
          <em>verification.</em>
        </h1>
        <p>Check approval status, verify security access, or print your digital QR entry badge.</p>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.8rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', padding: '0.35rem 0.65rem', borderRadius: '4px', color: '#e2b34a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={13} /> Real-Time Gate Sync
          </span>
          <button
            type="button"
            onClick={handleQuickPrint}
            style={{
              fontSize: '0.72rem',
              background: 'rgba(226, 179, 74, 0.18)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(226, 179, 74, 0.45)',
              padding: '0.35rem 0.65rem',
              borderRadius: '4px',
              color: '#fef08a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
              fontWeight: 700
            }}
            title="Instant 1-Click Pass Badge Generator & Printer"
          >
            <Printer size={13} /> 1-Click Printable Badge
          </button>
        </div>
        <div className="login-rule" />
      </div>

      <div className="login-panel">
        <div className="brand">
          <img
            src="/ccl_security_emblem.jpg"
            alt="CCL Emblem"
            style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2b34a' }}
          />
          <div>
            <strong>DVMS</strong>
            <span>Visitor Self-Service Kiosk</span>
          </div>
        </div>

        <div className="login-copy">
          <span className="eyebrow">Pass lookup</span>
          <h2>Find your pass</h2>
          <p>Enter your Mobile number, Visitor ID, or 6-digit passcode.</p>
        </div>

        <form onSubmit={search} className="form-stack">
          <label>
            Mobile / Visitor ID / Passcode
            <input
              required
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 9876543210 or CCL-V-2026-00018"
            />
          </label>
          <button className="primary-button" disabled={busy}>
            {busy ? 'Searching...' : 'Check pass status'} <ArrowRight size={17} />
          </button>
        </form>

        {error && <div className="alert error" style={{ marginTop: '1rem' }}>{error}</div>}

        {result && (
          <div className="panel holographic-card" style={{ marginTop: '1.5rem', border: '1px solid #cbd5e1' }} id="printable-pass">
            <div className="hologram-stripe" />
            <div className="panel-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <img
                src="/ccl_security_emblem.jpg"
                alt="CCL"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #e2b34a', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span className="eyebrow">Visitor pass</span>
                <h3>{result.visitor?.fullName}</h3>
                <small style={{ color: '#64748b' }}>{result.visitor?.visitorId}</small>
              </div>
              <Status value={result.visitor?.status} />
            </div>

            <div style={{ textAlign: 'center', margin: '1rem 0' }}>
              {result.visitor?.photoUrl && (
                <img
                  src={result.visitor?.photoUrl}
                  alt={result.visitor?.fullName}
                  style={{
                    width: '85px',
                    height: '85px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    margin: '0 auto 0.8rem',
                    border: '2px solid #0d6975'
                  }}
                />
              )}
              {result.qrDataUri && (
                <img src={result.qrDataUri} alt="Visitor QR" style={{ width: '180px', height: '180px', margin: '0 auto' }} />
              )}
              <div style={{ fontSize: '1.4rem', fontWeight: 'bold', letterSpacing: '0.1em', marginTop: '0.5rem', color: '#0f172a' }}>
                {result.visitor?.passCode}
              </div>
              <small style={{ color: '#64748b' }}>6-Digit Gate Code</small>
            </div>

            <div className="detail-list" style={{ fontSize: '0.8rem' }}>
              <div><span>Host</span><strong>{result.visitor?.host || '-'}</strong></div>
              <div><span>Department</span><strong>{result.visitor?.department || '-'}</strong></div>
              <div><span>Visit Date</span><strong>{formatDate(result.visitor?.visitDate)}</strong></div>
              <div><span>Current State</span><strong>{result.visitor?.visitState}</strong></div>
              <div><span>Valid Until</span><strong>{formatDate(result.visitor?.expiresAt)}</strong></div>
            </div>

            <button
              type="button"
              className="primary-button no-print"
              style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
              onClick={() => triggerPrintBadge('printable-pass')}
            >
              <Printer size={16} /> 1-Click Print Badge
            </button>
          </div>
        )}

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
          <Link to="/login" style={{ color: '#0d6975', fontWeight: '600' }}>
            &larr; Back to Employee Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function Unauthorized() {
  return (
    <div className="center-state">
      <ShieldCheck size={38} />
      <h2>Access restricted</h2>
      <p>Your role is not authorized for this workspace.</p>
      <Link className="primary-button" to="/dashboard">
        Return to dashboard
      </Link>
    </div>
  );
}

function Profile({ auth }) {
  return (
    <>
      <PageIntro eyebrow="Identity" title="Profile">
        <span>Authenticated account details.</span>
      </PageIntro>
      <section className="panel detail-list">
        <div>
          <span>Employee ID</span>
          <strong>{auth.user?.employeeId}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>{auth.user?.role}</strong>
        </div>
        <div>
          <span>User ID</span>
          <strong>{auth.user?.id}</strong>
        </div>
      </section>
    </>
  );
}

function RoleHome({ auth }) {
  return <Navigate to={auth.user?.role === 'EMPLOYEE' ? '/approvals' : '/dashboard'} replace />;
}

export default function App() {
  const auth = useAuth();
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login auth={auth} />} />
        <Route path="/lookup" element={<VisitorLookup />} />
        <Route path="/kiosk" element={<VisitorLookup />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Main Authenticated Layout with Original Sidebar & Topbar */}
        <Route element={<Protected auth={auth} />}>
          <Route index element={<RoleHome auth={auth} />} />
          <Route path="profile" element={<Profile auth={auth} />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="visitors" element={<Visitors />} />
          <Route path="visitors/new" element={<RegisterVisitor />} />
          <Route path="visitors/:id" element={<VisitorDetail />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="gate-history" element={<GateHistory />} />
          <Route path="emergency" element={<Emergency />} />
          <Route path="users" element={<Directory type="users" />} />
          <Route path="departments" element={<Directory type="departments" />} />
          <Route path="lookup" element={<VisitorLookup />} />

          {/* Seamless Aliases for Convenience */}
          <Route path="security" element={<Scanner />} />
          <Route path="employee" element={<Approvals />} />
          <Route path="visitor" element={<Visitors />} />
        </Route>

        <Route path="*" element={<RoleHome auth={auth} />} />
      </Routes>
    </BrowserRouter>
  );
}