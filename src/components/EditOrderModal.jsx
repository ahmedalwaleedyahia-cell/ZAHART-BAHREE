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
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '520px', 
          width: '100%', 
          padding: '24px', 
          borderRadius: '16px',
          backgroundColor: '#18181b',
          border: '1px solid #27272a',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          color: '#f4f4f5',
          fontFamily: 'inherit'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#eab308', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Edit Order <span style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(234, 179, 8, 0.3)' }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '4px' }}>
              Modify items, quantities, or add products
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing Items */}
        <div style={{ 
          maxHeight: '220px', 
          overflowY: 'auto', 
          marginBottom: '18px', 
          backgroundColor: '#09090b', 
          borderRadius: '12px', 
          border: '1px solid #27272a',
          padding: '8px 12px' 
        }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#71717a', padding: '24px 0', fontSize: '13px' }}>
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
                    padding: '10px 0', 
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid #18181b' 
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#a1a1aa', marginTop: '2px' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#27272a', borderRadius: '8px', padding: '2px' }}>
                      <button 
                        onClick={() => handleQtyChange(idx, -1)} 
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: '#fff' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(idx, 1)} 
                        style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div style={{ width: '70px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: '#ffffff' }}>
                      AED {itemTotal.toFixed(2)}
                    </div>

                    <button 
                      onClick={() => handleRemoveItem(idx)} 
                      style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
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

        {/* Add Product Box */}
        <div style={{ 
          backgroundColor: '#09090b', 
          padding: '14px', 
          borderRadius: '12px', 
          border: '1px solid #27272a',
          marginBottom: '20px' 
        }}>
          <div style={{ fontWeight: '600', fontSize: '12px', color: '#eab308', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <PackagePlus size={14} /> Add Product
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)} 
              style={{ 
                flex: 1, 
                padding: '9px 12px', 
                borderRadius: '8px', 
                backgroundColor: '#18181b', 
                color: '#ffffff', 
                border: '1px solid #3f3f46',
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ backgroundColor: '#18181b', color: '#fff' }}>Select product...</option>
              {products.map(p => (
                <option key={p.id} value={p.id} style={{ backgroundColor: '#18181b', color: '#fff' }}>
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
                padding: '9px 4px', 
                borderRadius: '8px', 
                backgroundColor: '#18181b', 
                color: '#ffffff', 
                border: '1px solid #3f3f46',
                fontSize: '13px',
                outline: 'none'
              }} 
            />
            <button 
              onClick={handleAddNewItem}
              style={{ backgroundColor: '#eab308', color: '#000', border: 'none', padding: '9px 16px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
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
          borderTop: '1px solid #27272a',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: '#a1a1aa', fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: '#eab308' }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={saving} 
            style={{ backgroundColor: 'transparent', color: '#a1a1aa', border: '1px solid #3f3f46', padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving} 
            style={{ backgroundColor: '#eab308', color: '#000000', border: 'none', padding: '9px 22px', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
