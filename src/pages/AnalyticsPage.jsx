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
// DATE HELPERS
// ============================================================

const formatDate = (date) => {
  return date.toISOString().split('T')[0]
}

export default function AnalyticsPage() {

  // ----------------------------------------------------------
  // FILTER STATE
  // ----------------------------------------------------------

  const [activePreset, setActivePreset] = useState('all')

  const [customRange, setCustomRange] = useState({
    start: '',
    end: '',
  })

  const [showCustom, setShowCustom] = useState(false)

  const [dateRange, setDateRange] = useState({
    dateFrom: null,
    dateTo: null,
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
  // APPLY PRESET
  // ==========================================================

  const applyPreset = (presetType) => {
    setActivePreset(presetType)
    setShowCustom(false)

    const now = new Date()
    let dateFrom = null
    let dateTo = null

    if (presetType === 'all') {
      dateFrom = null
      dateTo = null
    } else if (presetType === 'current_month') {
      dateFrom = formatDate(new Date(now.getFullYear(), now.getMonth(), 1))
      dateTo = formatDate(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    } else if (presetType === 'previous_month') {
      dateFrom = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      dateTo = formatDate(new Date(now.getFullYear(), now.getMonth(), 0))
    } else if (presetType === 'current_year') {
      dateFrom = `${now.getFullYear()}-01-01`
      dateTo = `${now.getFullYear()}-12-31`
    }

    setDateRange({ dateFrom, dateTo })
  }

  // ==========================================================
  // CUSTOM RANGE
  // ==========================================================

  const handleCustomApply = (e) => {
    e.preventDefault()

    if (!customRange.start || !customRange.end) return
    if (customRange.start > customRange.end) return

    setActivePreset('custom')
    setShowCustom(false)

    setDateRange({
      dateFrom: customRange.start,
      dateTo: customRange.end,
    })
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

        const [d, h, c] = await Promise.all([
          safeCall(fetchDailySales, 7, { dateFrom, dateTo }),
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
  // FILTER ORDERS
  // ==========================================================

  const periodFilteredOrders = useMemo(() => {
    if (!orders) return []

    return orders.filter(order => {
      if (order.status === 'cancelled') return false

      const rawDate = order.created_at || order.date
      if (!rawDate) return false

      const orderDate = new Date(rawDate)
      if (isNaN(orderDate.getTime())) return false

      if (!dateRange.dateFrom && !dateRange.dateTo) return true

      const start = dateRange.dateFrom
        ? new Date(`${dateRange.dateFrom}T00:00:00.000Z`)
        : null

      const end = dateRange.dateTo
        ? new Date(`${dateRange.dateTo}T23:59:59.999Z`)
        : null

      if (start && orderDate < start) return false
      if (end && orderDate > end) return false

      return true
    })
  }, [orders, dateRange])

  // ==========================================================
  // METRICS
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
        subtitle: 'Gross interval value',
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
    [totalRev, totalOrds, cashRev, visaRev]
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
  // HOURLY CHART DATA (Fixed for matching format)
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

          <button
            onClick={() => setShowCustom(!showCustom)}
            style={{
              background: activePreset === 'custom' ? 'var(--gold, #C9A96E)' : 'transparent',
              color: activePreset === 'custom' ? 'var(--surf1, #000000)' : 'var(--txt1, #000000)',
              border: activePreset === 'custom' ? '1px solid var(--gold, #C9A96E)' : '1px solid var(--bdr, #ccc)',
              fontWeight: activePreset === 'custom' ? '700' : '500',
              padding: '6px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Clock3 size={14} />
            Custom Range
          </button>
        </div>

        {showCustom && (
          <form
            onSubmit={handleCustomApply}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surf3, #f9f9f9)',
              border: '1px solid var(--bdr, #eee)',
              padding: '6px 12px',
              borderRadius: 8,
            }}
          >
            <input
              type="date"
              value={customRange.start}
              onChange={e => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
              required
              style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
            />
            <span style={{ color: 'var(--txt1, #000000)', fontSize: 13, fontWeight: 500 }}>to</span>
            <input
              type="date"
              value={customRange.end}
              min={customRange.start || undefined}
              onChange={e => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
              required
              style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
            />
            <button
              type="submit"
              style={{ background: 'var(--gold, #C9A96E)', color: 'var(--surf1, #000000)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}
            >
              ✓
            </button>
          </form>
        )}
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