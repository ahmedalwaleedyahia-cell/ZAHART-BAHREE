import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Clock3, PieChart, CreditCard } from 'lucide-react'
import { fmtNum } from '../utils/format.js'

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
  other: '#888888',
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

// ================= CATEGORY NORMALIZER =================
function normalizeCategory(category) {
  if (!category) return 'other'

  const c = String(category).trim().toLowerCase()

  if (c === 'food' || c === 'foods') return 'food'
  if (c === 'drink' || c === 'drinks') return 'drinks'
  if (c === 'dessert' || c === 'desserts') return 'desserts'

  return 'other'
}

// ================= COMPONENT =================
export default function AnalyticsPage() {
  const [period, setPeriod] = useState('daily')
  const [dailyData, setDailyData] = useState([])
  const [hourly, setHourly] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(true)

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

  // ================= METRICS =================
  const totalRev = useMemo(
    () => dailyData.reduce((a, d) => a + Number(d.total_revenue || 0), 0),
    [dailyData]
  )

  const totalOrds = useMemo(
    () => dailyData.reduce((a, d) => a + Number(d.order_count || 0), 0),
    [dailyData]
  )

  const cashRev = useMemo(
    () => dailyData.reduce((a, d) => a + Number(d.cash_revenue || 0), 0),
    [dailyData]
  )

  const visaRev = useMemo(
    () => dailyData.reduce((a, d) => a + Number(d.visa_revenue || 0), 0),
    [dailyData]
  )

  // ================= CARDS =================
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

  // ================= CATEGORY DATA =================
  const catDonutData = useMemo(() => {
    if (!categoryData?.length) return []

    const grouped = categoryData.reduce((acc, item) => {
      const key = normalizeCategory(item.category)
      acc[key] = (acc[key] || 0) + Number(item.revenue || 0)
      return acc
    }, {})

    const result = Object.entries(grouped).map(([key, value]) => ({
      label: key,
      value,
      color: CAT_COLORS[key] || CAT_COLORS.other,
    }))

    if (result.every(r => r.value === 0)) return []
    return result
  }, [categoryData])

  // ================= HOURLY =================
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
        if (!i || !i.label) return false;
        const cleanServerLabel = String(i.label).replace(/\s+/g, '').toLowerCase();
        const cleanLocalLabel = hourLabel.replace(/\s+/g, '').toLowerCase();

        return cleanServerLabel === cleanLocalLabel;
      });

      return {
        label: hourLabel,
        value: match ? Number(match.revenue || 0) : 0,
      };
    });
  }, [hourly]);

  // ================= TREND =================
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

  // ================= UI =================
  return (
    <div className="scroll-view">

      {/* PERIOD SELECTOR */}
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

      {/* CARDS */}
      <UnifiedStatCards
        cards={unifiedAnalyticsCards}
        loading={loading}
      />

      {/* CATEGORY + PAYMENT */}
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

      {/* HOURLY */}
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

      {/* TREND */}
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