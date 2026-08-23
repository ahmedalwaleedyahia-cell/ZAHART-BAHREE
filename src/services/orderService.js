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
    const name = item.product_name || item.product_name_ar || item.name || item.name_ar || item.title || 'صنف'
    const nameAr = item.product_name_ar || item.name_ar || name

    return {
      product_id: item.product_id || item.id || null,
      product_name: name,
      product_name_ar: nameAr,
      unit_price: price,
      quantity: qty,
      line_total: total,
      category: item.category || 'food'
    }
  })

  const { data: order, error: orderError } = await supabase
    .from(TABLES.ORDERS)
    .insert({
      invoice_number: orderData.invoice_number,
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
    })
    .select()
    .single()

  if (orderError) return { data: null, error: orderError.message }

  let insertedItems = []

  if (formattedItems.length > 0) {
    const itemsToInsert = formattedItems.map(item => ({
      ...item,
      order_id: order.id
    }))

    const { data: insertedData } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .insert(itemsToInsert)
      .select()

    if (insertedData) {
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

export async function fetchOrder(id) {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`*, order_items(*)`)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }

  let rawItems = []
  if (Array.isArray(data?.order_items) && data.order_items.length > 0) {
    rawItems = data.order_items
  } else if (Array.isArray(data?.items)) {
    rawItems = data.items
  } else if (typeof data?.items === 'string') {
    try { rawItems = JSON.parse(data.items) } catch (e) { rawItems = [] }
  }

  return {
    data: {
      ...data,
      items: rawItems,
      order_items: rawItems
    },
    error: null
  }
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

export async function fetchBestSellers(limit = 5) {
  const { data, error } = await supabase
    .from(TABLES.ORDER_ITEMS)
    .select('product_name, product_name_ar, quantity, line_total')

  if (error || !data) return { data: [], error: error?.message || null }

  const map = {}
  data.forEach(item => {
    const name = item.product_name_ar || item.product_name || 'صنف'
    if (!map[name]) {
      map[name] = { name, totalQty: 0, totalSales: 0 }
    }
    map[name].totalQty += Number(item.quantity || 0)
    map[name].totalSales += Number(item.line_total || 0)
  })

  const sorted = Object.values(map)
    .sort((a, b) => b.totalQty - a.totalQty)
    .slice(0, limit)

  return { data: sorted, error: null }
}

export async function fetchSalesStats() {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select('created_at, total_amount, status')

  if (error || !data) return { data: [], error: error?.message || null }

  return { data, error: null }
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
      const { data } = await fetchOrder(payload.new.id)
      onInsert?.(data || payload.new)
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: TABLES.ORDERS }, (payload) => onUpdate?.(payload.new))
    .subscribe()
}