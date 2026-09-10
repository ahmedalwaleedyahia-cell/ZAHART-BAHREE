// ============================================================
// Analytics and Report views
// Path: src/pages/AnalyticsPage.jsx
// ============================================================

import { useEffect, useState, useMemo } from 'react'

import { TrendingUp, Clock3, PieChart, CreditCard } from 'lucide-react'

import { fmtNum } from '../utils/format.js'

import { useProducts } from '../context/ProductsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'

import {
  fetchDailySales,
  fetchHourlySales,
  fetchCategoryBreakdown,
} from '../services/orderService.js'

import Skeleton from '../components/ui/Skeleton.jsx'
import BarChart from '../components/ui/BarChart.jsx'
import DonutChart from '../components/ui/DonutChart.jsx'
import PaymentSplit from '../components/ui/PaymentSplit.jsx'
import Empty from '../components/ui/Empty.jsx'
import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'

import '../styles/unified-cards.css'

// ============================================================
// COLORS
// ============================================================

const CAT_COLORS = {
  food: '#C9A96E',
  drinks: '#3B82F6',
  desserts: '#22C55E',
}

// ============================================================
// SAFE CALL
// ============================================================

function safeCall(fn, ...args) {
  if (typeof fn !== 'function') {
    return Promise.resolve({ data: [], error: null })
  }

  return fn(...args)
}

// ============================================================
// CATEGORY NORMALIZER
// ============================================================

function normalizeCategory(category) {
  if (!category) return 'food'

  const c = String(category).trim().toLowerCase()

  if (c.includes('drink') || c.includes('beverage')) {
    return 'drinks'
  }

  if (c.includes('dessert') || c.includes('sweet')) {
    return 'desserts'
  }

  return 'food'
}

// ============================================================
// DATE HELPERS (Matches DashboardPage exactly)
// ============================================================

