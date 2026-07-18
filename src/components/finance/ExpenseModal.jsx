// ============================================================
// src/components/finance/ExpenseModal.jsx
// Maintained External Component: Standard Unified Form Layer.
// ============================================================

import { useState } from 'react'
import { X, Check, Beef, Armchair, Layers } from 'lucide-react'

function Spinner() {
    return (
        <div className="animate-spin" style={{
            width: '14px', height: '14px', border: '2px solid transparent',
            borderTopColor: 'currentColor', borderRadius: '50%', display: 'inline-block'
        }} />
    )
}

export default function ExpenseModal({ initial, onSave, onClose, saving }) {
    const [form, setForm] = useState({
        item_name: initial?.item_name ?? '',
        invoice_number: initial?.invoice_number ?? '',
        cost: initial?.cost ?? '',
        category: initial?.category ?? 'food_ingredients',
        expense_date: initial?.expense_date ?? new Date().toISOString().split('T')[0],
        notes: initial?.notes ?? '',
    })

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
    const isEdit = !!initial?.id

    // دالة مساعدة لعرض الأيقونة المناسبة بجانب عنوان المودال بناءً على الفئة المختارة
    const renderHeaderIcon = () => {
        if (form.category === 'food_ingredients') return <Beef size={18} style={{ color: 'var(--gold)' }} />
        if (form.category === 'furniture_equipment') return <Armchair size={18} style={{ color: 'var(--gold)' }} />
        return <Layers size={18} style={{ color: 'var(--gold)' }} /> // أيقونة تعبر عن مصاريف أخرى ومتنوعة
    }

    return (
        <div className="finance-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="finance-modal-box">
                <div className="finance-modal-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {renderHeaderIcon()}
                    <span className="finance-modal-title" style={{ flex: 1 }}>
                        {isEdit ? 'Edit Expense Record' : 'Add Expense Outflow'}
                    </span>
                    <button className="finance-modal-close" onClick={onClose}><X size={14} /></button>
                </div>

                <div className="finance-form-group">
                    <label className="finance-form-label">Category *</label>
                    <select className="finance-select" value={form.category} onChange={e => set('category', e.target.value)}>
                        <optgroup label="Category A — Food & Ingredients">
                            <option value="food_ingredients">Food & Ingredients</option>
                        </optgroup>
                        <optgroup label="Category B — Furniture & Equipment">
                            <option value="furniture_equipment">Furniture & Equipment</option>
                            <option value="more_expenses">More Expenses</option>
                        </optgroup>
                    </select>
                </div>

                <div className="finance-form-group">
                    <label className="finance-form-label">Item Name *</label>
                    <input className="finance-input" placeholder="e.g. Chicken (10kg), Industrial Fridge…" value={form.item_name} onChange={e => set('item_name', e.target.value)} />
                </div>

                <div className="finance-form-grid-2">
                    <div className="finance-form-group">
                        <label className="finance-form-label">Invoice Number</label>
                        <input className="finance-input" placeholder="e.g. INV-2024-001" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
                    </div>
                    <div className="finance-form-group">
                        <label className="finance-form-label">Cost (AED) *</label>
                        <input className="finance-input" type="number" min="0" step="0.01" placeholder="e.g. 250" value={form.cost} onChange={e => set('cost', e.target.value)} />
                    </div>
                </div>

                <div className="finance-form-grid-2">
                    <div className="finance-form-group">
                        <label className="finance-form-label">Expense Date</label>
                        <input className="finance-input" type="date" value={form.expense_date} onChange={e => set('expense_date', e.target.value)} />
                    </div>
                    <div className="finance-form-group">
                        <label className="finance-form-label">Notes</label>
                        <input className="finance-input" placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
                    </div>
                </div>

                <div className="finance-modal-actions">
                    <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>Cancel</button>
                    <button
                        className="btn btn-gold"
                        style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                        disabled={saving || !form.item_name || !form.cost || !form.category}
                        onClick={() => onSave(form)}
                    >
                        {saving ? <Spinner /> : <Check size={13} />}
                        {isEdit ? 'Save Changes' : 'Add Expense'}
                    </button>
                </div>
            </div>
        </div>
    )
}