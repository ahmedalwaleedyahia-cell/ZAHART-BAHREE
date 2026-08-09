import { useState, useMemo, useEffect } from 'react'
import { useOrders } from '../context/OrdersContext.jsx'
import { Trash2, Plus, Minus, PackagePlus, X } from 'lucide-react'

function getCategoryName(product) {
  if (!product) return 'Other'
  if (typeof product.category === 'string' && product.category.trim()) return product.category
  if (product.category && typeof product.category === 'object') {
    const name = product.category.name || product.category.name_ar || product.category.name_en || product.category.title
    if (name) return name
  }
  if (product.category_name) return product.category_name
  if (product.categories && typeof product.categories === 'object') {
    if (product.categories.name) return product.categories.name
  }
  return 'Other'
}

export default function EditOrderModal({ order, products = [], onClose, showToast, onOrderUpdated }) {
  const { updateOrderItems } = useOrders()

  const [isCashier, setIsCashier] = useState(false)
  useEffect(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}')
      const role = storedUser?.role || localStorage.getItem('role') || localStorage.getItem('user_role') || ''
      setIsCashier(String(role).toLowerCase() === 'cashier')
    } catch (e) {
      setIsCashier(false)
    }
  }, [])

  const [items, setItems] = useState(order?.items || [])
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState(1)

  const groupedProducts = useMemo(() => {
    const groups = {}
    products.forEach(p => {
      const catName = getCategoryName(p)
      if (!groups[catName]) groups[catName] = []
      groups[catName].push(p)
    })
    return groups
  }, [products])

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
    const product = products.find(p => String(p.id) === String(selectedProductId))
    if (!product) return

    const unitPrice = parseFloat(product.price) || 0
    const qty = parseInt(addQty, 10) || 1

    const existingIndex = items.findIndex(i => String(i.product_id) === String(product.id))
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
  const taxRate = order?.tax_rate || 0
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  async function handleSaveChanges() {
    if (items.length === 0) {
      if (!confirm('Order has no items. Save empty order?')) return
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

  const orderNumStr = String(order?.invoice_number || order?.order_number || order?.id || '').padStart(5, '0')

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      {/* Styles adapted dynamically to system Light & Dark mode variables */}
      <style>{`
        .adaptive-modal-box {
          background-color: var(--modal-bg, var(--surf, #1e1c1a)) !important;
          color: var(--txt, #ffffff) !important;
          border: 1px solid var(--bdr, rgba(197, 160, 89, 0.3)) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5) !important;
          border-radius: 16px !important;
          max-width: 520px;
          width: 100%;
          padding: 24px;
        }

        .adaptive-card {
          background-color: var(--surf2, var(--card-bg, rgba(255, 255, 255, 0.04))) !important;
          border: 1px solid var(--bdr, rgba(255, 255, 255, 0.1)) !important;
          border-radius: 12px !important;
        }

        .adaptive-input {
          background-color: var(--surf3, var(--input-bg, rgba(255, 255, 255, 0.06))) !important;
          color: var(--txt, #ffffff) !important;
          border: 1px solid var(--bdr, rgba(197, 160, 89, 0.3)) !important;
        }

        .adaptive-input option {
          background-color: var(--surf, #1e1c1a) !important;
          color: var(--txt, #ffffff) !important;
        }

        /* Fix for Cancel button text disappearing on click/active/hover */
        .btn-cancel-custom {
          background: transparent !important;
          border: 1px solid var(--bdr, rgba(255, 255, 255, 0.2)) !important;
          color: var(--txt, #ffffff) !important;
          padding: 10px 24px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
        }

        .btn-cancel-custom:hover, 
        .btn-cancel-custom:active, 
        .btn-cancel-custom:focus {
          background: var(--surf2, rgba(255, 255, 255, 0.1)) !important;
          color: var(--txt, #ffffff) !important;
          border-color: var(--txt2, rgba(255, 255, 255, 0.4)) !important;
        }

        .btn-gold-custom {
          background: var(--gold, linear-gradient(135deg, #c5a059 0%, #a37f3f 100%)) !important;
          color: #000000 !important;
          font-weight: 800 !important;
          border: none !important;
          padding: 10px 24px !important;
          border-radius: 8px !important;
          font-size: 13px !important;
          cursor: pointer !important;
        }
      `}</style>

      <div className="adaptive-modal-box" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold, #c5a059)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.5px' }}>
              EDIT ORDER <span style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', color: 'var(--gold, #c5a059)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--bdr, rgba(197, 160, 89, 0.3))' }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--txt2, #a1a1aa)', marginTop: '4px' }}>
              Modify items, quantities, or add products
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'var(--surf2, rgba(255, 255, 255, 0.08))', border: 'none', color: 'var(--txt2, #a1a1aa)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Items List */}
        <div 
          className="adaptive-card"
          style={{ 
            maxHeight: '220px', 
            overflowY: 'auto', 
            marginBottom: '18px', 
            padding: '8px 12px' 
          }}
        >
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
                    justifyContent: 'space-between', 
                    padding: '10px 0', 
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--bdr, rgba(255, 255, 255, 0.08))'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--txt, #ffffff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', marginTop: '2px' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Quantity Controls */}
                    <div className="adaptive-input" style={{ display: 'flex', alignItems: 'center', borderRadius: '8px', padding: '2px' }}>
                      <button 
                        onClick={() => handleQtyChange(idx, -1)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--gold, #c5a059)', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--txt, #ffffff)' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(idx, 1)} 
                        style={{ background: 'transparent', border: 'none', color: 'var(--gold, #c5a059)', width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ width: '75px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: 'var(--txt, #ffffff)' }}>
                      AED {itemTotal.toFixed(2)}
                    </div>

                    {/* Hide Delete Option ONLY for Cashier */}
                    {!isCashier && (
                      <button 
                        onClick={() => handleRemoveItem(idx)} 
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: 'none', color: '#ef4444', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Add Product Box */}
        <div 
          className="adaptive-card"
          style={{ 
            padding: '14px', 
            marginBottom: '20px' 
          }}
        >
          <label style={{ color: 'var(--gold, #c5a059)', fontSize: '11px', fontWeight: '800', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <PackagePlus size={14} /> Add Product
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)} 
              className="adaptive-input"
              style={{ flex: 1, fontSize: '13px', borderRadius: '8px', padding: '9px 12px', outline: 'none' }}
            >
              <option value="">Select product...</option>
              {Object.keys(groupedProducts).map(catName => (
                <optgroup key={catName} label={`--- ${catName.toUpperCase()} ---`} style={{ color: 'var(--gold, #c5a059)', fontWeight: '700' }}>
                  {groupedProducts[catName].map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name_ar || p.name} — AED {parseFloat(p.price).toFixed(2)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input 
              type="number" 
              min="1" 
              value={addQty} 
              onChange={e => setAddQty(e.target.value)} 
              className="adaptive-input"
              style={{ width: '60px', textAlign: 'center', padding: '9px 4px', borderRadius: '8px', outline: 'none' }} 
            />
            <button 
              onClick={handleAddNewItem}
              className="btn-gold-custom"
              style={{ padding: '9px 18px' }}
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
          borderTop: '1px solid var(--bdr, rgba(255, 255, 255, 0.08))',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: 'var(--txt2, #a1a1aa)', fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--gold, #c5a059)' }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="btn-cancel-custom"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving} 
            className="btn-gold-custom"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
