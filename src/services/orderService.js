import { supabase, TABLES, VIEWS } from '../supabase/supabase.js'

// مساعد لضبط تواريخ UTC لضمان استعلامات دقيقة
const formatUtcRange = (dateFrom, dateTo) => {
  const fromIso = dateFrom ? `${dateFrom}T00:00:00.000Z` : null
  const toIso = dateTo ? `${dateTo}T23:59:59.999Z` : null
  return { fromIso, toIso }
}

// ============================================================
// CREATE ORDER
// ============================================================
export async function createOrder(orderData, items) {
  const { data: { user } } = await supabase.auth.getUser()

  // أ. إنشاء الفاتورة الرئيسية
  const { data: order, error: orderError } = await supabase
    .from(TABLES.ORDERS)
    .insert({
      invoice_number: orderData.invoice_number,
      cashier_id: user?.id,
      cashier_name: orderData.cashierName,
      payment_method: orderData.paymentMethod,
      order_type: orderData.orderType || 'dine_in',
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

  let insertedItems = []

  // ب. حفظ عناصر السلة بداخل جدول order_items
  if (items && items.length > 0) {
    const itemsToInsert = items.map(item => {
      const price = Number(item.unit_price || item.price || 0)
      const qty = Number(item.quantity || item.qty || 1)

      return {
        order_id: order.id,
        product_id: item.product_id || item.id,
        product_name: item.product_name || item.name || 'Item',
        product_name_ar: item.product_name_ar || item.name_ar || null,
        unit_price: price,
        quantity: qty,
        line_total: Number(item.line_total || (price * qty)),
        category: item.category || 'food'
      }
    })

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

  const fullOrder = {
    ...order,
    items: insertedItems.length > 0 ? insertedItems : items,
    order_items: insertedItems.length > 0 ? insertedItems : items
  }

  return { data: fullOrder, error: null }
}

// ============================================================
// FETCH ORDERS
// ============================================================
// ============================================================
// FETCH ORDERS (معدلة بدون تكرار العلاقات لمنع خطأ 400)
// ============================================================
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
    .select(`
      *,
      order_items(*)
    `)
    .order('created_at', { ascending: false })

  if (limit && typeof limit === 'number') {
    query = query.range(offset, offset + limit - 1)
  }

  if (status) query = query.eq('status', status)
  if (cashierId) query = query.eq('cashier_id', cashierId)

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso) query = query.gte('created_at', fromIso)
  if (toIso) query = query.lte('created_at', toIso)

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  // دمج مصفوفات الأصناف تحت المسميين items و order_items في الذاكرة لتفادي أي استثناءات
  const normalizedData = (data || []).map(order => {
    const rawItems = order.order_items || order.items || []
    return {
      ...order,
      items: rawItems,
      order_items: rawItems
    }
  })

  return { data: normalizedData, error: null }
}

// ============================================================
// FETCH SINGLE ORDER
// ============================================================
export async function fetchOrder(id) {
  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`
      *,
      order_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) return { data: null, error: error.message }

  const rawItems = data?.order_items || data?.items || []
  const normalizedOrder = {
    ...data,
    items: rawItems,
    order_items: rawItems
  }

  return { data: normalizedOrder, error: null }
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
// DELETE ORDER
// ============================================================
export async function deleteOrder(id) {
  await supabase
    .from(TABLES.ORDER_ITEMS)
    .delete()
    .eq('order_id', id)

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .delete()
    .eq('id', id)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

// ============================================================
// DAILY SALES
// ============================================================
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

// ============================================================
// TODAY SUMMARY
// ============================================================
export async function fetchTodaySummary({ dateFrom = null, dateTo = null } = {}) {
  const { fromIso, toIso } = formatUtcRange(
    dateFrom || new Date().toISOString().split('T')[0],
    dateTo || new Date().toISOString().split('T')[0]
  )

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select('total_amount, vat_amount')
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
      avg_order_value: count > 0 ? totalRev / count : 0,
      total_vat: totalVat
    },
    error: null
  }
}

// ============================================================
// YEAR SUMMARY
// ============================================================
export async function fetchYearSummary({ dateFrom = null, dateTo = null } = {}) {
  const now = new Date()
  const yearStart = dateFrom ? dateFrom : `${now.getFullYear()}-01-01`
  const yearEnd = dateTo ? dateTo : `${now.getFullYear()}-12-31`
  const { fromIso, toIso } = formatUtcRange(yearStart, yearEnd)

  const { data, error } = await supabase
    .from(TABLES.ORDERS)
    .select(`total_amount, vat_amount, subtotal, discount_amount`)
    .eq('status', 'completed')
    .gte('created_at', fromIso)
    .lte('created_at', toIso)

  if (error) return { data: null, error: error.message }

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
    const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
    const { data, error } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select('product_name, quantity, orders!inner(status, created_at)')
      .eq('orders.status', 'completed')
      .gte('orders.created_at', fromIso)
      .lte('orders.created_at', toIso)

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

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso && toIso) {
    query = query.gte('created_at', fromIso).lte('created_at', toIso)
  }

  const { data, error } = await query
  if (error) return { data: [], error: error.message }

  const buckets = {}
  for (let i = 0; i < 24; i++) buckets[i] = 0

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
  let orderQuery = supabase
    .from(TABLES.ORDERS)
    .select('id')
    .eq('status', 'completed')

  const { fromIso, toIso } = formatUtcRange(dateFrom, dateTo)
  if (fromIso && toIso) {
    orderQuery = orderQuery.gte('created_at', fromIso).lte('created_at', toIso)
  }

  const { data: validOrders, error: orderErr } = await orderQuery
  if (orderErr || !validOrders?.length) return { data: [], error: orderErr?.message || null }

  const orderIds = validOrders.map(o => o.id)

  const { data, error } = await supabase
    .from(TABLES.ORDER_ITEMS)
    .select(`
      line_total,
      quantity,
      product_name,
      category,
      category_slug,
      products ( category_slug )
    `)
    .in('order_id', orderIds)

  if (error) return { data: [], error: error.message }

  const agg = {}
    ; (data || []).forEach(item => {
      const rawCategory =
        item.category_slug ||
        item.products?.category_slug ||
        item.category ||
        item.product_name ||
        'food'

      if (!agg[rawCategory]) {
        agg[rawCategory] = { revenue: 0, qty: 0 }
      }
      agg[rawCategory].revenue += Number(item.line_total || 0)
      agg[rawCategory].qty += Number(item.quantity || 0)
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