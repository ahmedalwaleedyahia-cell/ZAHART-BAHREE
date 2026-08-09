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

  // Check user role safely from localStorage
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

  // Dynamic Grouping by Category
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div className="modal-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Edit Order <span className="badge badge-gold">INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--txt3)' }}>
              Modify items, quantities, or add products
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-icon"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Existing Items List */}
        <div style={{ 
          maxHeight: '220px', 
          overflowY: 'auto', 
          marginBottom: '18px', 
          backgroundColor: 'var(--surf)', 
          borderRadius: 'var(--r-md)', 
          border: '1px solid var(--bdr)',
          padding: '8px 12px' 
        }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--txt3)', padding: '24px 0', fontSize: '13px' }}>
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
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--bdr)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--txt3)', marginTop: '2px' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surf2)', borderRadius: 'var(--r-sm)', padding: '2px', border: '1px solid var(--bdr)' }}>
                      <button 
                        onClick={() => handleQtyChange(idx, -1)} 
                        className="btn-icon btn-sm"
                        style={{ border: 'none', width: '26px', height: '26px' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: 'var(--txt)' }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(idx, 1)} 
                        className="btn-icon btn-sm"
                        style={{ border: 'none', width: '26px', height: '26px' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ width: '75px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: 'var(--txt)' }}>
                      AED {itemTotal.toFixed(2)}
                    </div>

                    {/* Hide Delete Option ONLY for Cashier */}
                    {!isCashier && (
                      <button 
                        onClick={() => handleRemoveItem(idx)} 
                        className="btn-icon btn-icon-danger btn-sm"
                        title="Remove Item"
                        style={{ width: '30px', height: '30px' }}
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
        <div style={{ 
          backgroundColor: 'var(--surf)', 
          padding: '14px', 
          borderRadius: 'var(--r-md)', 
          border: '1px solid var(--bdr)',
          marginBottom: '20px' 
        }}>
          <label className="form-label" style={{ color: 'var(--gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <PackagePlus size={14} /> Add Product
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)} 
              className="select"
              style={{ flex: 1, fontSize: '13px' }}
            >
              <option value="">Select product...</option>
              {Object.keys(groupedProducts).map(catName => (
                <optgroup key={catName} label={`--- ${catName.toUpperCase()} ---`}>
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
              className="input"
              style={{ width: '60px', textAlign: 'center', padding: '9px 4px' }} 
            />
            <button 
              onClick={handleAddNewItem}
              className="btn btn-gold btn-sm"
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
          borderTop: '1px solid var(--bdr)',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: 'var(--txt2)', fontWeight: '500' }}>New Total Amount:</span>
          <span className="val-gold" style={{ fontSize: '20px', fontWeight: '800' }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div className="modal-actions" style={{ justifyContent: 'flex-end', marginTop: 0 }}>
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="btn btn-ghost"
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving} 
            className="btn btn-gold"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
