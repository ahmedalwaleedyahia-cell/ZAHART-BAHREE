import { useState, useEffect } from 'react'
import { useOrders } from '../context/OrdersContext.jsx'
import { Trash2, Plus, Minus, PackagePlus, X } from 'lucide-react'

export default function EditOrderModal({ order, products, onClose, showToast, onOrderUpdated }) {
  const { updateOrderItems } = useOrders()
  const [items, setItems] = useState(order?.items || [])
  const [saving, setSaving] = useState(false)
  
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState(1)

  function handleQtyChange(index, delta) {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item
      const newQty = Math.max(1, (item.quantity || 1) + delta)
      const unitPrice = parseFloat(item.unit_price || item.price) || 0
      return {
        ...item,
        quantity: newQty,
        total_price: newQty * unitPrice
      }
    }))
  }

  function handleRemoveItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  function handleAddNewItem() {
    if (!selectedProductId) {
      showToast('Please select a product', 'error')
      return
    }
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return

    const unitPrice = parseFloat(product.price) || 0
    const qty = parseInt(addQty, 10) || 1

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

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price || (item.quantity * (item.unit_price || item.price))) || 0), 0)
  const taxRate = order.tax_rate || 0
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  async function handleSaveChanges() {
    if (items.length === 0) {
      if (!confirm('Order has no items. Cancel order?')) return
    }

    setSaving(true)
    try {
      if (typeof updateOrderItems === 'function') {
        const { error } = await updateOrderItems(order.id, items, total)
        if (error) throw new Error(error)
      }
      showToast('Order updated successfully', 'success')
      if (onOrderUpdated) onOrderUpdated()
      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to update order', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ background: 'var(--surf1, #1e1e1e)', color: 'var(--txt, #fff)', width: '90%', maxWidth: '540px', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Edit Order #{order.invoice_number || order.order_number}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '16px', border: '1px solid var(--surf3, #333)', borderRadius: '8px', padding: '10px' }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '10px' }}>No items in order</div>
          ) : (
            items.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--surf3, #2a2a2a)' }}>
                <div style={{ flex: 1, fontWeight: '600', fontSize: '0.9rem' }}>{item.product_name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 10px' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleQtyChange(idx, -1)} style={{ padding: '2px 6px' }}><Minus size={14} /></button>
                  <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{item.quantity}</span>
                  <button className="btn btn-sm btn-ghost" onClick={() => handleQtyChange(idx, 1)} style={{ padding: '2px 6px' }}><Plus size={14} /></button>
                </div>
                <div style={{ width: '75px', textAlign: 'right', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  {(item.total_price || (item.quantity * (item.unit_price || item.price)) || 0).toFixed(2)}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleRemoveItem(idx)} style={{ marginLeft: '8px', padding: '4px 6px' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ background: 'var(--surf2, #252525)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PackagePlus size={15} /> Add Item:
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <select className="select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} style={{ flex: 1, padding: '6px' }}>
              <option value="">-- Select Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name_ar || p.name} ({p.price} AED)</option>
              ))}
            </select>
            <input type="number" className="input" min="1" value={addQty} onChange={e => setAddQty(e.target.value)} style={{ width: '60px', textAlign: 'center' }} />
            <button className="btn btn-gold btn-sm" onClick={handleAddNewItem}>Add</button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontWeight: 'bold', fontSize: '1.1rem', borderTop: '1px dashed var(--surf3, #444)', marginBottom: '16px' }}>
          <span>New Total:</span>
          <span style={{ color: 'var(--gold, #eab308)' }}>AED {total.toFixed(2)}</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-gold" onClick={handleSaveChanges} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
