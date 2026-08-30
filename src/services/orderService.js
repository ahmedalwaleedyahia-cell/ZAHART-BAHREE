// ============================================================
// src/services/orderService.js
// ============================================================

import { supabase, TABLES, VIEWS } from '../supabase/supabase.js'

const formatUtcRange = (dateFrom, dateTo) => {
  const fromIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : null
  const toIso = dateTo ? `${dateTo}T23:59:59.999Z` : null
  return { fromIso, toIso }
}

export async function createOrder(orderData, items) {
  const { data: { user } } = await supabase.auth.getUser()

  const formattedItems = (items || []).map(item => {
    const price = Number(item.unit_price ?? item.price ?? 0)
    const qty = Number(item.quantity ?? item.qty ?? 1)
    const total = Number(item.line_total ?? (price * qty))
    const name = item.product_name || item.name || item.product_name_ar || item.name_ar || 'صنف'
    const nameAr = item.product_name_ar || item.name_ar || name

    return {
      product_id: item.product_id || item.id || null,
      product_name: name,
      product_name_ar: nameAr,
      product_emoji: item.product_emoji || item.emoji || '🍽️',
      unit_price: price,
      quantity: qty,
      line_total: total,
      category: item.category || 'food'
    }
  })

  // تم إزالة حقل items من هنا لأنه يُخزن حصراً في جدول order_items لتفادي خطأ 400
  const insertPayload = {
    cashier_id: user?.id,
    cashier_name: orderData.cashierName || user?.user_metadata?.full_name || 'Cashier',
    payment_method: orderData.paymentMethod || 'cash',
    order_type: orderData.orderType || 'dine_in',
    subtotal: orderData.subtotal || 0,
    discount_pct: orderData.discountPct || 0,
    discount_amount: orderData.discountAmount || 0,
    vat_rate: orderData.vatRate || 0,
    vat_amount: orderData.vatAmount || 0,
    total_amount: orderData.totalAmount || 0,
    cash_given: orderData.cashGiven || null,
    change_amount: orderData.changeAmount || null,
    notes: orderData.notes || null,
    status: 'completed'
  }

  const { data: order, error: orderError } = await supabase
    .from(TABLES.ORDERS)
    .insert(insertPayload)
    .select()
    .single()

  if (orderError || !order) {
    console.error('Failed to create main order:', orderError)
    return { data: null, error: orderError?.message || 'Failed to create order record' }
  }

  const inventoryUpdates = items
    .filter(item => item.product_id)
    .map(async (item) => {
      const { data: product } = await supabase
        .from(TABLES.PRODUCTS)
        .select('category_slug, inventory_enabled, current_stock, current_weight, pieces_per_packet')
        .eq('id', item.product_id)
        .single()

      if (!product || !product.inventory_enabled) return

      let updatePayload = {}

      if (product.category_slug === 'drinks') {
        const newStock = Math.max(0, (product.current_stock || 0) - item.quantity)
        const pieces = product.pieces_per_packet || 1
        const newPackets = Math.floor(newStock / pieces)
        updatePayload = { current_stock: newStock, number_of_packets: newPackets }
      } else if (product.category_slug === 'desserts') {
        const newWeight = Math.max(0, (product.current_weight || 0) - item.quantity)
        updatePayload = { current_weight: newWeight }
      } else {
        const newStock = Math.max(0, (product.current_stock || 0) - item.quantity)
        updatePayload = { current_stock: newStock }
      }

      await supabase
        .from(TABLES.PRODUCTS)
        .update(updatePayload)
        .eq('id', item.product_id)
    })

  await Promise.all(inventoryUpdates)

  let insertedItems = []

  if (formattedItems.length > 0) {
    const itemsToInsert = formattedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_name_ar: item.product_name_ar,
      unit_price: item.unit_price,
      quantity: item.quantity,
      line_total: item.line_total,
      category: item.category
    }))

    const { data: insertedData, error: itemsError } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .insert(itemsToInsert)
      .select()

    if (itemsError) {
      console.error('Error inserting order items:', itemsError)
    } else if (insertedData) {
      insertedItems = insertedData
    }
  }

  const finalItems = insertedItems.length > 0 ? insertedItems : formattedItems

  return {
    data: {
      ...order,
      items: finalItems,
      order_items: finalItems
    },
    error: null
  }
}

export async function fetchOrders({
  limit = null,
  offset = 0,
  status = null,
  cashierId = null,
  dateFrom = null,
  dateTo = null,
} = {}) {
  let query = supabase
    .from(TABLES.ORDERS)
    .select(`*, order_items(*)`)
    .order('created_at', { ascending: false })

  if (limit && typeof limit === 'number') {
    query = query.range(offset, offset + limit - 1)
  }

  if (status) query = query.eq('status', status)
  if (cashierId) query = query.eq('cashier_id', cashierId)

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso) query = query.gte('created_at', fromIso)
  if (toIso) query = query.lte('created_at', toIso)

  let { data, error } = await query

  if (error) {
    const fallback = await supabase.from(TABLES.ORDERS).select('*').order('created_at', { ascending: false })
    data = fallback.data || []
  }

  if (!data || data.length === 0) return { data: [], error: null }

  const normalizedData = data.map(order => {
    let finalItems = []

    if (Array.isArray(order.order_items) && order.order_items.length > 0) {
      finalItems = order.order_items
    } else if (Array.isArray(order.items) && order.items.length > 0) {
      finalItems = order.items
    } else if (typeof order.items === 'string') {
      try { finalItems = JSON.parse(order.items) } catch (e) { finalItems = [] }
    }

    return {
      ...order,
      items: finalItems,
      order_items: finalItems
    }
  })

  return { data: normalizedData, error: null }
}

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

