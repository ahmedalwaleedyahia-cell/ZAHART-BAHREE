// Analytics and Report views
// Path: src/pages/AnalyticsPage.jsx
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

// ================= COLORS =================
const CAT_COLORS = {
  food: '#C9A96E',
  drinks: '#3B82F6',
  desserts: '#22C55E',
}

// ================= PERIODS =================
const PERIODS = [
  { key: 'daily', label: 'Last 7 Days', days: 7 },
  { key: 'weekly', label: 'Last 28 Days', days: 28 },
  { key: 'monthly', label: 'Last 90 Days', days: 90 },
]

// ================= SAFE CALL =================
function safeCall(fn, ...args) {
  if (typeof fn !== 'function') {
    return Promise.resolve({ data: [], error: null })
  }
  return fn(...args)
}

// ================= CATEGORY NORMALIZER (Strictly Food, Drinks, Desserts) =================
function normalizeCategory(category) {
  if (!category) return 'food' // افتراضي آمن إذا لم يوجد تصنيف

  const c = String(category).trim().toLowerCase()

  if (c.includes('drink') || c.includes('beverage')) return 'drinks'
  if (c.includes('dessert') || c.includes('sweet')) return 'desserts'

  // افتراضي بقية الأطباق والمأكولات تحت التصنيف الرئيسي food
  return 'food'
}

// ================= COMPONENT =================
export default function AnalyticsPage() {
  const [period, setPeriod] = useState('daily')
  const [dailyData, setDailyData] = useState([])
  const [hourly, setHourly] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(true)

  const { availableProducts } = useProducts()
  const { orders } = useOrders()

  const productCategoryMap = useMemo(() => {
    const map = {}
    if (availableProducts) {
      availableProducts.forEach(p => {
        map[p.id] = normalizeCategory(p.category_slug || p.category)
      })
    }
    return map
  }, [availableProducts])

  // ================= FETCH DATA =================
  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)

      const days =
        PERIODS.find(p => p.key === period)?.days || 7

      try {
        const [d, h, c] = await Promise.all([
          safeCall(fetchDailySales, days),
          safeCall(fetchHourlySales),
          safeCall(fetchCategoryBreakdown),
        ])

        if (!alive) return

        if (Array.isArray(d?.data)) setDailyData(d.data)
        if (Array.isArray(h?.data)) setHourly(h.data)
        if (Array.isArray(c?.data)) setCategoryData(c.data)

      } catch (err) {
        console.error('[Analytics Error]', err)
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    return () => { alive = false }
  }, [period])

  const periodFilteredOrders = useMemo(() => {
    if (!orders) return []
    const days = PERIODS.find(p => p.key === period)?.days || 7
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    return orders.filter(o => {
      if (o.status === 'cancelled') return false
      const rawDate = o.created_at || o.date
      if (!rawDate) return false
      const orderDate = new Date(rawDate)
      return !isNaN(orderDate.getTime()) && orderDate >= cutoffDate
    })
  }, [orders, period])

  // ================= METRICS =================
  const totalRev = useMemo(
    () => periodFilteredOrders.reduce((a, o) => {
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
    () => periodFilteredOrders.reduce((a, o) => {
      const method = (o.payment_method || '').toLowerCase()
      if (method === 'unpaid') return a
      if (method === 'cash' || !method) return a + Number(o.total_amount || o.total || 0)
      return a
    }, 0),
    [periodFilteredOrders]
  )

  const visaRev = useMemo(
    () => periodFilteredOrders.reduce((a, o) => {
      const method = (o.payment_method || '').toLowerCase()
      if (method === 'visa' || method === 'card') return a + Number(o.total_amount || o.total || 0)
      return a
    }, 0),
    [periodFilteredOrders]
  )

  const unifiedAnalyticsCards = useMemo(() => ([
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
    }
  ]), [totalRev, totalOrds, cashRev, visaRev])

  // ================= CATEGORY DATA (Strictly Food, Drinks, Desserts) =================
  const catDonutData = useMemo(() => {
    const grouped = { food: 0, drinks: 0, desserts: 0 }

    if (periodFilteredOrders.length > 0) {
      periodFilteredOrders.forEach(order => {
        if ((order.payment_method || '').toLowerCase() === 'unpaid') return
        const items = order.items || order.order_items || []

        items.forEach(item => {
          const catSlug = productCategoryMap[item.product_id] || normalizeCategory(item.category || item.category_slug)
          const lineTotal = Number(item.line_total || (Number(item.unit_price || item.price || 0) * Number(item.quantity || item.qty || 1)))

          if (grouped[catSlug] !== undefined) {
            grouped[catSlug] += lineTotal
          } else {
            grouped.food += lineTotal // توجيه أي شيء غير متوقع إلى food افتراضياً
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

  const hourlyChartData = useMemo(() => {
    const customHourOrder = [
      7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
      0, 1
    ];
    return customHourOrder.map(hour => {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 === 0 ? 12 : hour % 12;
      const hourLabel = `${displayHour} ${ampm}`;

      const match = hourly.find(i => {
        if (!i) return false;
        const recordLabel = String(i.label || i.hour || '').trim().toLowerCase();

        return recordLabel === hourLabel.toLowerCase() ||
          recordLabel === String(hour) ||
          recordLabel === `${hour}:00`;
      });

      return {
        label: hourLabel,
        value: match ? Number(match.revenue || match.total_revenue || 0) : 0,
      };
    });
  }, [hourly]);

  const trendData = useMemo(() =>
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

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 16
      }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--surf2)',
          padding: 4,
          borderRadius: 8,
          gap: 4
        }}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              style={{
                padding: '6px 14px',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                background: period === p.key ? 'var(--surf3)' : 'transparent',
                color: period === p.key ? 'var(--txt1)' : 'var(--txt3)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <UnifiedStatCards
        cards={unifiedAnalyticsCards}
        loading={loading}
      />

      <div className="two-col" style={{ marginBottom: 14 }}>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <PieChart size={15} /> Category Revenue
            </span>
          </div>

          {loading ? (
            <Skeleton rows={3} />
          ) : catDonutData.length === 0 ? (
            <Empty
              icon={<PieChart size={32} />}
              text="No category data"
            />
          ) : (
            <DonutChart data={catDonutData} />
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">
              <CreditCard size={15} /> Payment Split
            </span>
          </div>

          {loading ? (
            <Skeleton rows={3} />
          ) : !hasPaymentData ? (
            <Empty
              icon={<CreditCard size={32} />}
              text="No payment data"
            />
          ) : (
            <PaymentSplit cash={cashRev} visa={visaRev} />
          )}
        </div>

      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Clock3 size={15} /> Revenue by Hour
          </span>
        </div>

        {loading ? (
          <Skeleton rows={3} />
        ) : (
          <BarChart
            data={hourlyChartData}
            height={200}
            color="#3B82F6"
          />
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-header">
          <span className="card-title">
            <TrendingUp size={15} /> Daily Revenue Trend
          </span>
        </div>

        {loading ? (
          <Skeleton rows={3} />
        ) : (
          <BarChart
            data={trendData}
            height={200}
            color="#C9A96E"
          />
        )}
      </div>

    </div>
  )
}