const getLocalDateString = (dateInput) => {
  if (!dateInput) return ''
  const d = typeof dateInput === 'string' && dateInput.includes('T')
    ? new Date(dateInput)
    : new Date(dateInput)

  if (isNaN(d.getTime())) return ''

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const formatDate = (date) => {
  return getLocalDateString(date)
}

export default function AnalyticsPage() {

  // ----------------------------------------------------------
  // FILTER STATE (Defaults to Today, same as Dashboard)
  // ----------------------------------------------------------

  const [activePreset, setActivePreset] = useState('custom')

  const [dateRange, setDateRange] = useState({
    dateFrom: getLocalDateString(new Date()),
    dateTo: getLocalDateString(new Date()),
  })

  // ----------------------------------------------------------
  // DATA STATE
  // ----------------------------------------------------------

  const [dailyData, setDailyData] = useState([])
  const [hourly, setHourly] = useState([])
  const [categoryData, setCategoryData] = useState([])

  const [loading, setLoading] = useState(true)

  // ----------------------------------------------------------
  // CONTEXT
  // ----------------------------------------------------------

  const { availableProducts } = useProducts()
  const { orders } = useOrders()

  // ==========================================================
  // PRODUCT CATEGORY MAP
  // ==========================================================

  const productCategoryMap = useMemo(() => {
    const map = {}
    if (availableProducts) {
      availableProducts.forEach(p => {
        map[p.id] = normalizeCategory(
          p.category_slug || p.category
        )
      })
    }
    return map
  }, [availableProducts])

  // ==========================================================
  // APPLY PRESET / RANGE
  // ==========================================================

  const applyPreset = (presetType) => {
    setActivePreset(presetType)

    const now = new Date()
    let dateFrom = ''
    let dateTo = ''

    if (presetType === 'all') {
      dateFrom = ''
      dateTo = ''
    } else if (presetType === 'current_month') {
      dateFrom = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1))
      dateTo = getLocalDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    } else if (presetType === 'previous_month') {
      dateFrom = getLocalDateString(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      dateTo = getLocalDateString(new Date(now.getFullYear(), now.getMonth(), 0))
    } else if (presetType === 'current_year') {
      dateFrom = `${now.getFullYear()}-01-01`
      dateTo = `${now.getFullYear()}-12-31`
    }

    setDateRange({ dateFrom, dateTo })
  }

  // ==========================================================
  // FETCH ANALYTICS DATA
  // ==========================================================

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)

      try {
        const { dateFrom, dateTo } = dateRange
        const start = dateFrom ? new Date(dateFrom) : new Date()
        const end = dateTo ? new Date(dateTo) : new Date()
        const diffDays = Math.max(
          1,
          Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
        )

        const [d, h, c] = await Promise.all([
          safeCall(fetchDailySales, diffDays, { dateFrom, dateTo }),
          safeCall(fetchHourlySales, { dateFrom, dateTo }),
          safeCall(fetchCategoryBreakdown, { dateFrom, dateTo }),
        ])

        if (!alive) return

        setDailyData(Array.isArray(d?.data) ? d.data : [])
        setHourly(Array.isArray(h?.data) ? h.data : [])
        setCategoryData(Array.isArray(c?.data) ? c.data : [])

      } catch (err) {
        console.error('[Analytics Error]', err)
        if (alive) {
          setDailyData([])
          setHourly([])
          setCategoryData([])
        }
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()

    return () => {
      alive = false
    }
  }, [dateRange])

  // ==========================================================
  // FILTER ORDERS (Matching Dashboard Logic Exactly)
  // ==========================================================

  const periodFilteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return []

    return orders.filter(order => {
      if (order.status === 'cancelled') return false

      const rawDate = order.created_at || order.date
      const orderDateStr = getLocalDateString(rawDate)
      if (!orderDateStr) return false

      if (dateRange.dateFrom && orderDateStr < dateRange.dateFrom) return false
      if (dateRange.dateTo && orderDateStr > dateRange.dateTo) return false

      return true
    })
  }, [orders, dateRange])

  // ==========================================================
  // METRICS (Consistent with Dashboard calculation rules)
  // ==========================================================

  const totalRev = useMemo(
    () =>
      periodFilteredOrders.reduce((a, o) => {
        if ((o.payment_method || '').toLowerCase() === 'unpaid') return a
        return a + Number(o.total_amount || o.total || 0)
      }, 0),
    [periodFilteredOrders]
  )

  const totalOrds = useMemo(
    () => periodFilteredOrders.length,
    [periodFilteredOrders]
  )

  const cashRev = useMemo(
    () =>
      periodFilteredOrders.reduce((a, o) => {
        const method = (o.payment_method || '').toLowerCase()
        if (method === 'unpaid') return a
        if (method === 'cash' || !method) {
          return a + Number(o.total_amount || o.total || 0)
        }
        return a
      }, 0),
    [periodFilteredOrders]
  )

  const visaRev = useMemo(
    () =>
      periodFilteredOrders.reduce((a, o) => {
        const method = (o.payment_method || '').toLowerCase()
        if (method === 'visa' || method === 'card') {
          return a + Number(o.total_amount || o.total || 0)
        }
        return a
      }, 0),
    [periodFilteredOrders]
  )

  const unifiedAnalyticsCards = useMemo(
    () => ([
      {
        id: 'an-rev',
        label: 'Revenue (Selected Period)',
        value: `AED ${fmtNum(totalRev)}`,
        type: 'revenue',
        subtitle: dateRange.dateFrom && dateRange.dateTo ? `${dateRange.dateFrom} to ${dateRange.dateTo}` : 'All time interval',
      },
      {
        id: 'an-ord',
        label: 'Total Orders',
        value: totalOrds,
        type: 'orders',
        subtitle: 'Completed orders',
      },
      {
        id: 'an-cash',
        label: 'Cash Revenue',
        value: `AED ${fmtNum(cashRev)}`,
        type: 'avg_order',
        subtitle: 'Cash payments',
      },
      {
        id: 'an-visa',
        label: 'Card Revenue',
        value: `AED ${fmtNum(visaRev)}`,
        type: 'vat',
        subtitle: 'Card payments',
      },
    ]),
    [totalRev, totalOrds, cashRev, visaRev, dateRange]
  )

  // ==========================================================
  // CATEGORY DATA
  // ==========================================================

  const catDonutData = useMemo(() => {
    const grouped = { food: 0, drinks: 0, desserts: 0 }

    if (periodFilteredOrders.length > 0) {
      periodFilteredOrders.forEach(order => {
        if ((order.payment_method || '').toLowerCase() === 'unpaid') return

        const items = order.items || order.order_items || []
        items.forEach(item => {
          const catSlug =
            productCategoryMap[item.product_id] ||
            normalizeCategory(item.category || item.category_slug)

          const lineTotal = Number(
            item.line_total ||
            (Number(item.unit_price || item.price || 0) * Number(item.quantity || item.qty || 1))
          )

          if (grouped[catSlug] !== undefined) {
            grouped[catSlug] += lineTotal
          } else {
            grouped.food += lineTotal
          }
        })
      })
    } else if (categoryData?.length) {
      categoryData.forEach(item => {
        const key = normalizeCategory(item.category)
        if (grouped[key] !== undefined) {
          grouped[key] += Number(item.revenue || 0)
        } else {
          grouped.food += Number(item.revenue || 0)
        }
      })
    }

    return Object.entries(grouped)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        label: key,
        value,
        color: CAT_COLORS[key] || '#C9A96E',
      }))
  }, [periodFilteredOrders, productCategoryMap, categoryData])

  // ==========================================================
  // HOURLY CHART DATA
  // ==========================================================

  const hourlyChartData = useMemo(() => {
    const customHourOrder = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1]

    return customHourOrder.map(hour => {
      const ampm = hour >= 12 ? 'pm' : 'am'
      const displayHour = hour % 12 === 0 ? 12 : hour % 12
      const hourLabelStr = `${displayHour}${ampm}`

      const match = hourly.find(i => {
        if (!i) return false
        const recordLabel = String(i.label || '').trim().toLowerCase()
        return recordLabel === hourLabelStr || recordLabel === `${displayHour} ${ampm}` || recordLabel === String(hour)
      })

      return {
        label: `${displayHour} ${ampm.toUpperCase()}`,
        value: match ? Number(match.revenue || match.total_revenue || 0) : 0,
      }
    })
  }, [hourly])

  // ==========================================================
  // DAILY REVENUE TREND
  // ==========================================================

  const trendData = useMemo(
    () =>
      dailyData.map(d => {
        let label = d.sale_date
        try {
          label = new Date(d.sale_date).toLocaleDateString('en-AE', {
            month: 'short',
            day: 'numeric',
          })
        } catch { }

        return {
          label,
          value: Number(d.total_revenue || d.revenue || 0),
        }
      }),
    [dailyData]
  )

  const hasPaymentData = cashRev > 0 || visaRev > 0

  return (
    <div className="scroll-view">
      <div
        className="dashboard-filter-container"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          background: 'var(--surf2, #ffffff)',
          border: '1px solid var(--bdr, #eee)',
          padding: '12px',
          borderRadius: '14px',
        }}
      >
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => applyPreset('all')}
            style={{
              background: activePreset === 'all' ? 'var(--gold, #C9A96E)' : 'transparent',
              color: activePreset === 'all' ? 'var(--surf1, #000000)' : 'var(--txt1, #000000)',
              border: activePreset === 'all' ? '1px solid var(--gold, #C9A96E)' : '1px solid var(--bdr, #ccc)',
              fontWeight: activePreset === 'all' ? '700' : '500',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            All Time
          </button>

          <button
            onClick={() => applyPreset('current_month')}
            style={{
              background: activePreset === 'current_month' ? 'var(--gold, #C9A96E)' : 'transparent',
              color: activePreset === 'current_month' ? 'var(--surf1, #000000)' : 'var(--txt1, #000000)',
              border: activePreset === 'current_month' ? '1px solid var(--gold, #C9A96E)' : '1px solid var(--bdr, #ccc)',
              fontWeight: activePreset === 'current_month' ? '700' : '500',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Current Month
          </button>

          <button
            onClick={() => applyPreset('previous_month')}
            style={{
              background: activePreset === 'previous_month' ? 'var(--gold, #C9A96E)' : 'transparent',
              color: activePreset === 'previous_month' ? 'var(--surf1, #000000)' : 'var(--txt1, #000000)',
              border: activePreset === 'previous_month' ? '1px solid var(--gold, #C9A96E)' : '1px solid var(--bdr, #ccc)',
              fontWeight: activePreset === 'previous_month' ? '700' : '500',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Previous Month
          </button>

          <button
            onClick={() => applyPreset('current_year')}
            style={{
              background: activePreset === 'current_year' ? 'var(--gold, #C9A96E)' : 'transparent',
              color: activePreset === 'current_year' ? 'var(--surf1, #000000)' : 'var(--txt1, #000000)',
              border: activePreset === 'current_year' ? '1px solid var(--gold, #C9A96E)' : '1px solid var(--bdr, #ccc)',
              fontWeight: activePreset === 'current_year' ? '700' : '500',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Current Year
          </button>
        </div>

        {/* Custom Range Inputs directly matching DashboardPage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt1, #000000)' }}>Custom:</span>
          <input
            type="date"
            value={dateRange.dateFrom || ''}
            onChange={(e) => {
              setActivePreset('custom')
              setDateRange(prev => ({ ...prev, dateFrom: e.target.value }))
            }}
            style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
          />
          <span style={{ color: 'var(--txt1, #000000)', fontSize: 13, fontWeight: 500 }}>to</span>
          <input
            type="date"
            value={dateRange.dateTo || ''}
            min={dateRange.dateFrom || undefined}
            onChange={(e) => {
              setActivePreset('custom')
              setDateRange(prev => ({ ...prev, dateTo: e.target.value }))
            }}
            style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
          />
        </div>
      </div>

      <UnifiedStatCards cards={unifiedAnalyticsCards} loading={loading} />

      <div className="two-col" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PieChart size={15} />
              Category Revenue
            </span>
          </div>
          {loading ? <Skeleton rows={3} /> : catDonutData.length === 0 ? (
            <Empty icon={<PieChart size={32} />} text="No category data" />
          ) : (
            <DonutChart data={catDonutData} />
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <CreditCard size={15} />
              Payment Split
            </span>
          </div>
          {loading ? <Skeleton rows={3} /> : !hasPaymentData ? (
            <Empty icon={<CreditCard size={32} />} text="No payment data" />
          ) : (
            <PaymentSplit cash={cashRev} visa={visaRev} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Clock3 size={15} />
            Revenue by Hour
          </span>
        </div>
        {loading ? <Skeleton rows={3} /> : (
          <BarChart data={hourlyChartData} height={200} color="#3B82F6" />
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <span className="card-title">
            <TrendingUp size={15} />
            Daily Revenue Trend
          </span>
        </div>
        {loading ? <Skeleton rows={3} /> : (
          <BarChart data={trendData} height={200} color="#C9A96E" />
        )}
      </div>
    </div>
  )
}