import { useState, useMemo, useEffect } from 'react'
import { useOrders } from '../context/OrdersContext.jsx'
import { Trash2, Plus, Minus, PackagePlus, X } from 'lucide-react'

// Safe helper for Auth Context
let useAuth
try {
  const authModule = await import('../context/AuthContext.jsx')
  useAuth = authModule.useAuth
} catch (e) {
  // Fallback if auth context path differs
}

function getCategoryName(product) {
  if (!product) return 'Other'
  if (typeof product.category === 'string') return product.category
  if (product.category && typeof product.category === 'object') {
    return product.category.name || product.category.name_ar || product.category.name_en || product.category.title || 'Other'
  }
  if (product.category_name) return product.category_name
  if (product.categories && product.categories.name) return product.categories.name
  return 'Other'
}

export default function EditOrderModal({ order, products = [], onClose, showToast, onOrderUpdated }) {
  const { updateOrderItems } = useOrders()
  
  // Safe Auth Role Check
  let userRole = ''
  try {
    if (typeof useAuth === 'function') {
      const auth = useAuth()
      userRole = auth?.user?.role || auth?.role || ''
    }
  } catch (e) {}

  if (!userRole) {
    try {
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      userRole = stored?.role || localStorage.getItem('role') || localStorage.getItem('user_role') || ''
    } catch(e) {}
  }

  const isCashier = String(userRole).toLowerCase() === 'cashier'

  const [items, setItems] = useState(order?.items || [])
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark') || document.body.classList.contains('dark')
      setIsDarkMode(hasDarkClass)
    }
    checkDark()
    const observer = new MutationObserver(checkDark)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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

  const theme = {
    modalBg: isDarkMode ? '#1c1917' : '#ffffff',
    cardBg: isDarkMode ? '#121110' : '#f8fafc',
    inputBg: isDarkMode ? '#262320' : '#ffffff',
    textPrimary: isDarkMode ? '#f4f4f5' : '#0f172a',
    textSecondary: isDarkMode ? '#a1a1aa' : '#64748b',
    border: isDarkMode ? 'rgba(197, 160, 89, 0.25)' : 'rgba(197, 160, 89, 0.4)',
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
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      {/* Interactive Styles */}
      <style>{`
        .btn-gold-action {
          background: linear-gradient(135deg, #c5a059 0%, #a37f3f 100%) !important;
          color: #000000 !important;
          font-weight: 800 !important;
          transition: all 0.2s ease-in-out !important;
          cursor: pointer !important;
          border: none !important;
        }
        .btn-gold-action:hover {
          filter: brightness(1.15) !important;
          transform: translateY(-1px) !important;
          box-shadow: 0 4px 14px rgba(197, 160, 89, 0.4) !important;
        }
        .btn-gold-action:active {
          transform: translateY(1px) scale(0.97) !important;
          filter: brightness(0.95) !important;
        }
        .btn-qty-control {
          transition: all 0.15s ease-in-out !important;
          cursor: pointer !important;
        }
        .btn-qty-control:hover {
          background-color: rgba(197, 160, 89, 0.25) !important;
          border-radius: 6px !important;
        }
        .btn-qty-control:active {
          transform: scale(0.85) !important;
        }
        .btn-delete-item {
          transition: all 0.2s ease-in-out !important;
          cursor: pointer !important;
        }
        .btn-delete-item:hover {
          background-color: #ef4444 !important;
          color: #ffffff !important;
          transform: scale(1.05) !important;
        }
        .btn-delete-item:active {
          transform: scale(0.9) !important;
        }
        .btn-cancel-action {
          transition: all 0.2s ease-in-out !important;
          cursor: pointer !important;
        }
        .btn-cancel-action:hover {
          background-color: rgba(255, 255, 255, 0.08) !important;
          color: #ffffff !important;
        }
        .btn-cancel-action:active {
          transform: scale(0.95) !important;
        }
      `}</style>

      <div 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '520px', 
          width: '100%', 
          padding: '24px', 
          borderRadius: '16px',
          backgroundColor: theme.modalBg,
          border: `1px solid ${theme.border}`,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          color: theme.textPrimary
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: theme.gold, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Edit Order <span style={{ backgroundColor: 'rgba(197, 160, 89, 0.15)', color: theme.gold, padding: '2px 8px', borderRadius: '6px', fontSize: '12px', border: '1px solid rgba(197, 160, 89, 0.3)', fontWeight: '600' }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: theme.textSecondary, marginTop: '4px' }}>
              Modify items, quantities, or add products
            </div>
          </div>
          <button 
            onClick={onClose}
            className="btn-cancel-action"
            style={{ background: 'transparent', border: 'none', color: theme.textSecondary, padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing Items */}
        <div style={{ 
          maxHeight: '220px', 
          overflowY: 'auto', 
          marginBottom: '18px', 
          backgroundColor: theme.cardBg, 
          borderRadius: '12px', 
          border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          padding: '8px 12px' 
        }}>
          {items.length === 0 ? (
            <div style={{ textAlign: 'center', color: theme.textSecondary, padding: '24px 0', fontSize: '13px' }}>
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
                    borderBottom: idx === items.length - 1 ? 'none' : (isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid #f1f5f9')
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                    <div style={{ fontWeight: '600', fontSize: '13.5px', color: theme.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.product_name}
                    </div>
                    <div style={{ fontSize: '11px', color: theme.textSecondary, marginTop: '2px' }}>
                      AED {uPrice.toFixed(2)} each
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: '8px', padding: '2px', border: `1px solid ${theme.border}` }}>
                      <button 
                        onClick={() => handleQtyChange(idx, -1)} 
                        className="btn-qty-control"
                        style={{ background: 'transparent', border: 'none', color: theme.gold, padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                      >
                        <Minus size={13} />
                      </button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: '700', fontSize: '13px', color: theme.textPrimary }}>
                        {item.quantity}
                      </span>
                      <button 
                        onClick={() => handleQtyChange(idx, 1)} 
                        className="btn-qty-control"
                        style={{ background: 'transparent', border: 'none', color: theme.gold, padding: '4px 8px', display: 'flex', alignItems: 'center' }}
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <div style={{ width: '70px', textAlign: 'right', fontWeight: '700', fontSize: '13.5px', color: theme.textPrimary }}>
                      AED {itemTotal.toFixed(2)}
                    </div>

                    {/* Hide Delete Option ONLY for Cashier */}
                    {!isCashier && (
                      <button 
                        onClick={() => handleRemoveItem(idx)} 
                        className="btn-delete-item"
                        style={{ background: 'rgba(239, 68, 68, 0.12)', border: 'none', color: '#ef4444', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
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
          backgroundColor: theme.cardBg, 
          padding: '14px', 
          borderRadius: '12px', 
          border: `1px solid ${theme.border}`,
          marginBottom: '20px' 
        }}>
          <div style={{ fontWeight: '600', fontSize: '12px', color: theme.gold, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
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
                backgroundColor: theme.inputBg, 
                color: theme.textPrimary, 
                border: `1px solid ${theme.border}`,
                fontSize: '13px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="" style={{ backgroundColor: theme.modalBg, color: theme.textPrimary }}>Select product...</option>
              {Object.keys(groupedProducts).map(catName => (
                <optgroup key={catName} label={`--- ${catName.toUpperCase()} ---`} style={{ backgroundColor: theme.modalBg, color: theme.gold, fontWeight: '700' }}>
                  {groupedProducts[catName].map(p => (
                    <option key={p.id} value={p.id} style={{ backgroundColor: theme.inputBg, color: theme.textPrimary, fontWeight: 'normal' }}>
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
              style={{ 
                width: '55px', 
                textAlign: 'center', 
                padding: '9px 4px', 
                borderRadius: '8px', 
                backgroundColor: theme.inputBg, 
                color: theme.textPrimary, 
                border: `1px solid ${theme.border}`,
                fontSize: '13px',
                outline: 'none'
              }} 
            />
            <button 
              onClick={handleAddNewItem}
              className="btn-gold-action"
              style={{ 
                padding: '9px 18px', 
                borderRadius: '8px', 
                fontSize: '13px'
              }}
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
          borderTop: isDarkMode ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '13.5px', color: theme.textSecondary, fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: theme.gold }}>
            AED {total.toFixed(2)}
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onClose} 
            disabled={saving} 
            className="btn-cancel-action"
            style={{ backgroundColor: 'transparent', color: theme.textSecondary, border: `1px solid ${theme.border}`, padding: '9px 18px', borderRadius: '8px', fontSize: '13px' }}
          >
            Cancel
          </button>
          <button 
            onClick={handleSaveChanges} 
            disabled={saving} 
            className="btn-gold-action"
            style={{ 
              padding: '9px 22px', 
              borderRadius: '8px', 
              fontSize: '13px'
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
