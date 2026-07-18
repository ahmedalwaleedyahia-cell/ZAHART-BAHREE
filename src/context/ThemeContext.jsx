// ============================================================
// src/context/ThemeContext.jsx
// Single source of truth for the app's dark / light theme.
//
// • Reads initial value from localStorage ('zahra-theme')
// • Writes data-theme attribute on <html> whenever it changes
// • Persists choice back to localStorage
// • One context — all components share the same state
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY  = 'zahra-theme'
const DARK_VALUE   = 'dark'
const LIGHT_VALUE  = 'light'
const DEFAULT      = DARK_VALUE   // app boots in dark mode if no pref saved

function readStored() {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === LIGHT_VALUE ? LIGHT_VALUE : DARK_VALUE
  } catch {
    return DEFAULT
  }
}

function applyToDOM(theme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    const stored = readStored()
    // Apply immediately so there is no flash before first render
    applyToDOM(stored)
    return stored
  })

  // Keep the DOM attribute in sync whenever theme changes
  useEffect(() => {
    applyToDOM(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch { /* storage blocked */ }
  }, [theme])

  const toggle = useCallback(() => {
    setThemeState(t => t === DARK_VALUE ? LIGHT_VALUE : DARK_VALUE)
  }, [])

  const setDark  = useCallback(() => setThemeState(DARK_VALUE),  [])
  const setLight = useCallback(() => setThemeState(LIGHT_VALUE), [])

  const isDark  = theme === DARK_VALUE
  const isLight = theme === LIGHT_VALUE

  return (
    <ThemeContext.Provider value={{ theme, isDark, isLight, toggle, setDark, setLight }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
