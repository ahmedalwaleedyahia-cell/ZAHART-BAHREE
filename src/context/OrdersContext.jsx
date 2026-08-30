<<<<<<< HEAD
﻿import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createOrder, fetchOrders, fetchTodaySummary, subscribeToOrders } from '../services/orderService.js'
=======
﻿import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createOrder, fetchOrders, fetchTodaySummary, subscribeToOrders, deleteOrder as deleteOrderService } from '../services/orderService.js'
>>>>>>> ce067cb4ab6f91a4fa5457b9541b82610d0f8739
import { updateOrderStatus as updateOrderStatusService } from '../services/orderService.js'
import { supabase, TABLES } from '../supabase/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useSettings } from './SettingsContext.jsx'

const OrdersContext = createContext(null)

export function OrdersProvider({ children }) {
  const { profile } = useAuth()
  const { settings } = useSettings()

  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [orderType, setOrderType] = useState('dine_in')
  const [discountPct, setDiscountPct] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [cashGiven, setCashGiven] = useState('')

  const [orders, setOrders] = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)

  const [dynamicVatRate, setDynamicVatRate] = useState(0)

  useEffect(() => {
    if (settings?.vat_rate !== undefined) {
      setDynamicVatRate(Number(settings.vat_rate))
    }
  }, [settings])

  const channelRef = useRef(null)

  const loadOrders = useCallback(async (options = {}) => {
    setLoading(true)
    const [ordersResult, summaryResult] = await Promise.all([
      fetchOrders({ limit: 1000, ...options }),
      fetchTodaySummary(),
    ])
    if (!ordersResult?.error && ordersResult?.data) setOrders(ordersResult.data)
    if (!summaryResult?.error && summaryResult?.data) setTodaySummary(summaryResult.data)
    setLoading(false)
  }, [])

  useEffect(() => { if (profile) loadOrders() }, [profile, loadOrders])

  useEffect(() => {
    if (!profile) return

    channelRef.current = subscribeToOrders({
      onInsert: (newOrder) => {
        if (!newOrder?.id) return
        setOrders(prev => {
          if (prev.find(o => o.id === newOrder.id)) return prev
          return [newOrder, ...prev]
        })
        fetchTodaySummary().then(r => { if (!r?.error && r?.data) setTodaySummary(r.data) })
      },
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [profile])

  const addToCart = useCallback((product) => {
    if (!product?.id) return
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id)
      if (existing) {
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c)
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }, [])

  const removeFromCart = useCallback((productId) => {
    setCart(prev => prev.filter(c => c.id !== productId))
  }, [])

  const updateQty = useCallback((productId, qty) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.id !== productId))
    } else {
      setCart(prev => prev.map(c => c.id === productId ? { ...c, qty } : c))
    }
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
    setDiscountPct(0)
    setOrderNotes('')
    setCashGiven('')
    setPaymentMethod('cash')
    setOrderType('dine_in')
  }, [])

  const subtotal = cart.reduce((acc, item) => acc + Number(item.price || 0) * Number(item.qty || 0), 0)
  const discountAmount = subtotal * (Number(discountPct || 0) / 100)
  const taxable = Math.max(0, subtotal - discountAmount)
  const vatAmount = dynamicVatRate > 0 ? taxable * (dynamicVatRate / 100) : 0
  const totalAmount = taxable + vatAmount
  const changeAmount = cashGiven ? Math.max(0, parseFloat(cashGiven) - totalAmount) : 0
  const cartCount = cart.reduce((acc, item) => acc + (item.qty || 0), 0)

  const processPayment = useCallback(async () => {
    if (cart.length === 0) return { error: 'Cart is empty' }
    if (processing) return { error: 'Payment already in progress' }

    const cash = parseFloat(cashGiven) || 0
    if (paymentMethod === 'cash' && cash > 0 && cash < totalAmount) {
      return { error: 'Insufficient cash received' }
    }

    setProcessing(true)

    const orderData = {
      cashierName: profile?.full_name || 'Cashier',
      paymentMethod,
      orderType,
      subtotal,
      discountPct: parseFloat(discountPct) || 0,
      discountAmount,
      vatRate: Number(dynamicVatRate || 0),
      vatAmount: Number(vatAmount || 0),
      totalAmount: Number(totalAmount || 0),
      cashGiven: paymentMethod === 'cash' ? cash : null,
      changeAmount: paymentMethod === 'cash' ? changeAmount : null,
      notes: orderNotes,
    }

    const itemsPayload = cart.map(item => ({
      product_id: item.id,
      product_name: item.name || item.product_name || 'Item',
      product_name_ar: item.name_ar || item.product_name_ar || item.name || null,
      product_emoji: item.emoji || '🍽️',
      unit_price: Number(item.price),
      quantity: Number(item.qty),
      line_total: Number(item.price) * Number(item.qty),
      category: item.category || 'food'
    }))

    const { data, error } = await createOrder(orderData, itemsPayload)
    setProcessing(false)

    if (error) return { error }

<<<<<<< HEAD
    setLastOrder({
      ...data,
      items: cart.map(c => ({
        product_id: c.id,
        product_name: c.name,
        product_name_ar: c.name_ar || null,
        unit_price: Number(c.price || 0),
        quantity: Number(c.qty || 0),
        line_total: Number(c.price || 0) * Number(c.qty || 0),
        product_emoji: c.emoji || '🍽️'
      }))
    })
=======
    const completedOrder = data || {
      ...orderData,
      items: itemsPayload,
      order_items: itemsPayload
    }

    setLastOrder(completedOrder)
    setOrders(prev => [completedOrder, ...prev.filter(o => o.id !== completedOrder.id)])

>>>>>>> ce067cb4ab6f91a4fa5457b9541b82610d0f8739
    clearCart()
    return { data: completedOrder, error: null }
  }, [cart, processing, paymentMethod, orderType, cashGiven, totalAmount, subtotal, discountPct, discountAmount, dynamicVatRate, vatAmount, changeAmount, orderNotes, profile, clearCart])

  const updateOrderStatus = useCallback(async (id, status) => {
    return await updateOrderStatusService(id, status)
  }, [])

  const deleteOrder = async (orderId) => {
    try {
      const res = await deleteOrderService(orderId)
      if (res.error) throw new Error(res.error)

      setOrders((prev) => prev.filter((o) => o.id !== orderId))
      return { success: true }
    } catch (err) {
      console.error('Delete order error:', err)
      return { success: false, error: err.message }
    }
  }

