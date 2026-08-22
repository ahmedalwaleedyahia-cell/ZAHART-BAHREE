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
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'

import '../styles/unified-cards.css'

const CAT_COLORS = {
  food: '#C9A96E',
  drinks: '#3B82F6',
  desserts: '#22C55E',
  other: '#888888',
}

function safeCall(fn, ...args) {
  if (typeof fn !== 'function') {
    return Promise.resolve({ data: [], error: null })
  }
  return fn(...args)
}

function normalizeCategory(category) {
  if (!category) return 'other'

  const c = String(category).trim().toLowerCase()

  if (['food', 'foods', 'طعام', 'وجبات', 'أطعمة', 'اطعمة', 'مأكولات'].includes(c)) return 'food'
  if (['drink', 'drinks', 'مشروبات', 'عصائر', 'مشروب'].includes(c)) return 'drinks'
  if (['dessert', 'desserts', 'حلا', 'حلويات', 'حلوى'].includes(c)) return 'desserts'

  return 'other'
}

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })

  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [dailyData, setDailyData] = useState([])
  const [hourly, setHourly] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    const load = async () => {
      setLoading(true)

      try {
        const diffDays = Math.max(
          1,
          Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)) + 1
        )

        const filterObj = { dateFrom, dateTo }

        const [d, h, c] = await Promise.all([
          safeCall(fetchDailySales, diffDays, filterObj),
          safeCall(fetchHourlySales, filterObj),
          safeCall(fetchCategoryBreakdown, filterObj),
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
  }, [dateFrom, dateTo])

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

  const unifiedAnalyticsCards = useMemo(() => ([
    {
      id: 'an-rev',
      label: 'Revenue (Selected Range)',
      value: `AED ${fmtNum(totalRev)}`,
      type: 'revenue',
      subtitle: `${dateFrom} to ${dateTo}`,
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
  ]), [totalRev, totalOrds, cashRev, visaRev, dateFrom, dateTo])

  const catDonutData = useMemo(() => {
    const rawData = categoryData || []

    const grouped = rawData.reduce((acc, item) => {
      const key = normalizeCategory(item.category)
      acc[key] = (acc[key] || 0) + Number(item.revenue || 0)
      return acc
    }, {})

    const sumCategories = Object.values(grouped).reduce((a, b) => a + b, 0)

    if (totalRev > 0) {
      if (sumCategories === 0) {
        grouped.food = totalRev
      } else if (totalRev > sumCategories) {
        const diff = totalRev - sumCategories
        const primaryKey = grouped.food ? 'food' : (Object.keys(grouped)[0] || 'food')
        grouped[primaryKey] = (grouped[primaryKey] || 0) + diff
      }
    }

    return Object.entries(grouped)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => ({
        label: key,
        value: Number(value.toFixed(2)),
        color: CAT_COLORS[key] || CAT_COLORS.other,
      }))
  }, [categoryData, totalRev])

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

      <DashboardFilter
        dateFrom={dateFrom}
        dateTo={dateTo}
        onFilterChange={({ dateFrom, dateTo }) => {
          setDateFrom(dateFrom)
          setDateTo(dateTo)
        }}
      />

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
            <Empty icon={<PieChart size={32} />} text="No category data" />
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
            <Empty icon={<CreditCard size={32} />} text="No payment data" />
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
          <BarChart data={hourlyChartData} height={200} color="#3B82F6" />
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
          <BarChart data={trendData} height={200} color="#C9A96E" />
        )}
      </div>

    </div>
  )
}