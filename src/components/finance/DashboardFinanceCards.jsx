import { useState, useEffect, useMemo } from 'react'

import { fetchFinanceSummary } from '../../services/financeService.js'
import { fmtAED } from '../../utils/financeUtils.js'

export default function DashboardFinanceCards({ totalRevenue = 0 }) {
  const [summary, setSummary] = useState({
    totalSalaries: 0,
    salariesPaid: 0,
    totalExpenses: 0,
    vatCollected: 0,
    netProfit: 0,
  })

  const [loading, setLoading] = useState(true)

  // =========================
  // Load Summary
  // =========================
  useEffect(() => {
    let live = true

    async function load() {
      try {
        setLoading(true)

        const res = await fetchFinanceSummary()

        if (!live) return

        if (res?.error) {
          setSummary({
            totalSalaries: 0,
            salariesPaid: 0,
            totalExpenses: 0,
            vatCollected: 0,
            netProfit: 0,
          })
          return
        }

        const data = res?.data || res || {}

        setSummary({
          totalSalaries: Number(
            data.total_salaries ?? data.totalSalaries ?? 0
          ),
          salariesPaid: Number(
            data.salaries_paid ?? data.salariesPaid ?? 0
          ),
          totalExpenses: Number(
            data.total_expenses ?? data.totalExpenses ?? 0
          ),
          vatCollected: Number(
            data.vat_collected ?? data.vatCollected ?? 0
          ),
          netProfit: Number(
            data.net_profit ?? data.netProfit ?? 0
          ),
        })
      } catch (err) {
        console.error('Finance summary error:', err)

        if (live) {
          setSummary({
            totalSalaries: 0,
            salariesPaid: 0,
            totalExpenses: 0,
            vatCollected: 0,
            netProfit: 0,
          })
        }
      } finally {
        if (live) setLoading(false)
      }
    }

    load()

    return () => {
      live = false
    }
  }, [totalRevenue])

  // =========================
  // Derived values
  // =========================
  const profitable = useMemo(
    () => summary.netProfit >= 0,
    [summary.netProfit]
  )

  // =========================
  // Loading UI (better UX)
  // =========================
  if (loading) {
    return (
      <div className="dash-finance-strip">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="dash-finance-card skeleton"
          />
        ))}
      </div>
    )
  }

  // =========================
  // UI
  // =========================
  return (
    <div className="dash-finance-strip">

      {/* Revenue */}
      <div className="dash-finance-card dfc-revenue">
        <div className="dfc-label">TOTAL REVENUE</div>
        <div className="dfc-value dv-gold">
          AED {fmtAED(totalRevenue)}
        </div>
        <div className="dfc-sub">
          Today's completed orders
        </div>
      </div>

      {/* Salaries */}
      <div className="dash-finance-card dfc-salary">
        <div className="dfc-label">TOTAL SALARIES</div>
        <div className="dfc-value dv-blue">
          AED {fmtAED(summary.totalSalaries)}
        </div>
        <div className="dfc-sub">
          Monthly payroll baselines
        </div>
      </div>

      {/* Paid salaries */}
      <div className="dash-finance-card dfc-salary">
        <div className="dfc-label">SALARIES PAID</div>
        <div className="dfc-value">
          AED {fmtAED(summary.salariesPaid)}
        </div>
        <div className="dfc-sub">
          Total distributed payouts
        </div>
      </div>

      {/* Expenses */}
      <div className="dash-finance-card dfc-expense">
        <div className="dfc-label">TOTAL EXPENSES</div>
        <div className="dfc-value dv-amber">
          AED {fmtAED(summary.totalExpenses)}
        </div>
        <div className="dfc-sub">
          All recorded expenses
        </div>
      </div>

      {/* Net Profit */}
      <div
        className={`dash-finance-card ${profitable ? 'dfc-profit' : 'dfc-loss'
          }`}
      >
        <div className="dfc-label">NET PROFIT</div>

        <div
          className={`dfc-value ${profitable ? 'dv-green' : 'dv-red'
            }`}
        >
          {profitable ? '+' : ''}
          AED {fmtAED(summary.netProfit)}
        </div>

        <div className="dfc-sub">
          Revenue − Paid − Expenses − VAT
        </div>
      </div>

    </div>
  )
}