// ============================================================
// src/components/finance/FinanceSummaryCards.jsx
// Profit banner + summary strip for the Finance page
// ============================================================

import { TrendingUp, TrendingDown, Users, ShoppingCart, DollarSign } from 'lucide-react'
import { fmtAED, calcNetProfit, isProfitable } from '../../utils/financeUtils.js'
import { useFinance } from '../../context/FinanceContext.jsx'
import { useOrders } from '../../context/OrdersContext.jsx'
import Skeleton from '../ui/Skeleton.jsx'

export default function FinanceSummaryCards() {
  const { summary, loading } = useFinance()
  const { todaySummary } = useOrders()

  // Use total revenue from orders (all-time using todaySummary isn't right;
  // we compute it across all orders from context — use what's available)
  const totalRevenue = Number(todaySummary?.total_revenue ?? 0)
  const totalSalaries = summary.totalSalaries
  const totalExpenses = summary.totalExpenses
  const netProfit = calcNetProfit(totalRevenue, totalSalaries, totalExpenses)
  const profitable = isProfitable(netProfit)

  if (loading) return <Skeleton rows={3} />

  return (
    <>
      {/* Net Profit Banner */}
      <div className={`finance-profit-banner ${profitable ? 'profit-positive' : 'profit-negative'}`}>
        <div>
          <div className="finance-profit-banner-label">Net Profit (Today's Revenue Basis)</div>
          <div className={`finance-profit-banner-amount ${profitable ? 'positive' : 'negative'}`}>
            {profitable ? '+' : ''}AED {fmtAED(netProfit)}
          </div>
        </div>
        <div className="finance-profit-breakdown">
          <div className="finance-breakdown-item">
            <span className="finance-breakdown-item-label">Revenue</span>
            <span className="finance-breakdown-item-value" style={{ color: 'var(--gold)' }}>
              AED {fmtAED(totalRevenue)}
            </span>
          </div>
          <div className="finance-breakdown-item">
            <span className="finance-breakdown-item-label">Salaries</span>
            <span className="finance-breakdown-item-value" style={{ color: 'var(--blue)' }}>
              − AED {fmtAED(totalSalaries)}
            </span>
          </div>
          <div className="finance-breakdown-item">
            <span className="finance-breakdown-item-label">Expenses</span>
            <span className="finance-breakdown-item-value" style={{ color: 'var(--amber)' }}>
              − AED {fmtAED(totalExpenses)}
            </span>
          </div>
        </div>
        <div style={{ opacity: 0.15, flexShrink: 0 }}>
          {profitable
            ? <TrendingUp size={56} strokeWidth={1.2} color="var(--green)" />
            : <TrendingDown size={56} strokeWidth={1.2} color="var(--red)" />
          }
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="finance-summary-strip">
        <div className="finance-dash-card revenue">
          <div className="finance-dash-icon"><DollarSign size={40} /></div>
          <div className="finance-dash-label">Today's Revenue</div>
          <div className="finance-dash-value gold">AED {fmtAED(totalRevenue)}</div>
          <div className="finance-dash-sub">From completed orders today</div>
        </div>
        <div className="finance-dash-card salaries">
          <div className="finance-dash-icon"><Users size={40} /></div>
          <div className="finance-dash-label">Total Salaries</div>
          <div className="finance-dash-value blue">AED {fmtAED(totalSalaries)}</div>
          <div className="finance-dash-sub">Monthly payroll total</div>
        </div>
        <div className="finance-dash-card expenses">
          <div className="finance-dash-icon"><ShoppingCart size={40} /></div>
          <div className="finance-dash-label">Total Expenses</div>
          <div className="finance-dash-value amber">AED {fmtAED(totalExpenses)}</div>
          <div className="finance-dash-sub">Food, furniture & equipment</div>
        </div>
        <div className={`finance-dash-card ${profitable ? 'profit-card' : 'loss-card'}`}>
          <div className="finance-dash-icon">
            {profitable ? <TrendingUp size={40} /> : <TrendingDown size={40} />}
          </div>
          <div className="finance-dash-label">Net Profit</div>
          <div className={`finance-dash-value ${profitable ? 'green' : 'red'}`}>
            {profitable ? '+' : ''}AED {fmtAED(netProfit)}
          </div>
          <div className="finance-dash-sub">Revenue − Salaries − Expenses</div>
        </div>
      </div>
    </>
  )
}
