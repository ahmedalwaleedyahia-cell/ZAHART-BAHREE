// ============================================================
// src/services/settingsService.js
// Restaurant settings — read + update
// ============================================================

import { supabase, TABLES } from '../supabase/supabase.js'

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001'

export async function fetchSettings() {
  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .select('*')
    .eq('id', SETTINGS_ID)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function updateSettings(updates) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from(TABLES.SETTINGS)
    .update({ ...updates, updated_by: user?.id })
    .eq('id', SETTINGS_ID)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export function subscribeToSettings(onChange) {
  return supabase
    .channel('settings-changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLES.SETTINGS },
      (payload) => onChange?.(payload.new)
    )
    .subscribe()
}
