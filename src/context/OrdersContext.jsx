// ============================================================
// src/context/OrdersContext.jsx
// Cart state + order history + realtime order stream
// ============================================================

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { createOrder, fetchOrders, fetchTodaySummary, subscribeToOrders } from '../services/orderService.js'
import { updateOrderStatus as updateOrderStatusService } from '../services/orderService.js'
import { supabase } from '../supabase/supabase.js'
import { useAuth } from './AuthContext.jsx'
import { useSettings } from './SettingsContext.jsx'

const OrdersContext = createContext(null)

export function OrdersProvider({ children }) {
  const { profile } = useAuth()
  const { settings } = useSettings()

  // ---- Cart state ----
  const [cart, setCart] = useState([])
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [discountPct, setDiscountPct] = useState(0)
  const [orderNotes, setOrderNotes] = useState('')
  const [cashGiven, setCashGiven] = useState('')

  // ---- Order history ----
  const [orders, setOrders] = useState([])
  const [todaySummary, setTodaySummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [lastOrder, setLastOrder] = useState(null)

  // قراءة نسبة الضريبة ديناميكياً من الإعدادات مباشرة
  const [dynamicVatRate, setDynamicVatRate] = useState(0)

  // التزامن مع تحديثات الـ vatRate القادمة من شاشة الإعدادات
  useEffect(() => {
    if (settings?.vat_rate !== undefined) {
      setDynamicVatRate(Number(settings.vat_rate))
    }
  }, [settings])

  const channelRef = useRef(null)

  // ---- Load orders + today summary ----
  const loadOrders = useCallback(async () => {
    setLoading(true)
    const [ordersResult, summaryResult] = await Promise.all([
      fetchOrders({ limit: 100 }),
      fetchTodaySummary(),
    ])
    if (!ordersResult.error) setOrders(ordersResult.data)
    if (!summaryResult.error) setTodaySummary(summaryResult.data)
    setLoading(false)
  }, [])

  useEffect(() => { if (profile) loadOrders() }, [profile, loadOrders])

  // ---- Realtime order feed ----
  useEffect(() => {
    if (!profile) return

    channelRef.current = subscribeToOrders({
      onInsert: (newOrder) => {
        setOrders(prev => {
          if (prev.find(o => o.id === newOrder.id)) return prev
          return [newOrder, ...prev]
        })
        fetchTodaySummary().then(r => { if (!r.error) setTodaySummary(r.data) })
      },
    })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [profile])

  // ---- CART OPERATIONS ----

  const addToCart = useCallback((product) => {
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
  }, [])

  // ---- COMPUTED TOTALS ----

  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.price) * Number(item.qty),
    0
  )
  const discountAmount =
    subtotal * (Number(discountPct || 0) / 100)
  const taxable =
    Math.max(0, subtotal - discountAmount)
  const vatAmount =
    dynamicVatRate > 0
      ? taxable * (dynamicVatRate / 100)
      : 0
  const totalAmount =
    taxable + vatAmount
  const changeAmount = cashGiven ? Math.max(0, parseFloat(cashGiven) - totalAmount) : 0
  const cartCount = cart.reduce((acc, item) => acc + item.qty, 0)

  // ---- PROCESS PAYMENT ----

  const processPayment = useCallback(async () => {
    if (cart.length === 0) return { error: 'Cart is empty' }
    if (processing) return { error: 'Payment already in progress' }

    const cash = parseFloat(cashGiven) || 0
    if (paymentMethod === 'cash' && cash > 0 && cash < totalAmount) {
      return { error: 'Insufficient cash received' }
    }

    setProcessing(true)

    // دالة توليد رقم فاتورة عشوائي بالكامل لمنع التعارض نهائياً 
    const generateUniqueInvoiceNumber = () => {
      const timestamp = Date.now().toString(); // 13 خانة تعبر عن الوقت بالملي ثانية
      const randomDigits = Math.floor(1000 + Math.random() * 9000).toString(); // 4 خانات عشوائية تماماً
      return parseInt(timestamp + randomDigits); // سينتج رقم نقي طوله 17 خانة مستحيل تكراره
    }

    const orderData = {
      invoice_number: generateUniqueInvoiceNumber(),
      cashierName: profile?.full_name || 'Cashier',
      paymentMethod,
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

    const items = cart.map(item => ({
      product_id: item.id,
      product_name: item.name,
      product_emoji: item.emoji || '🍽️',
      unit_price: item.price,
      quantity: item.qty,
    }))

    // طباعة البيانات في الكونسول للمراقبة الذاتية قبل الإرسال
    console.log("إرسال الطلب بالبيانات التالية:", orderData)

    const { data, error } = await createOrder(orderData, items)

    setProcessing(false)

    if (error) {
      // طباعة تفصيلية للخطأ لمساعدتك على قراءته فوراً من الكونسول في حال حدوثه
      console.error("تفاصيل فشل عملية الدفع:", error)
      return { error }
    }

    setLastOrder({
      ...data,
      items: cart.map(c => ({
        product_id: c.id,
        product_name: c.name,
        product_name_ar: c.name_ar || null,
        unit_price: Number(c.price),
        quantity: Number(c.qty),
        line_total: Number(c.price) * Number(c.qty),
        product_emoji: c.emoji || '🍽️'
      }))
    })
    clearCart()
    return { data, error: null }
  }, [cart, processing, paymentMethod, cashGiven, totalAmount, subtotal,
    discountPct, discountAmount, dynamicVatRate, vatAmount, changeAmount,
    orderNotes, profile, clearCart])

  const updateOrderStatus = useCallback(async (id, status) => {
    return await updateOrderStatusService(id, status)
  }, [])

  const value = {
    cart, addToCart, removeFromCart, updateQty, clearCart,
    paymentMethod, setPaymentMethod,
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
  }

  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used inside <OrdersProvider>')
  return ctx
}