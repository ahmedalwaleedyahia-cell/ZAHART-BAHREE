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

  // Fixed Dark Mode Styling Scheme
  const darkTheme = {
    modalBg: '#1c1917',
    cardBg: '#121110',
    inputBg: '#262320',
    textPrimary: '#f4f4f5',
    textSecondary: '#a1a1aa',
    border: 'rgba(197, 160, 89, 0.25)',
    gold: '#c5a059'
  }

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          backgroundColor: darkTheme.modalBg,
          border: `1px solid ${darkTheme.border}`,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          color: darkTheme.textPrimary
        }}
      >
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: darkTheme.gold, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Edit Order <span style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', color: darkTheme.gold, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', border: `1px solid ${darkTheme.border}` }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: darkTheme.textSecondary, marginTop: '4px' }}>
              Modify items, quantities, or add products
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: darkTheme.textSecondary, cursor: 'pointer', padding: '4px' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing Items List */}
        <div style={{ 
          maxHeight: '220px', 
          overflowY: 'auto', 
          marginBottom: '18px', 
          backgroundColor: darkTheme.cardBg, 
          borderRadius: '12px', 
          border: `1px solid ${darkTheme.border}`,
          padding: '8px 12px' 
        }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: darkTheme.textSecondary, padding: '24px 0', fontSize: '13px' }}>
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
                    borderBottom: idx === items.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: darkTheme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: darkTheme.textSecondary, marginTop: '2px' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Quantity Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: darkTheme.inputBg, borderRadius: '8px', padding: '2px', border: `1px solid ${darkTheme.border}` }}>
                      <button 
                        onClick={() => handleQtyChange(idx, -1)} 
                        style={{ background: 'transparent', border: 'none', color: darkTheme.gold, width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: darkTheme.textPrimary }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(idx, 1)} 
                        style={{ background: 'transparent', border: 'none', color: darkTheme.gold, width: '26px', height: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ width: '75px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: darkTheme.textPrimary }}>
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
        <div style={{ 
          backgroundColor: darkTheme.cardBg, 
          padding: '14px', 
          borderRadius: '12px', 
          border: `1px solid ${darkTheme.border}`,
          marginBottom: '20px' 
        }}>
          <label style={{ color: darkTheme.gold, fontSize: '12px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
            <PackagePlus size={14} /> Add Product
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select 
              value={selectedProductId} 
              onChange={e => setSelectedProductId(e.target.value)} 
              style={{ flex: 1, fontSize: '13px', backgroundColor: darkTheme.inputBg, color: darkTheme.textPrimary, border: `1px solid ${darkTheme.border}`, borderRadius: '8px', padding: '9px 12px', outline: 'none' }}
            >
              <option value="" style={{ backgroundColor: darkTheme.modalBg, color: darkTheme.textPrimary }}>Select product...</option>
              {Object.keys(groupedProducts).map(catName => (
                <optgroup key={catName} label={`--- ${catName.toUpperCase()} ---`} style={{ backgroundColor: darkTheme.modalBg, color: darkTheme.gold, fontWeight: '700' }}>
                  {groupedProducts[catName].map(p => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: darkTheme.inputBg, color: darkTheme.textPrimary, fontWeight: 'normal' }}>
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
              style={{ width: '60px', textAlign: 'center', padding: '9px 4px', backgroundColor: darkTheme.inputBg, color: darkTheme.textPrimary, border: `1px solid ${darkTheme.border}`, borderRadius: '8px', outline: 'none' }} 
            />
            <button 
              onClick={handleAddNewItem}
              style={{ background: 'linear-gradient(135deg, #c5a059 0%, #a37f3f 100%)', color: '#000000', fontWeight: '800', border: 'none', borderRadius: '8px', padding: '9px 18px', cursor: 'pointer' }}
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
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: darkTheme.textSecondary, fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: darkTheme.gold }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={saving} 
            style={{ backgroundColor: 'transparent', color: darkTheme.textSecondary, border: `1px solid ${darkTheme.border}`, padding: '9px 18px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving} 
            style={{ background: 'linear-gradient(135deg, #c5a059 0%, #a37f3f 100%)', color: '#000000', fontWeight: '800', border: 'none', padding: '9px 22px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  )
}
