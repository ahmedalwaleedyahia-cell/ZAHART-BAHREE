import { supabase } from '../supabase/supabase.js'

/* ───────────────────────── SESSION ───────────────────────── */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) {
    return { user: null, profile: null }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  if (error) {
    console.error('getSession profile error:', error.message)
  }

  return {
    user: session.user,
    profile: profile ?? null,
  }
}

/* ───────────────────────── AUTH LISTENER (FIXED) ───────────────────────── */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })

  return data  
}

/* ───────────────────────── LOGIN ───────────────────────── */
export async function login({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { user: null, profile: null, error: error.message }
    }

    const user = data?.user

    if (!user) {
      return { user: null, profile: null, error: 'No user returned' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    return {
      user,
      profile: profile ?? null,
      error: null,
    }

  } catch (err) {
    return {
      user: null,
      profile: null,
      error: err.message,
    }
  }
}

export const signIn = (email, password) =>
  login({ email, password })

/* ───────────────────────── LOGOUT ───────────────────────── */
export async function logout() {
  const { error } = await supabase.auth.signOut()
  return { error: error?.message || null }
}

export const signOut = logout

/* ───────────────────────── SIGN UP (ADMIN) ───────────────────────── */
export async function signUp({ email, password, fullName }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'admin' 
        }
      }
    })

    if (error) return { data: null, error: error.message }
    return { data, error: null }

  } catch (err) {
    return { data: null, error: err.message }
  }
}

/* ───────────────────────── CREATE CASHIER (UPDATED) ───────────────────────── */
export async function createCashierAccount({
  fullName,
  email,
  password,
}) {
  try {
    const { data: functionData, error: functionError } = await supabase.functions.invoke('create-cashier', {
      body: { email, password, fullName },
    })

    if (functionError) {
      const errMessage = functionError.message || 'Failed to create cashier via server';
      return { data: null, error: errMessage }
    }

    return { data: functionData?.data || functionData, error: null }

  } catch (err) {
    console.error('Create cashier error:', err)
    return { data: null, error: err.message }
  }
}

/* ───────────────────────── FETCH PROFILES ───────────────────────── */
export async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('PROFILES ERROR:', error)
    return { data: [], error: error.message }
  }

  return { data: data ?? [], error: null }
}

/* ───────────────────────── DEACTIVATE ───────────────────────── */
export async function deactivateUser(id) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle()

  return {
    data,
    error: error?.message || null,
  }
}