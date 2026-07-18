import { createClient } from '@supabase/supabase-js'

// ============================================================
// ENV (IMPORTANT: no fallback in production)
// ============================================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const ENV_MISSING = !supabaseUrl || !supabaseAnonKey

if (ENV_MISSING) {
  console.error(
    '[Zahra.pos] Missing Supabase environment variables.\n' +
    'Add to .env.local:\n' +
    'VITE_SUPABASE_URL\n' +
    'VITE_SUPABASE_ANON_KEY'
  )
}

// ============================================================
// SAFE CLIENT INIT
// ============================================================
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'zahra-pos-auth',
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
    global: {
      headers: {
        'x-application-name': 'zahra-pos',
      },
    },
  }
)

// ============================================================
// CONSTANTS
// ============================================================
export const TABLES = {
  PROFILES: 'profiles',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  SETTINGS: 'restaurant_settings',
}

export const VIEWS = {
  DAILY_SALES: 'v_daily_sales',
  BEST_SELLERS: 'v_best_sellers',
  HOURLY_SALES: 'v_hourly_sales',
}

export const BUCKETS = {
  PRODUCT_IMAGES: 'product-images',
  LOGOS: 'restaurant-assets',
}

// default export (optional safety)
export default supabase