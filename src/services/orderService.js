import { supabase, TABLES } from '../supabase/supabase'

export const orderService = {
  // جلب جميع الطلبات مع تفاصيل العناصر المرتبطة بها
  async fetchOrders() {
    try {
      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching orders:', error)
      return { success: false, error: error.message }
    }
  },

  // إنشاء طلب جديد ومعالجة المخزون وإدخال العناصر بشكل آمن
  async createOrder(orderData, items) {
    try {
      // 1. إدخال الطلب الرئيسي (مع التأكد من إزالة حقل items العشوائي إذا وُجد لتفادي خطأ 400)
      const cleanOrderData = { ...orderData }
      delete cleanOrderData.items

      const { data: newOrder, error: orderError } = await supabase
        .from(TABLES.ORDERS)
        .insert([cleanOrderData])
        .select()
        .single()

      if (orderError) throw orderError

      const orderId = newOrder.id

      // 2. إدخال عناصر الطلب في جدول order_items إن وجدت
      if (items && items.length > 0) {
        const orderItemsPayload = items.map(item => ({
          order_id: orderId,
          product_id: item.product_id || null,
          product_name: item.product_name || item.name || 'منتج مخصص',
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
          notes: item.notes || ''
        }))

        const { error: itemsError } = await supabase
          .from(TABLES.ORDER_ITEMS)
          .insert(orderItemsPayload)

        if (itemsError) throw itemsError

        // 3. تحديث المخزون للمنتجات المسجلة فقط باستخدام maybeSingle لتجنب الانهيار
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
}