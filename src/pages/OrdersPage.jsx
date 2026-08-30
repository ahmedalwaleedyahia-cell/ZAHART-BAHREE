import { supabase, TABLES } from '../supabase/supabase'

// جلب جميع الطلبات مع تفاصيل العناصر المرتبطة بها
export async function fetchOrders(options = {}) {
  try {
    let query = supabase
      .from(TABLES.ORDERS)
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false })

    if (options.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { success: false, error: error.message }
  }
}

// ملخص اليوم (إن لم يكن موجوداً، يمنع أي أخطاء في الـ Context)
export async function fetchTodaySummary() {
  try {
    // يمكن تعديلها حسب استعلام الملخص لديك في المشروع
    return { success: true, data: null }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

// تحديث حالة الطلب
export async function updateOrderStatus(id, status) {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: error.message }
  }
}

// حذف طلب
export async function deleteOrder(orderId) {
  try {
    // حذف العناصر المرتبطة أولاً لتفادي قيود المفتاح الأجنبي
    await supabase.from(TABLES.ORDER_ITEMS).delete().eq('order_id', orderId)

    const { error } = await supabase
      .from(TABLES.ORDERS)
      .delete()
      .eq('id', orderId)

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error deleting order:', error)
    return { success: false, error: error.message }
  }
}

// الاستماع للطلبات الفورية (Realtime subscription)
export function subscribeToOrders({ onInsert }) {
  const channel = supabase
    .channel('public:orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: TABLES.ORDERS },
      (payload) => {
        if (onInsert) onInsert(payload.new)
      }
    )
    .subscribe()

  return channel
}

// إنشاء طلب جديد ومعالجة المخزون وإدخال العناصر بشكل آمن
export async function createOrder(orderData, items) {
  try {
    const cleanOrderData = { ...orderData }
    delete cleanOrderData.items

    const { data: newOrder, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .insert([cleanOrderData])
      .select()
      .single()

    if (orderError) throw orderError

    const orderId = newOrder.id

    if (items && items.length > 0) {
      const orderItemsPayload = items.map(item => ({
        order_id: orderId,
        product_id: item.product_id || null,
        product_name: item.product_name || item.name || 'منتج مخصص',
        quantity: item.quantity,
        price: item.price || item.unit_price,
        total: (item.price || item.unit_price || 0) * item.quantity,
        notes: item.notes || ''
      }))

      const { error: itemsError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .insert(orderItemsPayload)

      if (itemsError) throw itemsError

      await Promise.all(
        items
          .filter(item => item.product_id)
          .map(async (item) => {
            const { data: product } = await supabase
              .from(TABLES.PRODUCTS)
              .select('category_slug, inventory_enabled, current_stock, current_weight, pieces_per_packet')
              .eq('id', item.product_id)
              .maybeSingle()

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
      )
    }

    return { success: true, data: newOrder }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: error.message }
  }
}