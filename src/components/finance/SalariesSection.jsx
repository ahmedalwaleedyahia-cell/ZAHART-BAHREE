import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, RefreshCw, Check, Loader2, X, Wallet, History, Calendar } from 'lucide-react'
import {
  fetchSalaries,
  createSalary,
  updateSalary,
  deleteSalary,
  fetchSalaryPayments,
  createSalaryPayment,
  flushSalaryPayments
} from '../../services/financeService.js'
import { fmtAED, formatEmiratesId } from '../../utils/financeUtils.js'

const JOB_TITLES = [
  { value: 'cashier', label: 'كاشير - Cashier' },
  { value: 'chef', label: 'شيف - Chef' },
  { value: 'assistant_chef', label: 'مساعد شيف - Assistant Chef' },
  { value: 'waiters', label: 'ويتر - Waiter' },
  { value: 'cleaner', label: 'عامل نظافة - Cleaner' }
]

function Spinner() {
  return <Loader2 size={14} className="finance-spinner" style={{ animation: 'spin .7s linear infinite' }} />
}

function SalaryModal({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    employee_name: initial?.employee_name ?? '',
    emirates_id: initial?.emirates_id ?? '',
    monthly_salary: initial?.monthly_salary ?? '',
    job_title: initial?.job_title ?? 'waiters',
    notes: initial?.notes ?? '',
    is_active: initial?.is_active ?? true,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isEdit = !!initial?.id

  return (
    <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="finance-modal-box">
        <div className="finance-modal-header">
          <span className="finance-modal-title">{isEdit ? 'EDIT EMPLOYEE PROFILE' : 'ADD EMPLOYEE'}</span>
          <button className="finance-modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="finance-form-grid-2">
          <div className="finance-form-group">
            <label className="finance-form-label">Employee Name *</label>
            <input className="finance-input" placeholder="e.g. Ahmed Al Mansoori" value={form.employee_name} onChange={e => set('employee_name', e.target.value)} />
          </div>
          <div className="finance-form-group">
            <label className="finance-form-label">Job Title *</label>
            <select className="finance-select" value={form.job_title} onChange={e => set('job_title', e.target.value)}>
              {JOB_TITLES.map(jt => (
                <option key={jt.value} value={jt.value}>{jt.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="finance-form-grid-2">
          <div className="finance-form-group">
            <label className="finance-form-label">Emirates ID *</label>
            <input className="finance-input" placeholder="784-XXXX-XXXXXXX-X" value={form.emirates_id} onChange={e => set('emirates_id', e.target.value)} />
          </div>
          <div className="finance-form-group">
            <label className="finance-form-label">Monthly Salary (AED) *</label>
            <input className="finance-input" type="number" min="0" step="0.01" placeholder="e.g. 3500" value={form.monthly_salary} onChange={e => set('monthly_salary', e.target.value)} />
          </div>
        </div>

        <div className="finance-form-group">
          <label className="finance-form-label">Notes</label>
          <input className="finance-input" placeholder="Contract details, mobile, etc." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {isEdit && (
          <div className="finance-active-row">
            <div style={{ flex: 1 }}>
              <div className="finance-active-label">Active Employee</div>
              <div className="finance-active-sub">Inactive employees are excluded from directory view counters</div>
            </div>
            <label className="toggle">
              <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
              <div className="toggle-track"><div className="toggle-thumb" /></div>
            </label>
          </div>
        )}

        <div className="finance-modal-actions">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={saving || !form.employee_name || !form.emirates_id || !form.monthly_salary} onClick={() => onSave(form)}>
            {saving ? <Spinner /> : <Check size={13} />} {isEdit ? 'SAVE CHANGES' : 'ADD EMPLOYEE'}
          </button>
        </div>
      </div>
    </div>
  )
}

function PaymentSalaryModal({ allSalaries, onPaySuccess, onClose }) {
  const [jobTitle, setJobTitle] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filteredEmployees = allSalaries.filter(emp => emp.job_title === jobTitle && emp.is_active !== false)
  const currentEmployee = filteredEmployees.find(e => e.id === selectedEmployeeId)

  useEffect(() => {
    setSelectedEmployeeId('')
  }, [jobTitle])

  async function handleSubmit() {
    if (!currentEmployee) return
    setSubmitting(true)

    const paymentRecord = {
      employee_id: currentEmployee.id,
      employee_name: currentEmployee.employee_name,
      job_title: currentEmployee.job_title,
      payment_date: paymentDate,
      amount: parseFloat(currentEmployee.monthly_salary),
      notes: notes
    }

    const res = await createSalaryPayment(paymentRecord)
    setSubmitting(false)

    if (res.error) {
      alert(`Error saving payment: ${res.error}`)
      return
    }

    onPaySuccess(res.data)
  }

  return (
    <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="finance-modal-box">
        <div className="finance-modal-header">
          <span className="finance-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={16} /> PAYMENT SALARIES LOG
          </span>
          <button className="finance-modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="finance-form-group">
          <label className="finance-form-label">Job Title *</label>
          <select className="finance-select" value={jobTitle} onChange={e => setJobTitle(e.target.value)}>
            <option value="" disabled>-- Select Job Title Category --</option>
            {JOB_TITLES.map(jt => (
              <option key={jt.value} value={jt.value}>{jt.label}</option>
            ))}
          </select>
        </div>

        <div className="finance-form-group">
          <label className="finance-form-label">Employee Name *</label>
          <select
            className="finance-select"
            value={selectedEmployeeId}
            onChange={e => setSelectedEmployeeId(e.target.value)}
            disabled={!jobTitle}
          >
            <option value="">{!jobTitle ? 'Select Job Title First...' : '-- Choose Employee --'}</option>
            {filteredEmployees.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.employee_name}</option>
            ))}
          </select>
          {jobTitle && filteredEmployees.length === 0 && (
            <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>No active staff registered under this department.</div>
          )}
        </div>

        <div className="finance-form-grid-2">
          <div className="finance-form-group">
            <label className="finance-form-label">Payment Date *</label>
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)', zIndex: 1 }} />
              <input
                type="date"
                value={paymentDate}
                onChange={e => setPaymentDate(e.target.value)}
                className="finance-input"
                style={{ paddingLeft: '32px' }}
              />
            </div>
          </div>
          <div className="finance-form-group">
            <label className="finance-form-label">Salary Amount (AED)</label>
            <input
              className="finance-input"
              type="text"
              readOnly
              disabled
              style={{ background: 'var(--surf2)', fontWeight: 600, color: 'var(--gold)' }}
              value={currentEmployee ? `AED ${fmtAED(currentEmployee.monthly_salary)}` : 'Select employee...'}
            />
          </div>
        </div>

        <div className="finance-form-group">
          <label className="finance-form-label">Notes (Optional)</label>
          <input className="finance-input" placeholder="Reference notes, bank confirmation receipts, etc." value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        <div className="finance-modal-actions">
          <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-gold" style={{ flex: 1 }} disabled={submitting || !selectedEmployeeId || !paymentDate} onClick={handleSubmit}>
            {submitting ? <Spinner /> : <Check size={13} />} PAY SALARY
          </button>
        </div>
      </div>
    </div>
  )
}

function ViewHistoryModal({ employee, payrollRecords, onClose }) {
  const filteredHistory = payrollRecords.filter(rec => rec.employee_id === employee.id)

  return (
    <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="finance-modal-box" style={{ maxWidth: 550 }}>
        <div className="finance-modal-header">
          <span className="finance-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <History size={15} /> PAYMENT LEDGER: {employee.employee_name.toUpperCase()}
          </span>
          <button className="finance-modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 14 }}>
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--txt3)', fontSize: 13 }}>No historical salary distributions documented for this profile.</div>
          ) : (
            <table className="finance-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--bdr)', color: 'var(--txt3)' }}>
                  <th style={{ padding: '8px 4px' }}>Date</th>
                  <th>Disbursed Amount</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((rec, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid var(--bdr)' }}>
                    <td style={{ padding: '8px 4px', fontWeight: 500 }}>{rec.payment_date}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>AED {fmtAED(rec.amount)}</td>
                    <td style={{ color: 'var(--txt2)', fontSize: 12 }}>{rec.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onClose}>Close Registry</button>
      </div>
    </div>
  )
}

function ConfirmDeleteModal({ title, sub, onConfirm, onClose, saving }) {
  return (
    <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="finance-modal-box" style={{ maxWidth: 360 }}>
        <div className="finance-confirm-box">
          <div className="finance-confirm-icon"><Trash2 size={22} /></div>
          <div className="finance-confirm-title">{title}</div>
          <div className="finance-confirm-sub">{sub}</div>
          <div className="finance-modal-actions">
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={onConfirm} disabled={saving}>
              {saving ? <Spinner /> : <Trash2 size={13} />} Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SalariesSection({ showToast, onSummaryRefresh }) {
  const [salaries, setSalaries] = useState([])
  const [loading, setLoading] = useState(true)
  const [paidRecords, setPaidRecords] = useState([])
  const [modal, setModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [salariesRes, paymentsRes] = await Promise.all([
      fetchSalaries(),
      fetchSalaryPayments()
    ])
    setSalaries(salariesRes.data || [])
    setPaidRecords(paymentsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSave(form) {
    setSaving(true)
    let res = modal.mode === 'edit' ? await updateSalary(modal.item.id, form) : await createSalary(form)
    setSaving(false)
    if (res.error) { showToast?.(res.error, 'error'); return }
    showToast?.(modal.mode === 'edit' ? 'Employee profile updated' : 'Employee registered successfully', 'success')
    setModal(null)
    load()
    onSummaryRefresh?.()
  }

  async function handleDelete() {
    setSaving(true)
    const res = await deleteSalary(modal.item.id)
    setSaving(false)
    if (res.error) { showToast?.(res.error, 'error'); return }
    showToast?.('Employee removed completely from records', 'success')
    setModal(null)
    load()
    onSummaryRefresh?.()
  }

  const handlePaymentSuccess = (newRecord) => {
    showToast?.(`Salary payout marked paid for ${newRecord.employee_name}`, 'success')
    setModal(null)
    load()
    onSummaryRefresh?.()
  }

  const handleAnnualReset = async () => {
    if (window.confirm('Are you sure you want to completely flush historical ledger transaction records from Supabase? Master profiles remain untouched.')) {
      setLoading(true)
      const res = await flushSalaryPayments()
      if (res.error) {
        showToast?.(`Error dropping logs: ${res.error}`, 'error')
      } else {
        showToast?.('All database payment history reset safely.', 'success')
      }
      load()
      onSummaryRefresh?.()
    }
  }

  return (
    <div>
      <div className="finance-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div className="finance-section-title" style={{ fontSize: 16, fontWeight: 700 }}>Employee Payroll Directory</div>
          <div className="finance-section-sub" style={{ fontSize: 12, color: 'var(--txt3)' }}>Manage physical contract baselines and release recorded financial compensation packages.</div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => setModal({ mode: 'pay_salaries' })}
          >
            <Wallet size={13} style={{ marginRight: 4 }} /> PAYMENT SALARIES
          </button>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => setModal({ mode: 'add', item: null })}
          >
            <Plus size={13} /> ADD EMPLOYEE
          </button>
        </div>
      </div>

      <div className="finance-table-card">
        {loading ? (
          <div style={{ padding: '32px 18px' }}>
            {[1, 2, 3].map(i => <div key={i} className="skeleton-line" style={{ marginBottom: 10, height: 18, background: 'var(--surf3)' }} />)}
          </div>
        ) : salaries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--txt3)' }}>
            <Users size={32} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--txt3)' }} />
            <div style={{ fontWeight: '600', color: 'var(--txt1)' }}>No staff members registered here</div>
            <div style={{ fontSize: 12 }}>Initialize setup paths by creating profiles using the 'ADD EMPLOYEE' button.</div>
          </div>
        ) : (
          <table className="finance-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--bdr)' }}>
                <th style={{ padding: 10 }}>Employee Name</th>
                <th>Job Title</th>
                <th>Emirates ID</th>
                <th>Base Salary</th>
                <th>Ledger Access</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaries.map(s => {
                const jobLabel = JOB_TITLES.find(j => j.value === s.job_title)?.label || s.job_title
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--bdr)' }}>
                    <td style={{ padding: 10, fontWeight: 600 }}>{s.employee_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--txt2)' }}>{jobLabel}</td>
                    <td><span className="ft-emirates">{formatEmiratesId(s.emirates_id)}</span></td>
                    <td><span className="ft-salary" style={{ fontWeight: 700 }}>AED {fmtAED(s.monthly_salary)}</span></td>
                    <td>
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{ padding: '6px 12px', borderRadius: '4px', borderColor: 'var(--bdr)' }}
                        onClick={() => setModal({ mode: 'view_history', item: s })}
                      >
                        <History size={12} style={{ marginRight: 4 }} /> View Payment History
                      </button>
                    </td>
                    <td>
                      <div className="ft-actions" style={{ display: 'flex', gap: 6 }}>
                        <button className="btn-icon btn-icon-gold" onClick={() => setModal({ mode: 'edit', item: s })}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn-icon btn-icon-danger" onClick={() => setModal({ mode: 'delete', item: s })}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,0.15)' }} onClick={handleAnnualReset}>
          <RefreshCw size={12} /> Flush Logs
        </button>
      </div>

      {modal?.mode === 'add' && <SalaryModal onSave={handleSave} onClose={() => setModal(null)} saving={saving} />}
      {modal?.mode === 'edit' && <SalaryModal initial={modal.item} onSave={handleSave} onClose={() => setModal(null)} saving={saving} />}
      {modal?.mode === 'pay_salaries' && <PaymentSalaryModal allSalaries={salaries} onPaySuccess={handlePaymentSuccess} onClose={() => setModal(null)} />}
      {modal?.mode === 'view_history' && <ViewHistoryModal employee={modal.item} payrollRecords={paidRecords} onClose={() => setModal(null)} />}
      {modal?.mode === 'delete' && (
        <ConfirmDeleteModal
          title="Fire / Remove Employee?"
          sub={`"${modal.item.employee_name}" will be wiped from active payroll configurations.`}
          onConfirm={handleDelete}
          onClose={() => setModal(null)}
          saving={saving}
        />
      )}
    </div>
  )
}