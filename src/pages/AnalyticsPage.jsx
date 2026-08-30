import { useOrders } from '../context/OrdersContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { useState, useEffect, useMemo } from 'react'
import { fmtNum, fmtDateTime } from '../utils/format.js'

import {
  fetchBestSellers,
  fetchDailySales,
  fetchHourlySales,
  fetchCategoryBreakdown,
  fetchYearSummary,
  fetchTodaySummary,
  fetchOrders
} from '../services/orderService.js'

import BarChart from '../components/ui/BarChart.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import Empty from '../components/ui/Empty.jsx'
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'
import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'

import {
  Clock3,
  Package,
  TrendingUp,
  Inbox,
  FileText,
  AlertTriangle
} from 'lucide-react'

import '../styles/finance.css'
import '../styles/unified-cards.css'

const getLocalDateString = (dateInput) => {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

async function safeCall(fn, ...args) {
  if (typeof fn !== 'function') return { data: [], error: null }
  return fn(...args)
}

export default function DashboardPage() {
  const { orders, loading: globalLoading } = useOrders()
  const { products } = useProducts()

  const [dateFrom, setDateFrom] = useState(() => getLocalDateString(new Date()))
  const [dateTo, setDateTo] = useState(() => getLocalDateString(new Date()))

  const [bestSellers, setBestSellers] = useState([])
  const [weekData, setWeekData] = useState([])
  const [recentOrders, setRecentOrders] = useState([])
  const [chartsLoading, setChartsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setChartsLoading(true)
      const options = { dateFrom, dateTo }

      try {
        const start = new Date(dateFrom)
        const end = new Date(dateTo)
        const diffDays = Math.max(
          1,
          Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
        )

        const [bs, wd, ro] = await Promise.all([
          safeCall(fetchBestSellers, 5, options),
          safeCall(fetchDailySales, diffDays, options),
          safeCall(fetchOrders, { limit: 6, dateFrom, dateTo })
        ])

        if (!isActive) return

        if (Array.isArray(bs?.data)) setBestSellers(bs.data)
        if (Array.isArray(wd?.data)) setWeekData(wd.data)
        if (Array.isArray(ro?.data)) setRecentOrders(ro.data)

      } catch (err) {
        console.error('[Dashboard Error]', err)
      } finally {
        if (isActive) setChartsLoading(false)
      }
    }

    load()
    return () => { isActive = false }
  }, [orders?.length, dateFrom, dateTo])

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter(o => {
      if (o.status === 'cancelled') return false
      const rawDate = o.created_at || o.date
      const orderDateStr = getLocalDateString(rawDate)
      if (!orderDateStr) return false
      if (dateFrom && orderDateStr < dateFrom) return false
      if (dateTo && orderDateStr > dateTo) return false
      return true
    })
  }, [orders, dateFrom, dateTo])

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

      <UnifiedStatCards cards={statCardsConfiguration} loading={globalLoading || chartsLoading} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title" style={{ color: 'var(--amber)' }}><AlertTriangle size={16} /> Inventory Alerts</span>
          <span className="card-badge">{alertProducts.length} alert{alertProducts.length !== 1 ? 's' : ''}</span>
        </div>
        {alertProducts.length === 0 ? (
          <div style={{ padding: '10px 0', color: 'var(--txt3)', fontSize: '13px' }}>All tracked drink and dessert items are adequately stocked.</div>
        ) : (
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {alertProducts.map(p => {
              const isOut = p.category_slug === 'drinks' ? (p.current_stock || 0) <= 0 : (p.current_weight || 0) <= 0
              const valueLabel = p.category_slug === 'drinks' ? `${p.current_stock || 0} left` : `${p.current_weight || 0} ${p.stock_unit || 'g'} left`
              return (
                <div key={p.id} className="list-row" style={{ justifyContent: 'space-linejoin' }}>
                  <span style={{ fontWeight: '500' }}>{p.name_ar || p.name}</span>
                  <span className="badge" style={{ backgroundColor: isOut ? 'var(--red-bg)' : 'var(--amber-bg)', color: isOut ? 'var(--red)' : 'var(--amber)' }}>
                    {isOut ? '🔴 Out Of Stock' : '🟡 Low Stock'} ({valueLabel})
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-header"><span className="card-title"><Package size={15} /> Best Sellers</span></div>
          {chartsLoading ? <Skeleton rows={5} /> : bestSellers.length === 0 ? (
            <Empty icon={<Inbox size={32} />} text="No sales yet" />
          ) : (
            bestSellers.map((b, i) => (
              <div key={i} className="list-row">
                <span>#{i + 1}</span>
                <span>{b.product_name}</span>
                <span>{b.total_qty} sold</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title"><Clock3 size={15} /> Recent Orders</span></div>
          {globalLoading || chartsLoading ? <Skeleton rows={5} /> : recentOrders.length === 0 ? (
            <Empty icon={<FileText size={32} />} text="No orders" />
          ) : (
            recentOrders.map(o => (
              <div key={o.id} className="list-row">
                <span>#{o.invoice_number || o.order_number || '1'}</span>
                <span>{fmtDateTime(o.created_at)}</span>
                <span>AED {fmtNum(o.total_amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><span className="card-title"><TrendingUp size={15} /> Sales Timeline</span></div>
        <BarChart data={weekData.map(d => ({ label: d.sale_date, value: Number(d.total_revenue || 0) }))} color="#C9A96E" height={180} />
      </div>
    </div>
  )
}