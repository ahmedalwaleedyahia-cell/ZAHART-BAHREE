import { useState } from 'react'
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

  const orderNumStr = String(order.invoice_number || order.order_number || order.id).padStart(5, '0')

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justify: 'center',
        zIndex: 1000
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '520px', 
          width: '92%', 
          padding: '24px', 
          borderRadius: '16px',
          background: 'var(--surf1, #1e1e1e)',
          border: '1px solid var(--border, rgba(255,255,255,0.12))',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          color: 'var(--txt, #fff)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--gold, #eab308)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Edit Order <span className="badge badge-gold" style={{ fontSize: '12px' }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--txt3, #a1a1aa)', marginTop: '2px' }}>
              Modify items, update quantities, or add new items
            </div>
          </div>
          <button 
            className="btn btn-ghost btn-sm" 
            onClick={onClose}
            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Items List */}
        <div style={{ 
          maxHeight: '220px', 
          overflowY: 'auto', 
          marginBottom: '18px', 
          background: 'var(--surf2, #141414)', 
          borderRadius: '12px', 
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          padding: '8px 12px' 
        }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--txt3, #a1a1aa)', padding: '24px 0', fontSize: '13px' }}>
              No items in this order
            </div>
          ) : (
            items.map((item, idx) => {
              const uPrice = parseFloat(item.unit_price || item.price) || 0
              const itemTotal = item.total_price || (item.quantity * uPrice)
              return (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justify: 'space-between', 
                    padding: '10px 4px', 
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--border, rgba(255,255,255,0.06))' 
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--txt3, #a1a1aa)' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surf3, #2a2a2a)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => handleQtyChange(idx, -1)} 
                        style={{ padding: '2px 6px', height: '26px', width: '26px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '700', fontSize: '13px' }}>
                        {item.quantity}
                      </span>
                      <button 
                        className="btn btn-ghost btn-sm" 
                        onClick={() => handleQtyChange(idx, 1)} 
                        style={{ padding: '2px 6px', height: '26px', width: '26px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ width: '70px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: '#fff' }}>
                      AED {itemTotal.toFixed(2)}
                    </div>

                    <button 
                      className="btn btn-ghost btn-sm" 
                      onClick={() => handleRemoveItem(idx)} 
                      style={{ color: '#ef4444', padding: '4px', height: '28px', width: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Remove Item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Add New Item Box */}
        <div style={{ 
          background: 'var(--surf2, #141414)', 
          padding: '14px', 
          borderRadius: '12px', 
          border: '1px solid var(--border, rgba(255,255,255,0.08))',
          marginBottom: '20px' 
        }}>
          <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--gold, #eab308)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <PackagePlus size={14} /> Add Product
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)} 
              style={{ 
                flex: 1, 
                padding: '8px 12px', 
                borderRadius: '8px', 
                background: 'var(--surf3, #2a2a2a)', 
                color: '#fff', 
                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ background: '#1e1e1e', color: '#fff' }}>Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} style={{ background: '#1e1e1e', color: '#fff' }}>
                  {p.name_ar || p.name} — AED {parseFloat(p.price).toFixed(2)}
                </option>
              ))}
            </select>
            <input 
              type="number" 
              min="1" 
              value={addQty} 
              onChange={e => setAddQty(e.target.value)} 
              style={{ 
                width: '55px', 
                textAlign: 'center', 
                padding: '8px', 
                borderRadius: '8px', 
                background: 'var(--surf3, #2a2a2a)', 
                color: '#fff', 
                border: '1px solid var(--border, rgba(255,255,255,0.12))',
                fontSize: '13px',
                outline: 'none'
              }} 
            />
            <button 
              className="btn btn-gold btn-sm" 
              onClick={handleAddNewItem}
              style={{ padding: '8px 14px', borderRadius: '8px', fontWeight: '600' }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Total Summary */}
        <div style={{ 
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center', 
          paddingTop: '12px', 
          borderTop: '1px solid var(--border, rgba(255,255,255,0.1))',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: 'var(--txt2, #a1a1aa)', fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gold, #eab308)' }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving} style={{ padding: '9px 18px', borderRadius: '8px' }}>
            Cancel
          </button>
          <button className="btn btn-gold" onClick={handleSaveChanges} disabled={saving} style={{ padding: '9px 22px', borderRadius: '8px', fontWeight: '700' }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
