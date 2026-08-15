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

async function safeCall(fn, ...args) {
  if (typeof fn !== 'function') {
    return { data: [], error: null }
  }
  return fn(...args)
}

export default function DashboardPage() {
  const { todaySummary: contextSummary, orders, loading: globalLoading } = useOrders()
  const { products } = useProducts()

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })

  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const [bestSellers, setBestSellers] = useState([])
  const [weekData, setWeekData] = useState([])
  const [hourlyData, setHourlyData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [dynamicSummary, setDynamicSummary] = useState(null)
  const [recentOrders, setRecentOrders] = useState([])
  const [chartsLoading, setChartsLoading] = useState(true)

  useEffect(() => {
    let isActive = true

    const load = async () => {
      setChartsLoading(true)
      const options = { dateFrom, dateTo }

      try {
        const diffDays = Math.max(
          1,
          Math.ceil((new Date(dateTo) - new Date(dateFrom)) / (1000 * 60 * 60 * 24)) + 1
        )

        const [bs, wd, hd, cd, ys, ds, ro] = await Promise.all([
          safeCall(fetchBestSellers, 5, options),
          safeCall(fetchDailySales, diffDays, options),
          safeCall(fetchHourlySales, options),
          safeCall(fetchCategoryBreakdown, options),
          safeCall(fetchYearSummary, options),
          safeCall(fetchTodaySummary, options),
          safeCall(fetchOrders, { limit: 6, dateFrom, dateTo })
        ])

        if (!isActive) return

        if (Array.isArray(bs?.data)) setBestSellers(bs.data)
        if (Array.isArray(wd?.data)) setWeekData(wd.data)
        if (Array.isArray(hd?.data)) setHourlyData(hd.data)
        if (Array.isArray(cd?.data)) setCategoryData(cd.data)
        if (ds?.data) setDynamicSummary(ds.data)
        if (Array.isArray(ro?.data)) setRecentOrders(ro.data)

      } catch (err) {
        console.error('[Dashboard Error]', err)
      } finally {
        if (isActive) setChartsLoading(false)
      }
    }

    load()

    return () => {
      isActive = false
    }
  }, [orders?.length, dateFrom, dateTo])

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    return orders.filter(o => {
      if (o.status === 'cancelled') return false
      if (!dateFrom && !dateTo) return true

      const created = new Date(o.created_at)
      if (dateFrom) {
        const start = new Date(dateFrom)
        start.setHours(0, 0, 0, 0)
        if (created < start) return false
      }
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        if (created > end) return false
      }
      return true
    })
  }, [orders, dateFrom, dateTo])

  const summary = useMemo(() => {
    if (filteredOrders.length >= 0) {
      const revenue = filteredOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
      const count = filteredOrders.length
      const vat = filteredOrders.reduce((sum, o) => sum + Number(o.vat_amount || 0), 0)
      const avg = count > 0 ? revenue / count : 0
      return { revenue, orders: count, avg, vat }
    }

    const dataSource = dynamicSummary || contextSummary
    return {
      revenue: Number(dataSource?.total_revenue || 0),
      orders: Number(dataSource?.order_count || 0),
      avg: Number(dataSource?.avg_order_value || 0),
      vat: Number(dataSource?.total_vat || 0),
    }
  }, [contextSummary, dynamicSummary, filteredOrders])

  const alertProducts = useMemo(() => {
    if (!products) return []
    return products.filter(p => {
      if (!p.inventory_enabled) return false
      if (p.category_slug === 'drinks') {
        return (p.current_stock || 0) <= (p.minimum_stock || 0)
      }
      if (p.category_slug === 'desserts') {
        return (p.current_weight || 0) <= (p.minimum_stock || 0)
      }
      return false
    })
  }, [products])

  const statCardsConfiguration = useMemo(() => ([
    {
      id: 'rev',
      label: "Selected Revenue",
      value: `AED ${fmtNum(summary.revenue)}`,
      type: 'revenue',
      subtitle: `${dateFrom} to ${dateTo}`
    },
    {
      id: 'ord',
      label: 'Filtered Orders',
      value: summary.orders,
      type: 'orders',
      subtitle: 'Processed orders'
    },
    {
      id: 'avg',
      label: 'Avg Order',
      value: `AED ${fmtNum(summary.avg)}`,
      type: 'avg_order',
      subtitle: 'Average ticket'
    },
    {
      id: 'vat',
      label: 'VAT Collected',
      value: `AED ${fmtNum(summary.vat)}`,
      type: 'vat',
      subtitle: 'Selected range context'
    },
  ]), [summary, dateFrom, dateTo])

  return (
    <div className="scroll-view">
      <div className="greeting-bar">
        <div className="greeting-title">WELCOME TO ZAHART BAHREE.Pos</div>
        <div className="greeting-sub">
          {new Date().toLocaleDateString('en-AE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
          {' · Abu Dhabi, UAE'}
        </div>
      </div>

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
          <span className="card-title" style={{ color: 'var(--amber)' }}>
            <AlertTriangle size={16} /> Inventory Alerts
          </span>
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
                <div key={p.id} className="list-row" style={{ justifyContent: 'space-between' }}>
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
          <div className="card-header">
            <span className="card-title"><Package size={15} /> Best Sellers</span>
          </div>
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
          <div className="card-header">
            <span className="card-title"><Clock3 size={15} /> Recent Orders</span>
          </div>
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
        <div className="card-header">
          <span className="card-title"><TrendingUp size={15} /> Sales Timeline</span>
        </div>
        <BarChart data={weekData.map(d => ({ label: d.sale_date, value: Number(d.total_revenue || 0) }))} color="#C9A96E" height={180} />
      </div>
    </div>
  )
}