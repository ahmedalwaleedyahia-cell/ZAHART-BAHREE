// ============================================================
// src/context/SettingsContext.jsx
// Restaurant settings — fetched once, synced via realtime
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { fetchSettings, updateSettings, subscribeToSettings } from '../services/settingsService.js'
import { supabase } from '../supabase/supabase.js'
import { useAuth } from './AuthContext.jsx'

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const { profile } = useAuth()
  const [settings, setSettings] = useState({
    name: ' BAHREE',
    name_ar: 'مطعم بحري',
    vat_rate: 5,
    currency: 'AED',
    receipt_footer: 'شكراً لزيارتكم! • Thank you for dining with us',
    address: 'Abu Dhabi, United Arab Emirates',
    phone: '+971 2 555 0100',
    trn: '100234567890003',
  })
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await fetchSettings()
    if (data) setSettings(data)
    setLoading(false)
  }, [])

  useEffect(() => { if (profile) load() }, [profile, load])

  useEffect(() => {
    if (!profile) return
    const channel = subscribeToSettings((updated) => setSettings(updated))
    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const save = useCallback(async (updates) => {
    const { data, error } = await updateSettings(updates)
    if (!error && data) setSettings(data)
    return { error }
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading, save, reload: load }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}
