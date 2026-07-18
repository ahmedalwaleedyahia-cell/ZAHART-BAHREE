// ============================================================
// src/services/orderService.js
// Order operations + realtime + analytics + stock deduction
// ============================================================

import { supabase, TABLES, VIEWS } from '../supabase/supabase.js'

// ============================================================
// CREATE ORDER
// ============================================================

export async function createOrder(orderData, items) {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: order, error: orderError } = await supabase
    .from(TABLES.ORDERS)
    .insert({
      invoice_number: orderData.invoice_number, // هنا السحر! نرسل القيمة الفريدة المجهزة لتفادي خطأ الـ 409
      cashier_id: user?.id,
      cashier_name: orderData.cashierName,
      payment_method: orderData.paymentMethod,
      subtotal: orderData.subtotal,
      discount_pct: orderData.discountPct,
      discount_amount: orderData.discountAmount,
      vat_rate: orderData.vatRate,
      vat_amount: orderData.vatAmount,
      total_amount: orderData.totalAmount,
      cash_given: orderData.cashGiven || null,
      change_amount: orderData.changeAmount || null,
      notes: orderData.notes || null,
      status: 'completed',
    })
    .select()
    .single()

  if (orderError) return { data: null, error: orderError.message }

  const lineItems = items.map(item => ({
    order_id: order.id,
    product_id: item.product_id || null,
    product_name: item.product_name,
    product_emoji: item.product_emoji || '🍽️',
    unit_price: item.unit_price,
    quantity: item.quantity,
    line_total: item.unit_price * item.quantity,
    notes: item.notes || null,
  }))

  const { error: itemsError } = await supabase
    .from(TABLES.ORDER_ITEMS)
    .insert(lineItems)

  if (itemsError) {
    await supabase.from(TABLES.ORDERS).delete().eq('id', order.id)
    return { data: null, error: itemsError.message }
  }

  // ── Automatically Update Inventory Post-Sale ──
  for (const item of items) {
    if (!item.product_id) continue

    const { data: product } = await supabase
      .from(TABLES.PRODUCTS)
      .select('category_slug, inventory_enabled, current_stock, current_weight, pieces_per_packet, number_of_packets')
      .eq('id', item.product_id)
      .single()

    if (product && product.inventory_enabled) {
      if (product.category_slug === 'drinks') {
        const newStock = Math.max(0, (product.current_stock || 0) - item.quantity)
        const pieces = product.pieces_per_packet || 1
        const newPackets = Math.floor(newStock / pieces)

        await supabase
          .from(TABLES.PRODUCTS)
          .update({
            current_stock: newStock,
            number_of_packets: newPackets
          })
          .eq('id', item.product_id)
      } else if (product.category_slug === 'desserts') {
        const newWeight = Math.max(0, (product.current_weight || 0) - item.quantity)
        await supabase
          .from(TABLES.PRODUCTS)
          .update({ current_weight: newWeight })
          .eq('id', item.product_id)
      }
    }
  }

  return { data: order, error: null }
}

// ============================================================
// FETCH ORDERS
// ============================================================

