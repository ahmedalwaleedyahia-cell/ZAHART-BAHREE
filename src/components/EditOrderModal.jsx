import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Trash2, Plus, Minus, PackagePlus, X } from 'lucide-react'

export default function EditOrderModal({ order, products, onClose, showToast, onOrderUpdated }) {
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // حالات إضافة صنف جديد
    const [selectedProductId, setSelectedProductId] = useState('')
    const [addQty, setAddQty] = useState(1)

    // جلب أصناف الطلب الحالية من قواعد البيانات
    useEffect(() => {
        fetchOrderItems()
    }, [order.id])

    async function fetchOrderItems() {
        setLoading(true)
        const { data, error } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)

        if (error) {
            showToast('فشل في تحميل عناصر الطلب', 'error')
        } else {
            setItems(data || [])
        }
        setLoading(false)
    }

    // 1. تعديل الكمية (+ أو -)
    function handleQtyChange(index, delta) {
        setItems(prev => prev.map((item, i) => {
            if (i !== index) return item
            const newQty = Math.max(1, (item.quantity || 1) + delta)
            const unitPrice = parseFloat(item.unit_price) || 0
            return {
                ...item,
                quantity: newQty,
                total_price: newQty * unitPrice
            }
        }))
    }

    // 2. حذف صنف من الطلب
    function handleRemoveItem(index) {
        setItems(prev => prev.filter((_, i) => i !== index))
    }

    // 3. إضافة صنف جديد للطلب
    function handleAddNewItem() {
        if (!selectedProductId) {
            showToast('الرجاء اختيار صنف لإضافته', 'error')
            return
        }
        const product = products.find(p => p.id === selectedProductId)
        if (!product) return

        const unitPrice = parseFloat(product.price) || 0
        const qty = parseInt(addQty, 10) || 1

        // التحقق مما إذا كان الصنف موجوداً مسبقاً
        const existingIndex = items.findIndex(i => i.product_id === product.id)
        if (existingIndex >= 0) {
            setItems(prev => prev.map((item, i) => {
                if (i !== existingIndex) return item
                const updatedQty = item.quantity + qty
                return {
                    ...item,
                    quantity: updatedQty,
                    total_price: updatedQty * unitPrice
                }
            }))
        } else {
            setItems(prev => [
                ...prev,
                {
                    order_id: order.id,
                    product_id: product.id,
                    product_name: product.name_ar || product.name,
                    quantity: qty,
                    unit_price: unitPrice,
                    total_price: qty * unitPrice
                }
            ])
        }

        setSelectedProductId('')
        setAddQty(1)
    }

    // الحسابات المباشرة للإجمالي
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
    const taxRate = order.tax_rate || 0
    const tax = subtotal * (taxRate / 100)
    const total = subtotal + tax

    // 4. حفظ جميع التعديلات في قاعدة البيانات
    async function handleSaveChanges() {
        if (items.length === 0) {
            if (!confirm('الطلب أصبح خالياً من الأصناف. هل تريد إلغاء الطلب بالكامل؟')) return
        }

        setSaving(true)
        try {
            // أ) حذف جميع العناصر القديمة وإعادة إدراج القائمة المعدلة
            const { error: delError } = await supabase
                .from('order_items')
                .delete()
                .eq('order_id', order.id)

            if (delError) throw delError

            if (items.length > 0) {
                const insertPayload = items.map(item => ({
                    order_id: order.id,
                    product_id: item.product_id,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total_price: item.total_price
                }))

                const { error: insertError } = await supabase
                    .from('order_items')
                    .insert(insertPayload)

                if (insertError) throw insertError
            }

            // ب) تحديث مبالغ الطلب الإجمالية في جدول orders
            const { error: orderError } = await supabase
                .from('orders')
                .update({
                    subtotal,
                    tax,
                    total,
                    status: items.length === 0 ? 'cancelled' : order.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.id)

            if (orderError) throw orderError

            showToast('تم تحديث الطلب بنجاح', 'success')
            if (onOrderUpdated) onOrderUpdated()
            onClose()
        } catch (err) {
            showToast(err.message || 'حدث خطأ أثناء حفظ التعديلات', 'error')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '580px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0 }}>تعديل الطلب #{order.order_number || order.id.slice(0, 6)}</h3>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
                </div>

                {loading ? (
                    <div style={{ padding: '20px', textAlign: 'center' }}>جاري تحميل عناصر الطلب...</div>
                ) : (
                    <>
                        {/* قائمة أصناف الطلب الحالية */}
                        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px' }}>
                            {items.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--txt2)', padding: '10px' }}>لا توجد أصناف في هذا الطلب</div>
                            ) : (
                                items.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx !== items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        <div style={{ flex: 1, fontWeight: 'bold' }}>{item.product_name}</div>

                                        {/* التحكم في الكمية */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 12px' }}>
                                            <button className="btn btn-sm btn-ghost" onClick={() => handleQtyChange(idx, -1)} style={{ padding: '2px 6px' }}><Minus size={14} /></button>
                                            <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                                            <button className="btn btn-sm btn-ghost" onClick={() => handleQtyChange(idx, 1)} style={{ padding: '2px 6px' }}><Plus size={14} /></button>
                                        </div>

                                        <div style={{ width: '80px', textAlign: 'right', fontWeight: 'bold' }}>
                                            {(item.total_price || 0).toFixed(2)} AED
                                        </div>

                                        <button className="btn btn-danger btn-sm" onClick={() => handleRemoveItem(idx)} style={{ marginRight: '8px', padding: '4px 8px' }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* قسم إضافة صنف جديد للطلب */}
                        <div style={{ background: 'var(--surf2)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <PackagePlus size={16} /> إضافة صنف جديد للطلب:
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select className="select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ flex: 1 }}>
                                    <option value="">-- اختر صنف --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name_ar || p.name} ({p.price} AED)</option>
                                    ))}
                                </select>
                                <input type="number" className="input" min="1" value={addQty} onChange={e => setAddQty(e.target.value)} style={{ width: '65px' }} />
                                <button className="btn btn-gold" onClick={handleAddNewItem}>إضافة</button>
                            </div>
                        </div>

                        {/* خيارات الإجمالي الجديد */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '2px dashed var(--border)', marginBottom: '16px' }}>
                            <span>الإجمالي الجديد:</span>
                            <span style={{ color: 'var(--gold)' }}>{total.toFixed(2)} AED</span>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-gold" onClick={handleSaveChanges} disabled={saving}>
                                {saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                            </button>
                            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>إلغاء</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}