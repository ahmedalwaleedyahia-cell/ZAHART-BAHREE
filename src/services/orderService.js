import { supabase, TABLES } from '../supabase/supabase.js'

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
    status: 'completed',
    items: formattedItems
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

export async function fetchOrders({ limit = null, offset = 0, status = null, cashierId = null, dateFrom = null, dateTo = null } = {}) {
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

export async function fetchTodaySummary() {
  const today = new Date().toISOString().split('T')[0]
  const { fromIso, toIso } = formatUtcRange(today, today)

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select('total_amount, status')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  if (error) return { data: null, error: error.message }

  const totalSales = (data || [])
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0)

  return {
    data: {
      totalSales,
      ordersCount: data?.length || 0
    },
    error: null
  }
}

export async function fetchBestSellers(limit = 5, { dateFrom = null, dateTo = null } = {}) {
  try {
    let query = supabase.from(TABLES.ORDER_ITEMS).select(`product_name, quantity, orders!inner(created_at, status)`)

    const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
    if (fromIso) query = query.gte('orders.created_at', fromIso)
    if (toIso) query = query.lte('orders.created_at', toIso)

    const { data, error } = await query
    if (error) throw error

    const map = {}
      ; (data || []).forEach(item => {
        if (item.orders?.status === 'cancelled') return
        const name = item.product_name || 'Item'
        map[name] = (map[name] || 0) + Number(item.quantity || 0)
      })

    const sorted = Object.keys(map)
      .map(product_name => ({ product_name, total_qty: map[product_name] }))
      .sort((a, b) => b.total_qty - a.total_qty)
      .slice(0, limit)

    return { data: sorted, error: null }
  } catch (err) {
    console.error('fetchBestSellers error:', err)
    return { data: [], error: err.message }
  }
}

export async function fetchDailySales(days = 7, { dateFrom = null, dateTo = null } = {}) {
  try {
    const { data, error } = await fetchOrders({ dateFrom, dateTo, limit: 2000 })
    if (error) throw error

    const map = {}
      ; (data || []).forEach(o => {
        if (o.status === 'cancelled') return
        const dateStr = (o.created_at || '').split('T')[0]
        if (!dateStr) return
        map[dateStr] = (map[dateStr] || 0) + Number(o.total_amount || 0)
      })

    const result = Object.keys(map)
      .sort()
      .map(sale_date => ({ sale_date, total_revenue: map[sale_date] }))

    return { data: result, error: null }
  } catch (err) {
    console.error('fetchDailySales error:', err)
    return { data: [], error: err.message }
  }
}

export async function fetchHourlySales() { return { data: [], error: null } }
export async function fetchCategoryBreakdown() { return { data: [], error: null } }
export async function fetchYearSummary() { return { data: [], error: null } }

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