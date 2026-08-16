import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingBag, Users, Layers, ArrowRight, Calendar } from 'lucide-react'
import { useOrders } from '../context/OrdersContext.jsx'

import {
  fetchFinanceSummary,
  EXPENSE_CATEGORIES_LIST
} from '../services/financeService.js'

import { fmtAED, expenseCatClass } from '../utils/financeUtils.js'
import { FinanceProvider } from '../context/FinanceContext.jsx'
import SalariesSection from '../components/finance/SalariesSection.jsx'
import ExpensesSection from '../components/finance/ExpensesSection.jsx'
import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'
import '../styles/finance.css'
import '../styles/unified-cards.css'

export default function FinancePage({ showToast }) {
  return (
    <FinanceProvider>
      <FinancePageContent showToast={showToast} />
    </FinanceProvider>
  )
}

function FinancePageContent({ showToast }) {
  const { orders } = useOrders()
  const [activeTab, setActiveTab] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })

  const [dateTo, setDateTo] = useState(() => {
    return new Date().toISOString().split('T')[0]
  })

  const filter = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo])

  // فلترة صحيحة وتصحيح معادلة الأرباح الصافية بدون تكرار أو زيادة وهمية
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)

    try {
      const options = { dateFrom, dateTo }
      const res = await fetchFinanceSummary(options)
      const data = res?.data || res || {}

      let calculatedRevenue = 0
      if (orders && orders.length > 0) {
        calculatedRevenue = orders.reduce((sum, o) => {
          if (o.status === 'cancelled' || (o.payment_method || '').toLowerCase() === 'unpaid') return sum
          const created = new Date(o.created_at)

          if (dateFrom) {
            const start = new Date(`${dateFrom}T00:00:00`)
            if (created < start) return sum
          }
          if (dateTo) {
            const end = new Date(`${dateTo}T23:59:59.999`)
            if (created > end) return sum
          }
          return sum + Number(o.total_amount || 0)
        }, 0)
      } else {
        calculatedRevenue = Number(data.total_revenue ?? data.totalRevenue ?? 0)
      }

      const totalSalaries = Number(data.total_salaries ?? data.totalSalaries ?? 0)
      const totalExpenses = Number(data.total_expenses ?? data.totalExpenses ?? 0)
      const netProfit = calculatedRevenue - totalSalaries - totalExpenses

      if (!res?.error) {
        setSummary({
          total_revenue: calculatedRevenue,
          total_salaries: totalSalaries,
          salaries_paid: Number(data.salaries_paid ?? data.salariesPaid ?? 0),
          total_expenses: totalExpenses,
          net_profit: netProfit,
        })
      } else {
        setSummary({
          total_revenue: calculatedRevenue,
          total_salaries: 0,
          salaries_paid: 0,
          total_expenses: 0,
          net_profit: calculatedRevenue,
        })
      }

    } catch (err) {
      console.error('Finance Summary Error:', err)
      setSummary({
        total_revenue: 0,
        total_salaries: 0,
        salaries_paid: 0,
        total_expenses: 0,
        net_profit: 0,
      })
    } finally {
      setSummaryLoading(false)
    }
  }, [dateFrom, dateTo, orders])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const mappedFinanceCards = useMemo(() => {
    const s = summary || {}

    return [
      {
        id: 'fin-rev',
        label: 'Selected Revenue',
        value: `AED ${fmtAED(s.total_revenue ?? 0)}`,
        type: 'revenue',
        subtitle: `${dateFrom} to ${dateTo}`,
      },
      {
        id: 'fin-sal',
        label: 'Total Salaries',
        value: `AED ${fmtAED(s.total_salaries ?? 0)}`,
        type: 'salary',
        subtitle: 'Active employees',
      },
      {
        id: 'fin-sal-paid',
        label: 'Salaries Paid',
        value: `AED ${fmtAED(s.salaries_paid ?? 0)}`,
        type: 'salary',
        subtitle: 'Paid in range',
      },
      {
        id: 'fin-exp',
        label: 'Total Expenses',
        value: `AED ${fmtAED(s.total_expenses ?? 0)}`,
        type: 'expense',
        subtitle: 'Filtered expenses',
      },
      {
        id: 'fin-prf',
        label: 'Net Profit',
        value: `AED ${fmtAED(s.net_profit ?? 0)}`,
        type: 'profit',
        subtitle: 'Revenue − Salaries − Expenses',
        formula: true,
        rawValue: s.net_profit ?? 0,
      },
    ]
  }, [summary, dateFrom, dateTo])

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Layers size={16} strokeWidth={2} /> },
    { id: 'salaries', label: 'Salaries', icon: <Users size={16} strokeWidth={2} /> },
    { id: 'expenses', label: 'Expenses', icon: <ShoppingBag size={16} strokeWidth={2} /> },
  ]

  return (
    <div className="scroll-view finance-page">

      <div className="page-header">
        <div>
          <div className="page-title">Finance Dashboard</div>
          <div className="page-sub">
            Net Profit = Revenue − Salaries − Expenses
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: 'var(--surf2)',
          padding: '6px 12px',
          borderRadius: 8,
          gap: 8,
          border: '1px solid var(--bdr, rgba(255,255,255,0.1))'
        }}>
          <Calendar size={15} color="var(--gold, #c5a059)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt1)' }}>
            Custom Range:
          </span>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              background: 'var(--surf3)',
              color: 'var(--txt1)',
              border: '1px solid var(--bdr, rgba(255,255,255,0.1))',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer'
            }}
          />

          <span style={{ fontSize: 12, color: 'var(--txt3)' }}>to</span>

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              background: 'var(--surf3)',
              color: 'var(--txt1)',
              border: '1px solid var(--bdr, rgba(255,255,255,0.1))',
              borderRadius: 6,
              padding: '4px 8px',
              fontSize: 12,
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>
      </div>

      <UnifiedStatCards
        cards={mappedFinanceCards}
        loading={summaryLoading}
      />

      <div className="finance-tab-bar">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`finance-tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>

          <div className="two-col" style={{ marginBottom: 16 }}>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <DollarSign size={15} /> Revenue Overview
                </span>
                <span className="card-badge">
                  Filtered
                </span>
              </div>

              {summaryLoading ? (
                <div className="skeleton-wrap">
                  <div className="skeleton-line" />
                </div>
              ) : (
                <div>
                  <div className="list-row">
                    <span>Total Revenue</span>
                    <span className="badge badge-gold">
                      AED {fmtAED(summary?.total_revenue ?? 0)}
                    </span>
                  </div>

                  <div className="list-row">
                    <span>Total Salaries</span>
                    <span className="badge badge-blue">
                      − AED {fmtAED(summary?.total_salaries ?? 0)}
                    </span>
                  </div>

                  <div className="list-row">
                    <span>Salaries Paid</span>
                    <span className="badge badge-blue">
                      − AED {fmtAED(summary?.salaries_paid ?? 0)}
                    </span>
                  </div>

                  <div className="list-row">
                    <span>Total Expenses</span>
                    <span className="badge badge-amber">
                      − AED {fmtAED(summary?.total_expenses ?? 0)}
                    </span>
                  </div>

                  <div className="list-row" style={{ borderTop: '1px solid var(--bdr)', paddingTop: 14 }}>
                    <span style={{ fontWeight: 700 }}>Net Profit</span>
                    <span className={`badge ${(summary?.net_profit ?? 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                      AED {fmtAED(summary?.net_profit ?? 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <ShoppingBag size={15} /> Expense Breakdown
                </span>
              </div>

              {summaryLoading ? (
                <div className="skeleton-wrap">
                  <div className="skeleton-line" />
                </div>
              ) : (
                <div>
                  {EXPENSE_CATEGORIES_LIST
                    .filter(cat => cat.value !== 'tables_chairs')
                    .map(cat => (
                      <div key={cat.value} className="list-row">
                        <span>{cat.label}</span>
                        <span className={`expense-cat-badge ${expenseCatClass(cat.value)}`}>
                          Cat {cat.group}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>

          </div>

          <div className="two-col">

            <div className="card" onClick={() => setActiveTab('salaries')} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <span className="card-title"><Users size={15} /> Manage Salaries</span>
                <span className="badge badge-blue"><ArrowRight size={12} /></span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
                Add, track or audit specialized role divisions.
              </div>
            </div>

            <div className="card" onClick={() => setActiveTab('expenses')} style={{ cursor: 'pointer' }}>
              <div className="card-header">
                <span className="card-title"><ShoppingBag size={15} /> Manage Expenses</span>
                <span className="badge badge-amber"><ArrowRight size={12} /></span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--txt3)' }}>
                Control more material logs and expenses pricing details.
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'salaries' && (
        <SalariesSection showToast={showToast} onSummaryRefresh={loadSummary} filter={filter} />
      )}

      {activeTab === 'expenses' && (
        <ExpensesSection showToast={showToast} onSummaryRefresh={loadSummary} filter={filter} />
      )}

    </div>
  )
}