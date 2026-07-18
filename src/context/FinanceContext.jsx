// ============================================================
// src/context/FinanceContext.jsx
// State management for the Finance module
// ============================================================

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  fetchSalaries,
  fetchExpenses,
  fetchFinanceSummary,
} from '../services/financeService.js'

const FinanceContext = createContext(null)

export function FinanceProvider({ children }) {
  const [salaries, setSalaries] = useState([])
  const [expenses, setExpenses] = useState([])
  const [summary, setSummary] = useState({ totalSalaries: 0, totalExpenses: 0 })
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, eRes, sumRes] = await Promise.all([
        fetchSalaries(),
        fetchExpenses(),
        fetchFinanceSummary(),
      ])
      if (!sRes.error) setSalaries(sRes.data || [])
      if (!eRes.error) setExpenses(eRes.data || [])
      if (!sumRes.error) setSummary({ totalSalaries: sumRes.totalSalaries, totalExpenses: sumRes.totalExpenses })
    } catch (err) {
      console.error('[FinanceContext] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return (
    <FinanceContext.Provider value={{ salaries, expenses, summary, loading, reload }}>
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider')
  return ctx
}
