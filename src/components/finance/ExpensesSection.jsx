// ============================================================
// src/components/finance/ExpensesSection.jsx
// Premium Refactoring: Modern Dark-Mode Micro-Charts, Tab Capsules, 
// Multi-Layer Filtering & Strict External Modal Workflow.
// ============================================================

import { useState, useMemo } from 'react'
import {
  ShoppingCart,
  Armchair,
  Plus,
  ChefHat,
  LayoutGrid,
  Pencil,
  Trash2,
  Search,
  Calendar,
  X,
  TrendingUp,
  FolderOpen,
  MoreHorizontal
} from 'lucide-react'

import {
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../services/financeService.js'

import { fmtAED, fmtFinanceDate } from '../../utils/financeUtils.js'
import { useFinance } from '../../context/FinanceContext.jsx'
import Skeleton from '../ui/Skeleton.jsx'

// استيراد المودال الخارجي والمنفصل المعتمد
import ExpenseModal from './ExpenseModal.jsx'

const TAB_FILTERS = {
  ALL: 'ALL',
  FOOD: 'food_ingredients',
  FURNITURE: 'furniture_equipment',
  MORE: 'more_expenses'
}

function ExpenseCatBadge({ category }) {
  if (category === 'food_ingredients') {
    return <span className="expense-cat-badge" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(52, 211, 153, 0.1)', color: '#34d399', fontWeight: 600 }}>Food & Ingredients</span>
  }
  if (category === 'more_expenses') {
    return <span className="expense-cat-badge" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', fontWeight: 600 }}>More Expenses</span>
  }
  return <span className="expense-cat-badge" style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa', fontWeight: 600 }}>Furniture & Assets</span>
}

export default function ExpensesSection({ showToast, onSummaryRefresh }) {
  const { expenses, loading, reload } = useFinance()

  const [activeTab, setActiveTab] = useState(TAB_FILTERS.ALL)
  const [searchQuery, setSearchQuery] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const resetFilters = () => {
    setSearchQuery('')
    setStartDate('')
    setEndDate('')
  }

  const processedExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (activeTab !== TAB_FILTERS.ALL && e.category !== activeTab) return false

      if (searchQuery.trim()) {
        const itemMatch = e.item_name?.toLowerCase().includes(searchQuery.toLowerCase())
        const invoiceMatch = e.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase())
        if (!itemMatch && !invoiceMatch) return false
      }

      if (startDate && e.expense_date && e.expense_date < startDate) return false
      if (endDate && e.expense_date && e.expense_date > endDate) return false

      return true
    })
  }, [expenses, activeTab, searchQuery, startDate, endDate])

  const totals = useMemo(() => {
    let all = 0, food = 0, furniture = 0, more = 0
    expenses.forEach(e => {
      const cost = Number(e.cost || 0)
      all += cost
      if (e.category === 'food_ingredients') food += cost
      else if (e.category === 'furniture_equipment') furniture += cost
      else if (e.category === 'more_expenses') more += cost
    })
    return { all, food, furniture, more }
  }, [expenses])

  const filteredTotal = useMemo(() => {
    return processedExpenses.reduce((sum, e) => sum + Number(e.cost || 0), 0)
  }, [processedExpenses])

  const chartData = useMemo(() => {
    const categoriesMap = {
      food_ingredients: { label: 'Food Ingredients', value: 0, color: '#34d399' },
      furniture_equipment: { label: 'Furniture & Assets', value: 0, color: '#60a5fa' },
      more_expenses: { label: 'More Expenses', value: 0, color: '#fbbf24' }
    }

    processedExpenses.forEach(e => {
      if (categoriesMap[e.category]) {
        categoriesMap[e.category].value += Number(e.cost || 0)
      }
    })

    return Object.values(categoriesMap)
  }, [processedExpenses])

  const maxChartValue = useMemo(() => {
    const max = Math.max(...chartData.map(d => d.value), 0)
    return max === 0 ? 1 : max
  }, [chartData])

  async function handleModalSave(formData) {
    setSaving(true)
    let res
    if (selectedExpense?.id) {
      res = await updateExpense(selectedExpense.id, formData)
    } else {
      res = await createExpense(formData)
    }
    setSaving(false)

    if (res?.error) {
      showToast?.('Operation failed: ' + res.error, 'error')
      return
    }

    setModalOpen(false)
    setSelectedExpense(null)
    await reload()
    onSummaryRefresh?.()
    showToast?.('Expense recorded successfully', 'success')
  }

  async function actionDelete(id) {
    setSaving(true)
    const { error } = await deleteExpense(id)
    setSaving(false)

    if (error) {
      showToast?.('Delete failed: ' + error, 'error')
      return
    }

    setDeleteConfirm(null)
    await reload()
    onSummaryRefresh?.()
    showToast?.('Expense log removed', 'success')
  }

  return (
    <div className="finance-section-wrapper">

      {/* ── الرسم البياني المصغر التفاعلي المتجاوب ── */}
      <div className="finance-stat-card" style={{ marginBottom: '24px', padding: '20px', border: '1px solid var(--bdr)', background: 'var(--surf1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--txt)' }}>Live Allocations Flow</span>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Visual Data Analytics</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {chartData.map((dataItem, idx) => {
            const ratio = (dataItem.value / maxChartValue) * 100
            const percentage = filteredTotal > 0 ? ((dataItem.value / filteredTotal) * 100).toFixed(1) : '0.0'

            return (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--txt2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dataItem.color, display: 'inline-block' }} />
                    {dataItem.label}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--txt)' }}>
                    AED {fmtAED(dataItem.value)} <span style={{ color: 'var(--txt3)', fontSize: '11px', fontWeight: 400 }}>({percentage}%)</span>
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--surf3)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${ratio}%`, height: '100%', background: dataItem.color, borderRadius: '4px', transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="finance-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div className="finance-section-title" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 700 }}>
            <ShoppingCart size={16} /> Operational Expenses
          </div>
          <div className="finance-section-sub" style={{ fontSize: 13, color: 'var(--txt3)' }}>
            Total Allocated Portfolio: AED {fmtAED(totals.all)}
          </div>
        </div>
        <button className="btn btn-gold btn-sm" onClick={() => { setSelectedExpense(null); setModalOpen(true); }}>
          <Plus size={13} /> Add Expense
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div>
          <div className="finance-tab-bar" style={{ display: 'inline-flex', gap: '4px', background: 'var(--surf2)', padding: '4px', borderRadius: '8px', border: '1px solid var(--bdr)', marginBottom: 0 }}>
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === TAB_FILTERS.ALL ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none',
                background: activeTab === TAB_FILTERS.ALL ? 'var(--surf3)' : 'transparent', color: activeTab === TAB_FILTERS.ALL ? 'var(--gold)' : 'var(--txt2)'
              }}
              onClick={() => setActiveTab(TAB_FILTERS.ALL)}
            >
              <LayoutGrid size={14} /> All Expenses
            </button>
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === TAB_FILTERS.FOOD ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none',
                background: activeTab === TAB_FILTERS.FOOD ? 'var(--surf3)' : 'transparent', color: activeTab === TAB_FILTERS.FOOD ? 'var(--gold)' : 'var(--txt2)'
              }}
              onClick={() => setActiveTab(TAB_FILTERS.FOOD)}
            >
              <ChefHat size={14} /> Food Ingredients
            </button>
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === TAB_FILTERS.FURNITURE ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none',
                background: activeTab === TAB_FILTERS.FURNITURE ? 'var(--surf3)' : 'transparent', color: activeTab === TAB_FILTERS.FURNITURE ? 'var(--gold)' : 'var(--txt2)'
              }}
              onClick={() => setActiveTab(TAB_FILTERS.FURNITURE)}
            >
              <Armchair size={14} /> Furniture & Assets
            </button>
            <button
              type="button"
              className={`finance-tab-btn ${activeTab === TAB_FILTERS.MORE ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', border: 'none',
                background: activeTab === TAB_FILTERS.MORE ? 'var(--surf3)' : 'transparent', color: activeTab === TAB_FILTERS.MORE ? 'var(--gold)' : 'var(--txt2)'
              }}
              onClick={() => setActiveTab(TAB_FILTERS.MORE)}
            >
              <MoreHorizontal size={14} /> More Expenses
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', background: 'var(--surf1)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--bdr)' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)' }} />
            <input
              type="text"
              placeholder="Search items, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="finance-input"
              style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={13} style={{ color: 'var(--txt3)' }} />
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="finance-input" style={{ width: '135px', height: '36px', fontSize: '12px' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: 'var(--txt4)', fontSize: '11px', textTransform: 'uppercase' }}>To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="finance-input" style={{ width: '135px', height: '36px', fontSize: '12px' }} />
          </div>

          {(searchQuery || startDate || endDate) && (
            <button onClick={resetFilters} className="btn btn-ghost" style={{ padding: '0 10px', height: '36px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--red)' }}>
              <X size={13} /> Reset
            </button>
          )}
        </div>
      </div>

      <div className="finance-table-card">
        {loading ? (
          <div style={{ padding: 20 }}><Skeleton rows={5} /></div>
        ) : processedExpenses.length === 0 ? (
          <div className="finance-empty">
            <div className="finance-empty-icon">
              <FolderOpen size={36} strokeWidth={1.5} style={{ color: 'var(--txt3)', opacity: 0.6 }} />
            </div>
            <div className="finance-empty-text">No active data match found</div>
            <div className="finance-empty-sub">Adjust your selected query terms or structural filters.</div>
          </div>
        ) : (
          <>
            <table className="finance-table">
              <thead>
                <tr>
                  <th>Item Particulars</th>
                  <th>Category Matrix</th>
                  <th>Invoice Ref</th>
                  <th>Execution Date</th>
                  <th style={{ textAlign: 'right' }}>Cost Outflow</th>
                  <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedExpenses.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 600, color: 'var(--txt)' }}>{row.item_name}</td>
                    <td><ExpenseCatBadge category={row.category} /></td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--txt2)' }}>{row.invoice_number || '—'}</td>
                    <td className="ft-date">{fmtFinanceDate(row.expense_date)}</td>
                    <td className="ft-cost" style={{ textAlign: 'right' }}>AED {fmtAED(row.cost)}</td>
                    <td>
                      <div className="ft-actions" style={{ justifyContent: 'center' }}>
                        <button className="btn-icon btn-icon-gold" onClick={() => { setSelectedExpense(row); setModalOpen(true); }}><Pencil size={13} /></button>
                        <button className="btn-icon btn-icon-danger" onClick={() => setDeleteConfirm(row.id)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="finance-totals-bar">
              <div className="finance-total-item">
                <span className="finance-total-label">Running Filtered Subtotal</span>
                <span className="finance-total-value">AED {fmtAED(filteredTotal)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <ExpenseModal
          initial={selectedExpense}
          saving={saving}
          onSave={handleModalSave}
          onClose={() => { setModalOpen(false); setSelectedExpense(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="finance-modal-box" style={{ maxWidth: 350, padding: '24px', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ color: 'var(--red)', marginBottom: 12 }}><Trash2 size={28} /></div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Confirm Log Deletion?</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => actionDelete(deleteConfirm)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}