export async function fetchOrders({
  limit = 50,
  offset = 0,
  status = null,
  cashierId = null,
  dateFrom = null,
  dateTo = null,
} = {}) {
  let query = supabase
    .from(TABLES.ORDERS)
    .select(`*, items:order_items(*)`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (cashierId) query = query.eq('cashier_id', cashierId)
  if (dateFrom) {
    query = query.gte('created_at', `${dateFrom}T00:00:00`)
  }
  if (dateTo) {
    query = query.lte('created_at', `${dateTo}T23:59:59`)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  return { data, error: null }
}

// ============================================================
// FETCH SINGLE ORDER
// ============================================================

export async function fetchOrder(id) {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`*, items:order_items(*)`)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

export async function updateOrderStatus(id, status) {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// DAILY SALES
// ============================================================

export async function fetchDailySales(days = 7, { dateFrom = null, dateTo = null } = {}) {
  let query = supabase
    .from(VIEWS.DAILY_SALES)
    .select('*')

  if (dateFrom && dateTo) {
    query = query.gte('sale_date', dateFrom).lte('sale_date', dateTo)
  } else {
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)
    query = query.gte('sale_date', fromDate.toISOString().split('T')[0])
  }

  const { data, error } = await query.order('sale_date', { ascending: true })

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

// ============================================================
// TODAY SUMMARY
// ============================================================
export async function fetchTodaySummary({ dateFrom = null, dateTo = null } = {}) {
  if (dateFrom && dateTo) {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('total_amount, vat_amount')
      .eq('status', 'completed')
      .gte('created_at', `${dateFrom}T00:00:00`)
      .lte('created_at', `${dateTo}T23:59:59`)

    if (error) return { data: null, error: error.message }

    const count = data?.length || 0
    const totalRev = data?.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) || 0
    const totalVat = data?.reduce((acc, o) => acc + Number(o.vat_amount || 0), 0) || 0

    return {
      data: {
        order_count: count,
        total_revenue: totalRev,
        avg_order_value: count > 0 ? totalRev / count : 0,
        total_vat: totalVat
      },
      error: null
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from(VIEWS.DAILY_SALES)
    .select('*')
    .eq('sale_date', today)
    .maybeSingle()

  if (error) return { data: null, error: error.message }

  return {
    data: data || {
      order_count: 0,
      total_revenue: 0,
      avg_order_value: 0,
      total_vat: 0,
    },
    error: null,
  }
}

// ============================================================
// YEAR SUMMARY
// ============================================================

export async function fetchYearSummary({ dateFrom = null, dateTo = null } = {}) {
  const now = new Date()
  const yearStart = dateFrom ? `${dateFrom}T00:00:00` : `${now.getFullYear()}-01-01`
  const yearEnd = dateTo ? `${dateTo}T23:59:59` : `${now.getFullYear()}-12-31T23:59:59`

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`
      total_amount,
      vat_amount,
      subtotal,
      discount_amount
    `)
    .eq('status', 'completed')
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd)

  if (error) {
    return { data: null, error: error.message }
  }

  const summary = {
    totalRevenue: 0,
    totalVat: 0,
    totalDiscount: 0,
    totalSubtotal: 0,
    orderCount: data.length
  }

  data.forEach(order => {
    summary.totalRevenue += Number(order.total_amount || 0)
    summary.totalVat += Number(order.vat_amount || 0)
    summary.totalDiscount += Number(order.discount_amount || 0)
    summary.totalSubtotal += Number(order.subtotal || 0)
  })

  return { data: summary, error: null }
}

// ============================================================
// BEST SELLERS
// ============================================================
export async function fetchBestSellers(limit = 5, { dateFrom = null, dateTo = null } = {}) {
  if (dateFrom && dateTo) {
    const { data, error } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select('product_name, quantity, orders!inner(status, created_at)')
      .eq('orders.status', 'completed')
      .gte('orders.created_at', `${dateFrom}T00:00:00`)
      .lte('orders.created_at', `${dateTo}T23:59:59`)

    if (error) return { data: [], error: error.message }

    const aggregation = {}
    data.forEach(item => {
      aggregation[item.product_name] = (aggregation[item.product_name] || 0) + Number(item.quantity || 0)
    })

    const sorted = Object.entries(aggregation)
      .map(([product_name, total_qty]) => ({ product_name, total_qty }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, limit)

    return { data: sorted, error: null }
  }

  const { data, error } = await supabase
    .from(VIEWS.BEST_SELLERS)
    .select('*')
    .limit(limit)

  if (error) return { data: [], error: error.message }
  return { data, error: null }
}

// ============================================================
// HOURLY SALES
// ============================================================

export async function fetchHourlySales({ dateFrom = null, dateTo = null } = {}) {
  let query = supabase
    .from(TABLES.ORDERS)
    .select('created_at, total_amount')
    .eq('status', 'completed')

  if (dateFrom && dateTo) {
    query = query.gte('created_at', `${dateFrom}T00:00:00`).lte('created_at', `${dateTo}T23:59:59`)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  const buckets = {}
    ; (data || []).forEach(o => {
      const hour = new Date(o.created_at).getHours()
      buckets[hour] = (buckets[hour] || 0) + Number(o.total_amount || 0)
    })

  const formatHour = (h) => {
    const suffix = h >= 12 ? 'pm' : 'am'
    const hour12 = h % 12 || 12
    return `${hour12}${suffix}`
  }

  return {
    data: Object.entries(buckets).map(([hour, total]) => ({
      label: formatHour(Number(hour)),
      revenue: total,
    })),
    error: null,
  }
}

// ============================================================
// CATEGORY REVENUE BREAKDOWN 
// ============================================================

export async function fetchCategoryBreakdown({ dateFrom = null, dateTo = null } = {}) {
  let query = supabase
    .from(TABLES.ORDER_ITEMS)
    .select(`
      line_total,
      quantity,
      products ( category_slug ),
      orders!inner(status, created_at)
    `)
    .eq('orders.status', 'completed')

  if (dateFrom && dateTo) {
    query = query.gte('orders.created_at', `${dateFrom}T00:00:00`).lte('orders.created_at', `${dateTo}T23:59:59`)
  }

  const { data, error } = await query

  if (error) return { data: [], error: error.message }

  const agg = {}
    ; (data || []).forEach(item => {
      const slug = item.products?.category_slug || 'unknown'
      if (!agg[slug]) {
        agg[slug] = { revenue: 0, qty: 0 }
      }
      agg[slug].revenue += Number(item.line_total || 0)
      agg[slug].qty += Number(item.quantity || 0)
    })

  return {
    data: Object.entries(agg).map(([category, v]) => ({
      category,
      ...v
    })),
    error: null,
  }
}

// ============================================================
// REALTIME SUBSCRIPTION
// ============================================================

export function subscribeToOrders({ onInsert, onUpdate } = {}) {
  const channelName = `orders-changes-${Date.now()}`

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLES.ORDERS },
      async (payload) => {
        const { data } = await fetchOrder(payload.new.id)
        onInsert?.(data || payload.new)
      }
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: TABLES.ORDERS },
      (payload) => onUpdate?.(payload.new)
    )
    .subscribe()

  return channel
}