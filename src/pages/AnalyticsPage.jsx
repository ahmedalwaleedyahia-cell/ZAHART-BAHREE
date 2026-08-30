// ============================================================
// Analytics and Report views
// Path: src/pages/AnalyticsPage.jsx
// ============================================================

import { useEffect, useState, useMemo } from 'react'

import {
  TrendingUp,
  Clock3,
  PieChart,
  CreditCard,
  Check,
} from 'lucide-react'

import { fmtNum } from '../utils/format.js'

import { useProducts } from '../context/ProductsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'

import {
  fetchDailySales,
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
    return Promise.resolve({
      data: [],
      error: null,
    })
  }

  return fn(...args)
}

// ============================================================
// CATEGORY NORMALIZER
// ============================================================

function normalizeCategory(category) {
  if (!category) return 'food'

  const c = String(category)
    .trim()
    .toLowerCase()

  if (
    c.includes('drink') ||
    c.includes('beverage')
  ) {
    return 'drinks'
  }

  if (
    c.includes('dessert') ||
    c.includes('sweet')
  ) {
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

// ============================================================
// COMPONENT
// ============================================================

export default function AnalyticsPage() {

  // ==========================================================
  // FILTER STATE
  // ==========================================================

  const [customRange, setCustomRange] = useState({
    start: '',
    end: '',
  })

  const [dateRange, setDateRange] = useState({
    dateFrom: null,
    dateTo: null,
  })

  // ==========================================================
  // DATA STATE
  // ==========================================================

  const [dailyData, setDailyData] = useState([])
  const [categoryData, setCategoryData] = useState([])

  const [loading, setLoading] = useState(true)

  // ==========================================================
  // CONTEXT
  // ==========================================================

  const { availableProducts } = useProducts()
  const { orders } = useOrders()

  // ==========================================================
  // PRODUCT CATEGORY MAP
  // ==========================================================

  const productCategoryMap = useMemo(() => {
    const map = {}

    if (availableProducts) {
      availableProducts.forEach(product => {
        map[product.id] = normalizeCategory(
          product.category_slug ||
          product.category
        )
      })
    }

    return map
  }, [availableProducts])

  // ==========================================================
  // CUSTOM RANGE
  // ==========================================================

  const handleCustomApply = (e) => {
    e.preventDefault()

    if (
      !customRange.start ||
      !customRange.end
    ) {
      return
    }

    // Prevent invalid range
    if (
      customRange.start >
      customRange.end
    ) {
      return
    }

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
        const {
          dateFrom,
          dateTo,
        } = dateRange

        const [dailyRes, categoryRes] =
          await Promise.all([
            safeCall(
              fetchDailySales,
              7,
              {
                dateFrom,
                dateTo,
              }
            ),

            safeCall(
              fetchCategoryBreakdown,
              {
                dateFrom,
                dateTo,
              }
            ),
          ])

        if (!alive) return

        if (
          Array.isArray(
            dailyRes?.data
          )
        ) {
          setDailyData(
            dailyRes.data
          )
        } else {
          setDailyData([])
        }

        if (
          Array.isArray(
            categoryRes?.data
          )
        ) {
          setCategoryData(
            categoryRes.data
          )
        } else {
          setCategoryData([])
        }

      } catch (err) {

        console.error(
          '[Analytics Error]',
          err
        )

        if (alive) {
          setDailyData([])
          setCategoryData([])
        }

      } finally {

        if (alive) {
          setLoading(false)
        }

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

      // Cancelled orders excluded
      if (
        String(order.status || '')
          .toLowerCase() === 'cancelled'
      ) {
        return false
      }

      const rawDate =
        order.created_at ||
        order.date

      if (!rawDate) {
        return false
      }

      const orderDate =
        new Date(rawDate)

      if (
        isNaN(
          orderDate.getTime()
        )
      ) {
        return false
      }

      // ------------------------------------------------------
      // ALL TIME
      // ------------------------------------------------------

      if (
        !dateRange.dateFrom &&
        !dateRange.dateTo
      ) {
        return true
      }

      // ------------------------------------------------------
      // DATE RANGE
      // ------------------------------------------------------

      const start =
        dateRange.dateFrom
          ? new Date(
            `${dateRange.dateFrom}T00:00:00.000Z`
          )
          : null

      const end =
        dateRange.dateTo
          ? new Date(
            `${dateRange.dateTo}T23:59:59.999Z`
          )
          : null

      if (
        start &&
        orderDate < start
      ) {
        return false
      }

      if (
        end &&
        orderDate > end
      ) {
        return false
      }

      return true
    })

  }, [
    orders,
    dateRange,
  ])

  // ==========================================================
  // REVENUE ORDERS
  // ==========================================================

  const revenueOrders = useMemo(() => {

    return periodFilteredOrders.filter(
      order => {

        const paymentMethod =
          String(
            order.payment_method || ''
          )
            .trim()
            .toLowerCase()

        if (
          paymentMethod === 'unpaid'
        ) {
          return false
        }

        return true
      }
    )

  }, [periodFilteredOrders])

  // ==========================================================
  // TOTAL REVENUE
  // ==========================================================

  const totalRev = useMemo(
    () =>
      revenueOrders.reduce(
        (total, order) =>
          total +
          Number(
            order.total_amount ??
            order.total ??
            0
          ),
        0
      ),
    [revenueOrders]
  )

  // ==========================================================
  // TOTAL ORDERS
  // ==========================================================

  const totalOrds = useMemo(
    () =>
      revenueOrders.length,
    [revenueOrders]
  )

  // ==========================================================
  // CASH REVENUE
  // ==========================================================

  const cashRev = useMemo(
    () =>
      revenueOrders.reduce(
        (total, order) => {

          const method =
            String(
              order.payment_method || ''
            )
              .trim()
              .toLowerCase()

          if (
            method === 'cash' ||
            !method
          ) {
            return (
              total +
              Number(
                order.total_amount ??
                order.total ??
                0
              )
            )
          }

          return total
        },
        0
      ),
    [revenueOrders]
  )

  // ==========================================================
  // VISA / CARD REVENUE
  // ==========================================================

  const visaRev = useMemo(
    () =>
      revenueOrders.reduce(
        (total, order) => {

          const method =
            String(
              order.payment_method || ''
            )
              .trim()
              .toLowerCase()

          if (
            method === 'visa' ||
            method === 'card'
          ) {
            return (
              total +
              Number(
                order.total_amount ??
                order.total ??
                0
              )
            )
          }

          return total
        },
        0
      ),
    [revenueOrders]
  )

  // ==========================================================
  // UNIFIED ANALYTICS CARDS
  // ==========================================================

  const unifiedAnalyticsCards =
    useMemo(
      () => [
        {
          id: 'an-rev',
          label:
            'Revenue (Selected Period)',
          value:
            `AED ${fmtNum(totalRev)}`,
          type: 'revenue',
          subtitle:
            'Gross interval value',
        },

        {
          id: 'an-ord',
          label: 'Total Orders',
          value: totalOrds,
          type: 'orders',
          subtitle:
            'Paid orders',
        },

        {
          id: 'an-cash',
          label: 'Cash Revenue',
          value:
            `AED ${fmtNum(cashRev)}`,
          type: 'avg_order',
          subtitle:
            'Cash payments',
        },

        {
          id: 'an-visa',
          label: 'Card Revenue',
          value:
            `AED ${fmtNum(visaRev)}`,
          type: 'vat',
          subtitle:
            'Card payments',
        },
      ],
      [
        totalRev,
        totalOrds,
        cashRev,
        visaRev,
      ]
    )

  // ==========================================================
  // CATEGORY DATA
  // ==========================================================

  const catDonutData = useMemo(() => {

    const grouped = {
      food: 0,
      drinks: 0,
      desserts: 0,
    }

    if (
      periodFilteredOrders.length > 0
    ) {

      periodFilteredOrders.forEach(
        order => {

          const paymentMethod =
            String(
              order.payment_method || ''
            )
              .trim()
              .toLowerCase()

          if (
            paymentMethod === 'unpaid'
          ) {
            return
          }

          const items =
            order.items ||
            order.order_items ||
            []

          items.forEach(item => {

            const catSlug =
              productCategoryMap[
              item.product_id
              ] ||
              normalizeCategory(
                item.category ||
                item.category_slug
              )

            const quantity =
              Number(
                item.quantity ??
                item.qty ??
                1
              )

            const unitPrice =
              Number(
                item.unit_price ??
                item.price ??
                0
              )

            const lineTotal =
              Number(
                item.line_total ??
                quantity *
                unitPrice
              )

            if (
              grouped[
              catSlug
              ] !== undefined
            ) {
              grouped[
                catSlug
              ] += lineTotal
            } else {
              grouped.food +=
                lineTotal
            }

          })

        }
      )

    } else if (
      categoryData?.length
    ) {

      categoryData.forEach(
        item => {

          const key =
            normalizeCategory(
              item.category
            )

          if (
            grouped[key] !== undefined
          ) {
            grouped[key] +=
              Number(
                item.revenue || 0
              )
          } else {
            grouped.food +=
              Number(
                item.revenue || 0
              )
          }

        }
      )

    }

    return Object.entries(
      grouped
    )
      .filter(
        ([, value]) =>
          value > 0
      )
      .map(
        ([key, value]) => ({
          label: key,
          value,
          color:
            CAT_COLORS[key] ||
            '#C9A96E',
        })
      )

  }, [
    periodFilteredOrders,
    productCategoryMap,
    categoryData,
  ])

  // ==========================================================
  // REVENUE BY HOUR
  // ==========================================================
  // IMPORTANT:
  // We calculate the hourly revenue directly
  // from OrdersContext instead of fetchHourlySales().
  // This avoids problems with the hourly service/view.
  // ==========================================================

  const hourlyChartData =
    useMemo(() => {

      const hours = [
        7,
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        0,
        1,
      ]

      const totals = {}

      hours.forEach(
        hour => {
          totals[hour] = 0
        }
      )

      revenueOrders.forEach(
        order => {

          const rawDate =
            order.created_at ||
            order.date

          if (!rawDate) {
            return
          }

          const date =
            new Date(rawDate)

          if (
            isNaN(
              date.getTime()
            )
          ) {
            return
          }

          // --------------------------------------------------
          // Convert UTC timestamp to UAE time
          // --------------------------------------------------

          const dubaiParts =
            new Intl.DateTimeFormat(
              'en-US',
              {
                timeZone:
                  'Asia/Dubai',
                hour: 'numeric',
                hour12: false,
              }
            ).formatToParts(date)

          const hourPart =
            dubaiParts.find(
              part =>
                part.type === 'hour'
            )

          if (!hourPart) {
            return
          }

          const hour =
            Number(
              hourPart.value
            )

          if (
            totals[hour] !== undefined
          ) {

            totals[hour] +=
              Number(
                order.total_amount ??
                order.total ??
                0
              )
          }

        }
      )

      return hours.map(
        hour => {

          const displayHour =
            hour % 12 === 0
              ? 12
              : hour % 12

          const ampm =
            hour >= 12
              ? 'PM'
              : 'AM'

          return {
            label:
              `${displayHour} ${ampm}`,
            value:
              Number(
                totals[hour] || 0
              ),
          }
        }
      )

    }, [revenueOrders])

  // ==========================================================
  // DAILY REVENUE TREND
  // ==========================================================

  const trendData = useMemo(
    () =>
      dailyData.map(
        item => {

          let label =
            item.sale_date

          try {
            label =
              new Date(
                item.sale_date
              ).toLocaleDateString(
                'en-AE',
                {
                  month: 'short',
                  day: 'numeric',
                }
              )
          } catch {
            // Keep original label
          }

          return {
            label,
            value:
              Number(
                item.total_revenue ??
                item.revenue ??
                0
              ),
          }
        }
      ),
    [dailyData]
  )

  // ==========================================================
  // PAYMENT DATA
  // ==========================================================

  const hasPaymentData =
    cashRev > 0 ||
    visaRev > 0

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="scroll-view">

      {/* ====================================================
          CUSTOM RANGE FILTER ONLY
          ==================================================== */}

      <div
        className="dashboard-filter-container"
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          background:
            'var(--surf2, #ffffff)',
          border:
            '1px solid var(--bdr, #eee)',
          padding: '12px',
          borderRadius: '14px',
        }}
      >

        <form
          onSubmit={
            handleCustomApply
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            width: '100%',
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              color:
                'var(--txt1, #000000)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Clock3 size={15} />
            Custom Range
          </div>

          <input
            type="date"
            value={
              customRange.start
            }
            onChange={e =>
              setCustomRange(
                prev => ({
                  ...prev,
                  start:
                    e.target.value,
                })
              )
            }
            required
            style={{
              background:
                'var(--surf1, #ffffff)',
              color:
                'var(--txt1, #000000)',
              border:
                '1px solid var(--bdr, #ccc)',
              borderRadius: 6,
              padding:
                '6px 8px',
            }}
          />

          <span
            style={{
              color:
                'var(--txt1, #000000)',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            to
          </span>

          <input
            type="date"
            value={
              customRange.end
            }
            min={
              customRange.start ||
              undefined
            }
            onChange={e =>
              setCustomRange(
                prev => ({
                  ...prev,
                  end:
                    e.target.value,
                })
              )
            }
            required
            style={{
              background:
                'var(--surf1, #ffffff)',
              color:
                'var(--txt1, #000000)',
              border:
                '1px solid var(--bdr, #ccc)',
              borderRadius: 6,
              padding:
                '6px 8px',
            }}
          />

          <button
            type="submit"
            title="Apply Custom Range"
            style={{
              background:
                'var(--gold, #C9A96E)',
              color:
                'var(--surf1, #000000)',
              border: 'none',
              borderRadius: 6,
              padding:
                '7px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent:
                'center',
              fontWeight: 700,
            }}
          >
            <Check size={14} />
          </button>

        </form>

      </div>

      {/* ====================================================
          UNIFIED STAT CARDS
          ==================================================== */}

      <UnifiedStatCards
        cards={
          unifiedAnalyticsCards
        }
        loading={loading}
      />

      {/* ====================================================
          CATEGORY + PAYMENT
          ==================================================== */}

      <div
        className="two-col"
        style={{
          marginBottom: 14,
        }}
      >

        {/* CATEGORY */}

        <div className="card">

          <div className="card-header">

            <span className="card-title">

              <PieChart size={15} />

              Category Revenue

            </span>

          </div>

          {loading ? (

            <Skeleton rows={3} />

          ) : catDonutData.length === 0 ? (

            <Empty
              icon={
                <PieChart
                  size={32}
                />
              }
              text="No category data"
            />

          ) : (

            <DonutChart
              data={
                catDonutData
              }
            />

          )}

        </div>

        {/* PAYMENT */}

        <div className="card">

          <div className="card-header">

            <span className="card-title">

              <CreditCard
                size={15}
              />

              Payment Split

            </span>

          </div>

          {loading ? (

            <Skeleton rows={3} />

          ) : !hasPaymentData ? (

            <Empty
              icon={
                <CreditCard
                  size={32}
                />
              }
              text="No payment data"
            />

          ) : (

            <PaymentSplit
              cash={cashRev}
              visa={visaRev}
            />

          )}

        </div>

      </div>

      {/* ====================================================
          REVENUE BY HOUR
          ==================================================== */}

      <div className="card">

        <div className="card-header">

          <span className="card-title">

            <Clock3 size={15} />

            Revenue by Hour

          </span>

        </div>

        {loading ? (

          <Skeleton rows={3} />

        ) : hourlyChartData.every(
          item =>
            Number(item.value) === 0
        ) ? (

          <Empty
            icon={
              <Clock3 size={32} />
            }
            text="No hourly revenue data"
          />

        ) : (

          <BarChart
            data={
              hourlyChartData
            }
            height={200}
            color="#3B82F6"
          />

        )}

      </div>

      {/* ====================================================
          DAILY REVENUE TREND
          ==================================================== */}

      <div
        className="card"
        style={{
          marginTop: 14,
        }}
      >

        <div className="card-header">

          <span className="card-title">

            <TrendingUp
              size={15}
            />

            Daily Revenue Trend

          </span>

        </div>

        {loading ? (

          <Skeleton rows={3} />

        ) : trendData.length === 0 ? (

          <Empty
            icon={
              <TrendingUp
                size={32}
              />
            }
            text="No daily revenue data"
          />

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