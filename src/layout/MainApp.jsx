// ============================================================
// src/components/MainApp.jsx
// Main Application Shell — State-Based Routing
// ============================================================

import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, ShoppingCart, Users, BarChart3, Menu,
  ClipboardList, UtensilsCrossed, Settings, Power,
  Sun, Moon, CheckCircle, AlertTriangle, Info, X,
  Wallet, // ── تم إضافة أيقونة المحفظة للإدارة المالية ──
} from 'lucide-react'
import PosPage from '../pages/PosPage'
import DashboardPage from '../pages/DashboardPage'
import ProductsPage from '../pages/ProductsPage'
import OrdersPage from '../pages/OrdersPage'
import UsersPage from '../pages/UsersPage'
import SettingsPage from '../pages/SettingsPage'
import AnalyticsPage from '../pages/AnalyticsPage'
import FinancePage from '../pages/FinancePage'

// ── Navigation config ────────────────────────────────────────
const ADMIN_NAV = [
  {
    group: 'Overview', items: [
      { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
      { id: 'analytics', label: 'Analytics', Icon: BarChart3 },
    ]
  },
  {
    group: 'Management', items: [
      { id: 'products', label: 'Products', Icon: UtensilsCrossed },
      { id: 'orders', label: 'Orders', Icon: ClipboardList },
      { id: 'finance', label: 'Finance', Icon: Wallet },
      { id: 'users', label: 'Users', Icon: Users },
    ]
  },
  {
    group: 'System', items: [
      { id: 'settings', label: 'Settings', Icon: Settings },
    ]
  },
]

const CASHIER_NAV = [
  {
    group: 'Cashier', items: [
      { id: 'pos', label: 'POS Terminal', Icon: ShoppingCart },
      { id: 'orders', label: 'My Orders', Icon: ClipboardList },
    ]
  },
]

// ── Clock (defined BEFORE MainApp so JSX reference works) ───
function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const i = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <div className="clock">
      {t.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit' })}
    </div>
  )
}

// ── Topbar theme toggle capsule ──────────────────────────────
function TopbarThemeToggle({ isDark, onToggle }) {
  return (
    <button
      className={`theme-capsule theme-capsule-topbar ${isDark ? 'theme-capsule-dark' : 'theme-capsule-light'}`}
      onClick={onToggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      role="switch"
      aria-checked={!isDark}
    >
      <span className="theme-capsule-track">
        <span className="theme-capsule-knob">
          {isDark
            ? <Moon size={10} strokeWidth={2.5} />
            : <Sun size={10} strokeWidth={2.5} />}
        </span>
        <span className="theme-capsule-sun" ><Sun size={9} strokeWidth={2} /></span>
        <span className="theme-capsule-moon"><Moon size={9} strokeWidth={2} /></span>
      </span>
    </button>
  )
}

// ── Logout modal ─────────────────────────────────────────────
function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="logout-overlay" role="dialog" aria-modal="true">
      <div className="logout-modal">
        <div className="logout-power-ring">
          <Power size={26} strokeWidth={1.8} />
        </div>
        <h3 className="logout-title">تسجيل الخروج؟</h3>
        <p className="logout-sub">هل أنت متأكد أنك تريد تسجيل الخروج من ZAHART BAHREE.pos؟</p>
        <div className="logout-actions">
          <button className="logout-btn-cancel" onClick={onCancel}>
            <X size={14} strokeWidth={2.5} />إلغاء
          </button>
          <button className="logout-btn-confirm" onClick={onConfirm}>
            <Power size={14} strokeWidth={2.5} />تأكيد الخروج
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Toast ────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const icons = {
    success: <CheckCircle size={15} strokeWidth={2} color="var(--green)" />,
    error: <AlertTriangle size={15} strokeWidth={2} color="var(--red)" />,
    info: <Info size={15} strokeWidth={2} color="var(--gold)" />,
  }
  return (
    <div className={`toast toast-${type}`}>
      {icons[type] || icons.info}
      <span>{msg}</span>
    </div>
  )
}

// ── Brand logo wordmark (تم حمايتها وتنسيقها بالذهبي الأصلي هنا) ──
function BrandWordmark() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
      <span
        className="brand-wordmark"
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          color: '#C9A96E',
          fontWeight: '700',
          fontSize: '18px',
          letterSpacing: '0.5px'
        }}
      >
        ZAHART BAHREE
      </span>
      <span
        className="brand-tagline"
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          color: 'var(--txt3)',
          fontSize: '12px',
          fontWeight: '500',
          opacity: 0.8,
          marginTop: '2px'
        }}
      >
        Abu Dhabi · POS
      </span>
    </div>
  )
}