export async function fetchDailySales(days = 7, { dateFrom = null, dateTo = null } = {}) {
  let query = supabase.from(VIEWS.DAILY_SALES).select('*')

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

export async function fetchTodaySummary({ dateFrom = null, dateTo = null } = {}) {
  const { fromIso, toIso } = formatUtcRange(
    dateFrom || new Date().toISOString().split('T')[0],
    dateTo || new Date().toISOString().split('T')[0]
  )

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select('total_amount, vat_amount, status')
    .eq('status', 'completed')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  if (error) return { data: null, error: error.message }

  const count = data?.length || 0
  const totalRev = data?.reduce((acc, o) => acc + Number(o.total_amount || 0), 0) || 0
  const totalVat = data?.reduce((acc, o) => acc + Number(o.vat_amount || 0), 0) || 0

  return {
    data: {
      order_count: count,
      total_revenue: totalRev,
      totalSales: totalRev,
      ordersCount: count,
      avg_order_value: count > 0 ? totalRev / count : 0,
      total_vat: totalVat
    },
    error: null
  }
}

export async function fetchYearSummary({ dateFrom = null, dateTo = null } = {}) {
  const now = new Date()
  const yearStart = dateFrom || `${now.getFullYear()}-01-01`
  const yearEnd = dateTo || `${now.getFullYear()}-12-31`
  const { fromIso, toIso } = formatUtcRange(yearStart, yearEnd)

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`total_amount, vat_amount, subtotal, discount_amount`)
    .eq('status', 'completed')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  if (error) return { data: null, error: error.message }

  const summary = (data || []).reduce(
    (acc, order) => {
      acc.totalRevenue += Number(order.total_amount || 0)
      acc.totalVat += Number(order.vat_amount || 0)
      acc.totalDiscount += Number(order.discount_amount || 0)
      acc.totalSubtotal += Number(order.subtotal || 0)
      return acc
    },
    { totalRevenue: 0, totalVat: 0, totalDiscount: 0, totalSubtotal: 0, orderCount: data.length }
  )

  return { data: summary, error: null }
}

export async function fetchBestSellers(limit = 5, { dateFrom = null, dateTo = null } = {}) {
  if (dateFrom && dateTo) {
    const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
    const { data, error } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select('product_name, quantity, orders!inner(status, created_at)')
      .eq('orders.status', 'completed')
      .gte('orders.created_at', fromIso)
      .lte('orders.created_at', toIso)

    if (error) return { data: [], error: error.message }

    const aggregation = {}
      ; (data || []).forEach(item => {
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

export async function fetchHourlySales({ dateFrom = null, dateTo = null } = {}) {
  let query = supabase
    .from(TABLES.ORDERS)
    .select('created_at, total_amount')
    .eq('status', 'completed')

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso && toIso) {
    query = query.gte('created_at', fromIso).lte('created_at', toIso)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  const buckets = Array(24).fill(0)
    ; (data || []).forEach(o => {
      const hour = new Date(o.created_at).getHours()
      buckets[hour] += Number(o.total_amount || 0)
    })

  const formatHour = (h) => {
    const suffix = h >= 12 ? 'pm' : 'am'
    const hour12 = h % 12 || 12
    return `${hour12}${suffix}`
  }

  return {
    data: buckets.map((total, hour) => ({
      label: formatHour(hour),
      revenue: total,
    })),
    error: null,
  }
}

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

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso && toIso) {
    query = query.gte('orders.created_at', fromIso).lte('orders.created_at', toIso)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  const agg = {}
    ; (data || []).forEach(item => {
      const slug = item.products?.category_slug || 'uncategorized'
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

export async function deleteOrder(id) {
  await supabase.from(TABLES.ORDER_ITEMS).delete().eq('order_id', id)
  const { data, error } = await supabase.from(TABLES.ORDERS).delete().eq('id', id)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export function subscribeToOrders({ onInsert, onUpdate } = {}) {
  const channelName = `orders-changes-${Date.now()}`
  return supabase
    .channel(channelName)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLES.ORDERS }, async (payload) => {
      const { data } = await supabase.from(TABLES.ORDERS).select('*, order_items(*)').eq('id', payload.new.id).single()
      onInsert?.(data || payload.new)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLES.ORDERS }, (payload) => onUpdate?.(payload.new))
    .subscribe()
}