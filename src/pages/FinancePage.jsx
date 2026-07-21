import { useState, useEffect, useCallback, useMemo } from 'react'
import { DollarSign, ShoppingBag, Users, Layers, ArrowRight } from 'lucide-react'

import {
  fetchFinanceSummary,
  EXPENSE_CATEGORIES_LIST
} from '../services/financeService.js'

import { fmtAED, expenseCatClass } from '../utils/financeUtils.js'
import { FinanceProvider } from '../context/FinanceContext.jsx'
import SalariesSection from '../components/finance/SalariesSection.jsx'
import ExpensesSection from '../components/finance/ExpensesSection.jsx'
import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'
import '../styles/finance.css'
import '../styles/unified-cards.css'

// ======================================================
// Wrapper
// ======================================================

export default function FinancePage({ showToast }) {
  return (
    <FinanceProvider>
      <FinancePageContent showToast={showToast} />
    </FinanceProvider>
  )
}

// ======================================================
// Main Content
// ======================================================

function FinancePageContent({ showToast }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // --------------------------
  // Filter State (Matched with DashboardPage)
  // --------------------------
  const [filter, setFilter] = useState({ dateFrom: null, dateTo: null, preset: 'all' })

  // --------------------------
  // Load Summary
  // --------------------------
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)

    try {
      const options = { dateFrom: filter.dateFrom, dateTo: filter.dateTo }
      const res = await fetchFinanceSummary(options)
      const data = res?.data || res || {}

      if (!res?.error) {
        setSummary({
          total_revenue: Number(data.total_revenue ?? data.totalRevenue ?? 0),
          total_salaries: Number(data.total_salaries ?? data.totalSalaries ?? 0),
          salaries_paid: Number(data.salaries_paid ?? data.salariesPaid ?? 0),
          total_expenses: Number(data.total_expenses ?? data.totalExpenses ?? 0),
          net_profit: Number(data.net_profit ?? data.netProfit ?? 0),
        })
      } else {
        setSummary({
          total_revenue: 0,
          total_salaries: 0,
          salaries_paid: 0,
          total_expenses: 0,
          net_profit: 0,
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
  }, [filter.dateFrom, filter.dateTo])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  // --------------------------
  // Cards Mapping
  // --------------------------
  const mappedFinanceCards = useMemo(() => {
    const s = summary || {}

    return [
      {
        id: 'fin-rev',
        label: filter.preset === 'all' ? 'Total Revenue' : 'Selected Revenue',
        value: `AED ${fmtAED(s.total_revenue ?? 0)}`,
        type: 'revenue',
        subtitle: filter.preset === 'all' ? 'All completed orders' : 'Filtered context',
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
        subtitle: filter.preset === 'all' ? 'Actual paid salaries' : 'Paid in range',
      },
      {
        id: 'fin-exp',
        label: 'Total Expenses',
        value: `AED ${fmtAED(s.total_expenses ?? 0)}`,
        type: 'expense',
        subtitle: filter.preset === 'all' ? 'All categories' : 'Filtered expenses',
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
  }, [summary, filter.preset])

  // --------------------------
  // Tabs
  // --------------------------
  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Layers size={16} strokeWidth={2} /> },
    { id: 'salaries', label: 'Salaries', icon: <Users size={16} strokeWidth={2} /> },
    { id: 'expenses', label: 'Expenses', icon: <ShoppingBag size={16} strokeWidth={2} /> },
  ]

  // ======================================================
  // UI
  // ======================================================

  return (
    <div className="scroll-view finance-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Finance Dashboard</div>
          <div className="page-sub">
            Net Profit = Revenue − Salaries − Expenses
          </div>
        </div>
      </div>

      {/* Dashboard Filter Component */}
      <DashboardFilter onFilterChange={(f) => setFilter(f)} />

      {/* Unified Cards */}
      <UnifiedStatCards
        cards={mappedFinanceCards}
        loading={summaryLoading}
      />

      {/* Tabs */}
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

      {/* Overview */}
      {activeTab === 'overview' && (
        <div>

          <div className="two-col" style={{ marginBottom: 16 }}>

            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <DollarSign size={15} /> Revenue Overview
                </span>
                <span className="card-badge">
                  {filter.preset === 'all' ? 'All time' : 'Filtered'}
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

      {/* Tabs Sections */}
      {activeTab === 'salaries' && (
        <SalariesSection showToast={showToast} onSummaryRefresh={loadSummary} filter={filter} />
      )}

      {activeTab === 'expenses' && (
        <ExpensesSection showToast={showToast} onSummaryRefresh={loadSummary} filter={filter} />
      )}

    </div>
  )
}