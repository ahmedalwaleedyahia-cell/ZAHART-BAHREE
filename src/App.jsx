import { useState, useEffect } from 'react'
import {
  Eye, EyeOff, Sun, Moon, Power, UserPlus, LogIn,
  ChevronRight, X, AlertTriangle, CheckCircle, Info,
} from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { useTheme } from './context/ThemeContext.jsx'
import { ProductsProvider } from './context/ProductsContext.jsx'
import { OrdersProvider } from './context/OrdersContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import MainApp from './layout/MainApp.jsx'
import BrandWordmark from './components/ui/BrandWordmark.jsx'
import FinancePage from './pages/FinancePage.jsx'

// ─────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  )
}

function AppShell() {
  const { isLoggedIn, loading, authError } = useAuth()
  const [authView, setAuthView] = useState('login')

  if (authError) return <SetupError message={authError} />
  if (loading) return <Splash />

  if (!isLoggedIn) return authView === 'create-admin'
    ? <RegisterScreen onGoLogin={() => setAuthView('login')} />
    : <LoginScreen onGoRegister={() => setAuthView('create-admin')} />

  return (
    <SettingsProvider>
      <ProductsProvider>
        <OrdersProvider>
          <MainApp />
        </OrdersProvider>
      </ProductsProvider>
    </SettingsProvider>
  )
}

