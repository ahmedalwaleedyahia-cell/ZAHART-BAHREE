import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef
} from 'react'

import { ENV_MISSING } from '../supabase/supabase.js'
import {
  signIn,
  signOut,
  signUp,
  getSession,
  onAuthStateChange,
} from '../services/authService.js'

const AuthContext = createContext(null)

/* ───────────────────────── TIMEOUT WRAPPER ───────────────────────── */
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), ms)
    ),
  ])
}

/* ───────────────────────── PROVIDER ───────────────────────── */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState(null)

  const mountedRef = useRef(true)
  const isLoggingInRef = useRef(false)

  /* ───────────────────────── BOOTSTRAP ───────────────────────── */
  useEffect(() => {
    mountedRef.current = true

    const bootstrap = async () => {
      if (ENV_MISSING) {
        setAuthError('Missing Supabase env vars')
        setLoading(false)
        return
      }

      try {
        const session = await withTimeout(getSession(), 8000)

        if (!mountedRef.current) return

        setUser(session?.user ?? null)
        setProfile(session?.profile ?? null)

      } catch (err) {
        console.log('bootstrap error:', err.message)
      } finally {
        if (mountedRef.current) setLoading(false)
      }
    }

    bootstrap()

    /* ───────────────────────── AUTH LISTENER ───────────────────────── */
    const { data } = onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return

      switch (event) {

        case 'SIGNED_IN': {
          // يمنع تسجيل الدخول التلقائي من signUp
          if (isLoggingInRef.current) {
            isLoggingInRef.current = false
            return
          }

          setUser(session?.user ?? null)

          const sessionData = await getSession()
          if (!mountedRef.current) return

          setProfile(sessionData?.profile ?? null)
          return
        }

        case 'SIGNED_OUT': {
          setUser(null)
          setProfile(null)
          return
        }

        case 'TOKEN_REFRESHED': {
          setUser(session?.user ?? null)
          return
        }

        default:
          return
      }
    })

    /* ───────────────────────── CLEANUP ───────────────────────── */
    return () => {
      mountedRef.current = false
      data?.subscription?.unsubscribe?.()
    }

  }, [])

  /* ───────────────────────── LOGIN ───────────────────────── */
  const login = useCallback(async (email, password) => {
    try {
      isLoggingInRef.current = true

      const result = await withTimeout(signIn(email, password), 10000)

      if (result.error) {
        isLoggingInRef.current = false
        return { success: false, error: result.error }
      }

      setUser(result.user ?? null)
      setProfile(result.profile ?? null)

      return { success: true }

    } catch (err) {
      isLoggingInRef.current = false
      return {
        success: false,
        error: err.message || 'Login error'
      }
    }
  }, [])

  /* ───────────────────────── REGISTER ───────────────────────── */
  const register = useCallback(async (payload) => {
    try {
      const res = await signUp(payload)

      if (res?.error) {
        return { success: false, error: res.error }
      }

      return {
        success: true,
        needsConfirmation: true
      }

    } catch (err) {
      return {
        success: false,
        error: err.message || 'Register error'
      }
    }
  }, [])

  /* ───────────────────────── LOGOUT ───────────────────────── */
  const logout = useCallback(async () => {
    await signOut()
    setUser(null)
    setProfile(null)
  }, [])

  /* ───────────────────────── FLAGS ───────────────────────── */
  const isLoggedIn = !!user
  const isAdmin = profile?.role === 'admin'
  const isCashier = profile?.role === 'cashier'

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      authError,
      isLoggedIn,
      isAdmin,
      isCashier,
      login,
      register,
      logout,
      setProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

/* ───────────────────────── HOOK ───────────────────────── */
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}