<<<<<<< HEAD
  const updateOrderItems = useCallback(async (orderId, newItems = [], newSubtotal = 0, newTotal = 0, newVatAmount = 0, newDiscountAmount = 0) => {
=======
  const updateOrderItems = useCallback(async (orderId, newItems, newSubtotal, newTotal, newVatAmount = 0, newDiscountAmount = 0, extraUpdates = {}) => {
>>>>>>> ce067cb4ab6f91a4fa5457b9541b82610d0f8739
    try {
      const { error: deleteError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .delete()
        .eq('order_id', orderId)

      if (deleteError) throw deleteError

      const formattedItems = newItems.map(item => ({
        order_id: orderId,
        product_id: item.product_id || item.id,
<<<<<<< HEAD
        product_name: item.product_name || item.name,
        unit_price: item.unit_price || item.price || 0,
        quantity: item.quantity || item.qty || 0,
        line_total: (item.unit_price || item.price || 0) * (item.quantity || item.qty || 0)
=======
        product_name: item.product_name || item.name || 'Item',
        product_name_ar: item.product_name_ar || item.name_ar || item.name || null,
        unit_price: Number(item.unit_price || item.price || 0),
        quantity: Number(item.quantity || item.qty || 1),
        line_total: Number(item.line_total || ((item.unit_price || item.price) * (item.quantity || item.qty))),
        category: item.category || 'food'
>>>>>>> ce067cb4ab6f91a4fa5457b9541b82610d0f8739
      }))

      const { error: insertError } = await supabase
        .from(TABLES.ORDER_ITEMS)
        .insert(formattedItems)

      if (insertError) throw insertError

      const updatePayload = {
        subtotal: newSubtotal,
        total_amount: newTotal,
        vat_amount: newVatAmount,
        discount_amount: newDiscountAmount,
        items: formattedItems,
        ...(extraUpdates.invoice_number !== undefined && { invoice_number: extraUpdates.invoice_number }),
        ...(extraUpdates.payment_method && { payment_method: extraUpdates.payment_method }),
        ...(extraUpdates.order_type && { order_type: extraUpdates.order_type }),
        ...(extraUpdates.notes !== undefined && { notes: extraUpdates.notes }),
        ...(extraUpdates.cash_given !== undefined && { cash_given: extraUpdates.cash_given }),
        ...(extraUpdates.change_amount !== undefined && { change_amount: extraUpdates.change_amount }),
        ...(extraUpdates.created_at && { created_at: extraUpdates.created_at }),
      }

      const { data: updatedOrder, error: orderError } = await supabase
        .from(TABLES.ORDERS)
        .update(updatePayload)
        .eq('id', orderId)
        .select()
        .single()

      if (orderError) throw orderError

      const fullUpdatedOrder = {
        ...updatedOrder,
        items: formattedItems,
        order_items: formattedItems
      }

      setOrders(prev => prev.map(o => o.id === orderId ? fullUpdatedOrder : o))
      if (lastOrder && lastOrder.id === orderId) {
        setLastOrder(fullUpdatedOrder)
      }

      return { data: fullUpdatedOrder, error: null }
    } catch (err) {
      console.error('Error updating order items:', err)
      return { error: err.message || 'Failed to update order items' }
    }
  }, [lastOrder])

  const value = useMemo(() => ({
    cart, addToCart, removeFromCart, updateQty, clearCart,
    paymentMethod, setPaymentMethod,
    orderType, setOrderType,
    discountPct, setDiscountPct,
    orderNotes, setOrderNotes,
    cashGiven, setCashGiven,
    subtotal, discountAmount, vatAmount, totalAmount, changeAmount, cartCount,
    orders, todaySummary, loading, processing, lastOrder,
    vatRate: dynamicVatRate,
    setVatRate: setDynamicVatRate,
    processPayment,
    reload: loadOrders,
    updateOrderStatus,
    deleteOrder,
    updateOrderItems,
  }), [
    cart, addToCart, removeFromCart, updateQty, clearCart,
    paymentMethod, discountPct, orderNotes, cashGiven,
    subtotal, discountAmount, vatAmount, totalAmount, changeAmount, cartCount,
    orders, todaySummary, loading, processing, lastOrder,
    dynamicVatRate, processPayment, loadOrders, updateOrderStatus,
    updatePaymentMethod, updateOrderItems
  ])

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>')
  return ctx
}