// ─────────────────────────────────────────────────────────────
// SETUP ERROR
// ─────────────────────────────────────────────────────────────
function SetupError({ message }) {
  return (
    <div className="setup-error">
      <div className="setup-error-box">
        <div className="setup-error-icon">
          <AlertTriangle size={22} color="var(--red)" />
        </div>
        <BrandWordmark style={{ marginBottom: 16 }} />
        <h2 style={{ color: '#F0F0EC', fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
          Setup Required
        </h2>
        <pre style={{
          color: 'rgba(240,240,236,0.65)', fontSize: 12, lineHeight: 1.8,
          background: 'rgba(255,255,255,0.04)', padding: '12px 14px',
          border: '1px solid rgba(255,255,255,0.07)',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 20,
        }}>
          {message}
        </pre>
        <p style={{ color: 'rgba(240,240,236,0.4)', fontSize: 12, lineHeight: 1.7 }}>
          Edit{' '}
          <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px' }}>.env.local</code>
          {' '}then restart{' '}
          <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px' }}>npm run dev</code>.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SPLASH
// ─────────────────────────────────────────────────────────────
function Splash() {
  return (
    <div className="splash flex items-center justify-center min-h-screen w-full">
      <BrandWordmark size="lg" />
      <div className="splash-spinner" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// SHARED AUTH BACKGROUND
// ─────────────────────────────────────────────────────────────
function AuthBg({ isDark, children }) {
  return (
    <div className={`lp-root ${isDark ? 'lp-dark' : 'lp-light'}`}>
      <div className="lp-bg">
        <div className="lp-bg-glow lp-bg-glow-1" />
        <div className="lp-bg-glow lp-bg-glow-2" />
        <div className="lp-bg-glow lp-bg-glow-3" />
        <div className="lp-bg-grid" />
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// THEME CAPSULE
// ─────────────────────────────────────────────────────────────
function ThemeBtn({ isDark, onToggle }) {
  return (
    <button
      className={`theme-capsule theme-capsule-float ${isDark ? 'theme-capsule-dark' : 'theme-capsule-light'}`}
      onClick={onToggle}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle theme"
      role="switch"
      aria-checked={!isDark}
    >
      <span className="theme-capsule-track">
        <span className="theme-capsule-knob">
          {isDark
            ? <Moon size={11} strokeWidth={2.5} />
            : <Sun size={11} strokeWidth={2.5} />}
        </span>
        <span className="theme-capsule-sun"><Sun size={10} strokeWidth={2} /></span>
        <span className="theme-capsule-moon"><Moon size={10} strokeWidth={2} /></span>
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// PASSWORD INPUT
// ─────────────────────────────────────────────────────────────
function PasswordInput({
  id,
  value,
  onChange,
  placeholder = '••••••••',
  autoComplete = 'current-password',
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="lp-input-wrap">
      <input
        id={id}
        className="lp-input lp-input-padded"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        dir="ltr"
      />
      <button
        type="button"
        className="lp-eye-btn"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        <span className="lp-eye-icon">
          {show
            ? <EyeOff size={15} strokeWidth={1.8} />
            : <Eye size={15} strokeWidth={1.8} />}
        </span>
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────
function LoginScreen({ onGoRegister }) {
  const { login } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('البريد الإلكتروني وكلمة المرور مطلوبان')
      return
    }
    setError('')
    setLoading(true)
    const { success, error: err } = await login(email, password)

    if (!success) {
      const errorMessage = err?.message || (typeof err === 'string' ? err : 'بيانات الدخول غير صحيحة أو الحساب غير موجود');
      setError(errorMessage)
    }
    setLoading(false)
  }

  return (
    <AuthBg isDark={isDark}>
      <div className="lp-card">
        <div className="lp-card-border" />
        <div className="lp-auth-controls">
          <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        </div>

        <div className="lp-brand" dir="rtl">
          <BrandWordmark style={{ margin: '0 auto 16px', fontFamily: '"Cinzel", "Playfair Display", serif', }} />
          <h1 className="lp-title">تسجيل الدخول</h1>
          <p className="lp-subtitle">ZAHART BAHREE · POS</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="lp-form" dir="rtl">
          {error && (
            <div className="lp-error" role="alert">
              <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div className="lp-field">
            <label className="lp-label" htmlFor="login-email">البريد الإلكتروني</label>
            <div className="lp-input-wrap">
              <input
                className="lp-input"
                type="email"
                id="login-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                autoFocus
                autoComplete="email"
                dir="ltr"
              />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label" htmlFor="login-password">
              كلمة المرور
            </label>
            <PasswordInput
              id="login-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button className="lp-submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="lp-submit-loading" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                جارٍ الدخول…
                <span className="lp-spinner" />
              </span>
            ) : (
              <span className="lp-submit-label">
                <LogIn size={15} strokeWidth={2} />
                دخول
                <span className="lp-submit-arrow" />
              </span>
            )}
          </button>
        </form>

        <div className="lp-switch" dir="rtl">
          <span className="lp-switch-text">مدير جديد؟</span>
          <button className="lp-switch-btn" type="button" onClick={onGoRegister}>
            إنشاء حساب مدير
            <ChevronRight size={13} strokeWidth={2.5} style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      </div>
    </AuthBg>
  )
}

// ─────────────────────────────────────────────────────────────
// REGISTER SCREEN
// ─────────────────────────────────────────────────────────────
function RegisterScreen({ onGoLogin }) {
  const { register } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  function validate() {
    if (!fullName.trim()) return 'الاسم الكامل مطلوب'
    if (!email.trim()) return 'البريد الإلكتروني مطلوب'
    if (!/\S+@\S+\.\S+/.test(email.trim())) return 'صيغة البريد الإلكتروني غير صحيحة'
    if (password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'
    if (password !== confirm) return 'كلمتا المرور غير متطابقتين'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validErr = validate()
    if (validErr) { setError(validErr); return }
    setError('')
    setLoading(true)
    const result = await register({ fullName, email, password, role: 'admin' })
    setLoading(false)

    if (result.error) {
      const regError = result.error?.message || (typeof result.error === 'string' ? result.error : 'فشل إنشاء الحساب');
      setError(regError);
      return
    }
    if (result.needsConfirmation) { setNeedsConfirmation(true); return }
  }

  if (needsConfirmation) {
    return (
      <AuthBg isDark={isDark}>
        <div className="lp-card" style={{ textAlign: 'center' }}>
          <div className="lp-auth-controls">
            <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
          </div>
          <div className="lp-card-border" />
          <div className="reg-success-icon">
            <CheckCircle size={28} color="var(--green)" strokeWidth={1.8} />
          </div>
          <h2 className="lp-title" style={{ fontSize: 22, marginBottom: 8 }}>تم إنشاء الحساب!</h2>
          <p className="lp-subtitle" style={{ marginBottom: 24, lineHeight: 1.8 }}>
            تحقق من بريدك الإلكتروني لتأكيد حسابك<br />ثم سجّل دخولك.
          </p>
          <button className="lp-submit" onClick={onGoLogin}>
            <span className="lp-submit-label">
              <LogIn size={15} strokeWidth={2} /> تسجيل الدخول
            </span>
          </button>
        </div>
      </AuthBg>
    )
  }

  return (
    <AuthBg isDark={isDark}>
      <div className="lp-card lp-card-tall">
        <div className="lp-auth-controls">
          <ThemeBtn isDark={isDark} onToggle={toggleTheme} />
        </div>
        <div className="lp-card-border" />

        <div className="lp-brand" dir="rtl">
          <BrandWordmark style={{ margin: '0 auto 16px', fontFamily: '"Cinzel", "Playfair Display", serif', }} />
          <h1 className="lp-title">إنشاء حساب جديد</h1>
          <p className="lp-subtitle">ZAHART BAHREE · POS</p>
        </div>

        <div className="reg-admin-badge" dir="rtl">
          <div>
            <div className="reg-admin-label">إنشاء حساب مدير</div>
            <div className="reg-admin-sub">يتم إنشاء حسابات الكاشير من داخل لوحة الإدارة</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="lp-form" dir="rtl">
          {error && (
            <div className="lp-error" role="alert">
              <AlertTriangle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div className="lp-field">
            <label className="lp-label">الاسم الكامل</label>
            <div className="lp-input-wrap">
              <input
                className="lp-input"
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="محمد الراشد"
                autoFocus
                autoComplete="name"
                dir="rtl"
              />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">البريد الإلكتروني</label>
            <div className="lp-input-wrap">
              <input
                className="lp-input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@gmail.com"
                autoComplete="email"
                dir="ltr"
              />
            </div>
          </div>

          <div className="lp-field">
            <label className="lp-label">كلمة المرور</label>
            <PasswordInput
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="8 أحرف على الأقل"
              autoComplete="new-password"
            />
          </div>

          <div className="lp-field">
            <label className="lp-label">تأكيد كلمة المرور</label>
            <PasswordInput
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="أعد كتابة كلمة المرور"
              autoComplete="new-password"
            />
          </div>

          <button className="lp-submit" type="submit" disabled={loading}>
            {loading
              ? (
                <span className="lp-submit-loading">
                  <span className="lp-spinner" />جارٍ الإنشاء...
                </span>
              ) : (
                <span className="lp-submit-label">
                  <UserPlus size={15} strokeWidth={2} />إنشاء الحساب
                </span>
              )}
          </button>
        </form>

        <div className="lp-switch" dir="rtl">
          <span className="lp-switch-text">لديك حساب بالفعل؟</span>
          <button className="lp-switch-btn" type="button" onClick={onGoLogin}>
            تسجيل الدخول
            <ChevronRight size={13} strokeWidth={2.5} style={{ transform: 'scaleX(-1)' }} />
          </button>
        </div>
      </div>
    </AuthBg>
  )
}

// ─────────────────────────────────────────────────────────────
// LOGOUT MODAL
// ─────────────────────────────────────────────────────────────
export function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="logout-overlay" role="dialog" aria-modal="true">
      <div className="logout-modal">
        <div className="logout-power-ring">
          <Power size={26} strokeWidth={1.8} />
        </div>
        <h3 className="logout-title">تسجيل الخروج</h3>
        <p className="logout-sub">هل أنت متأكد أنك تريد تسجيل الخروج من Zahrat Bahary.pos؟</p>
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

// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
export function Toast({ msg, type }) {
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

// ─────────────────────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────────────────────
export function Clock() {
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