// ── MAIN APP ─────────────────────────────────────────────────
export default function MainApp() {
  const { user, profile, isAdmin, logout, loading } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()

  // توحيد قراءة التخزين المحلي على activeView
  const [view, setView] = useState(() => {
    return localStorage.getItem('activeView') || 'pos'
  })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [logoutPending, setLogoutPending] = useState(false)

  // إنشاء متغير موحد للمالك
  const isOwner = isAdmin || user?.email === 'uhib1993@gmail.com'

  // تحسين الـ useEffect لتصبح أنظف ومباشرة
  useEffect(() => {
    if (loading || !profile) return

    const savedView = localStorage.getItem('activeView')
    if (savedView) {
      setView(savedView)
    } else {
      const defaultView = profile.role === 'admin' ? 'dashboard' : 'pos'
      setView(defaultView)
      localStorage.setItem('activeView', defaultView)
    }
  }, [profile, loading])

  const showToast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToast({ id, msg, type })
    setTimeout(() => setToast(t => t?.id === id ? null : t), 3200)
  }, [])

  // تحسين navigate باستخدام useCallback
  const navigate = useCallback((v) => {
    setView(v)
    localStorage.setItem('activeView', v)
    setSidebarOpen(false)
  }, [])

  // تحسين confirmLogout باستخدام useCallback
  const confirmLogout = useCallback(async () => {
    localStorage.removeItem('activeView')
    setLogoutPending(false)
    await logout()
  }, [logout])

  const VIEW_META = {
    dashboard: { title: 'Dashboard', sub: 'Your restaurant at a glance' },
    analytics: { title: 'Analytics', sub: 'Sales reports & revenue trends' },
    products: { title: 'Products', sub: 'Manage your menu in real-time' },
    orders: { title: 'Orders', sub: 'Full order history & receipts' },
    finance: { title: 'Finance Management', sub: 'Track salaries, expenses and calculate net profit' },
    users: { title: 'Users', sub: 'Staff account management' },
    settings: { title: 'Settings', sub: 'System configuration' },
    pos: { title: 'POS Terminal', sub: 'Point of Sale — Abu Dhabi' },
  }
  const { title, sub } = VIEW_META[view] || { title: 'ZAHART BAHREE', sub: '' }
  const navGroups = isOwner ? ADMIN_NAV : CASHIER_NAV

  return (
    <div className="app-root">
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <BrandWordmark />
        </div>

        <nav className="sidebar-nav">
          {navGroups.map(group => (
            <div key={group.group}>
              <span className="nav-section-label">{group.group}</span>
              {group.items.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  className={`nav-item ${view === id ? 'active' : ''}`}
                  onClick={() => navigate(id)}
                >
                  <span className="nav-icon">
                    <Icon size={15} strokeWidth={1.8} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip">
            <div className="user-avatar">
              {profile?.full_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="user-chip-info">
              <div className="user-name">{profile?.full_name || (user?.email === 'uhib1993@gmail.com' ? 'Suhib' : 'User')}</div>
              <div className="user-role">
                {isOwner ? 'Restaurant Owner' : 'Cashier'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="main-area">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            onClick={() => setSidebarOpen(o => !o)}
            aria-label="Toggle sidebar"
          >
            <Menu size={18} strokeWidth={2} />
          </button>

          <div className="topbar-info">
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>

          <div className="topbar-right">
            <div className="live-badge">
              <span className="live-dot" />
              <span className="live-label">Live</span>
            </div>

            <Clock />

            <TopbarThemeToggle isDark={isDark} onToggle={toggleTheme} />

            <button
              className="power-btn"
              onClick={() => setLogoutPending(true)}
              title="تسجيل الخروج"
              aria-label="Logout"
            >
              <Power size={15} strokeWidth={2} />
            </button>
          </div>
        </header>

        <main className="view-area">
          {view === 'dashboard' && <DashboardPage showToast={showToast} />}
          {view === 'analytics' && <AnalyticsPage showToast={showToast} />}
          {view === 'products' && <ProductsPage showToast={showToast} />}
          {view === 'orders' && <OrdersPage showToast={showToast} />}
          {view === 'finance' && <FinancePage showToast={showToast} />}
          {view === 'users' && <UsersPage showToast={showToast} />}
          {view === 'settings' && <SettingsPage showToast={showToast} />}
          {view === 'pos' && <PosPage showToast={showToast} />}
        </main>
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {logoutPending && (
        <LogoutModal onConfirm={confirmLogout} onCancel={() => setLogoutPending(false)} />
      )}
    </div>
  )
}