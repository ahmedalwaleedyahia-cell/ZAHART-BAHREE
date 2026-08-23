import { useState, useMemo, useEffect } from 'react'
import { useOrders } from '../context/OrdersContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { Trash2, Plus, Minus, PackagePlus, X, Calendar, CreditCard, MessageSquare, Utensils, ShoppingBag, Truck } from 'lucide-react'

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

function formatDateForInput(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0]
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0]
  return d.toISOString().split('T')[0]
}

function formatTimeForInput(dateStr) {
  if (!dateStr) {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '12:00'
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function EditOrderModal({ order, products: propProducts = [], onClose, showToast, onOrderUpdated }) {
  const { updateOrderItems } = useOrders()
  const { products: ctxProducts } = useProducts()

  const products = (ctxProducts && ctxProducts.length > 0) ? ctxProducts : propProducts

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

  // 1. عناصر الطلب
  const [items, setItems] = useState(() => {
    return (order?.items || []).map(item => {
      const uPrice = parseFloat(item.unit_price || item.price) || 0
      const qty = parseInt(item.quantity, 10) || 1
      const pName = item.product_name || item.name || item.product_name_ar || 'Product'
      return {
        ...item,
        product_id: item.product_id || item.id,
        product_name: pName,
        name: pName,
        quantity: qty,
        unit_price: uPrice,
        price: uPrice,
        total_price: qty * uPrice
      }
    })
  })

  // 2. نوع الطلب، التواريخ، طريقة الدفع والتعليقات ورقم الفاتورة
  const initialDate = formatDateForInput(order?.created_at)
  const initialTime = formatTimeForInput(order?.created_at)

  const [invoiceNumber, setInvoiceNumber] = useState(order?.invoice_number || '')
  const [orderType, setOrderType] = useState(order?.order_type || 'dine_in')
  const [orderDate, setOrderDate] = useState(initialDate)
  const [orderTime, setOrderTime] = useState(initialTime)
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || 'cash')
  const [cashGiven, setCashGiven] = useState(order?.cash_given ?? order?.cashGiven ?? '')
  const [notes, setNotes] = useState(order?.notes || '')

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
    const pName = product.name_ar || product.name || product.name_en || 'Product'

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
          product_name: pName,
          name: pName,
          quantity: qty,
          unit_price: unitPrice,
          price: unitPrice,
          total_price: qty * unitPrice
        }
      ])
    }

    setSelectedProductId('')
    setAddQty(1)
  }

  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total_price || (item.quantity * (item.unit_price || item.price))) || 0), 0)
  const discountPct = parseFloat(order?.discount_pct || order?.discountPct || 0)
  const discountAmount = subtotal * (discountPct / 100)
  const taxable = Math.max(0, subtotal - discountAmount)
  const taxRate = parseFloat(order?.vat_rate || order?.vatRate || order?.tax_rate || 0)
  const tax = taxable * (taxRate / 100)
  const total = taxable + tax

  const numericCashGiven = parseFloat(cashGiven) || 0
  const changeAmount = paymentMethod === 'cash' && numericCashGiven > 0 ? Math.max(0, numericCashGiven - total) : 0

  async function handleSaveChanges() {
    if (items.length === 0) {
      if (!confirm('Order has no items. Save empty order?')) return
    }

    setSaving(true)
    try {
      const normalizedItems = items.map(item => {
        const uPrice = parseFloat(item.unit_price || item.price) || 0
        const qty = parseInt(item.quantity, 10) || 1
        const name = item.product_name || item.name || 'Product'
        return {
          ...item,
          order_id: order.id,
          product_id: item.product_id,
          product_name: name,
          name: name,
          quantity: qty,
          unit_price: uPrice,
          price: uPrice,
          line_total: qty * uPrice,
          total_price: qty * uPrice
        }
      })

      const updatedCreatedAt = new Date(`${orderDate}T${orderTime}:00`).toISOString()

      const orderPayloadUpdates = {
        invoice_number: invoiceNumber.trim() || undefined,
        order_type: orderType,
        payment_method: paymentMethod,
        cash_given: paymentMethod === 'cash' ? (numericCashGiven || null) : null,
        change_amount: paymentMethod === 'cash' ? (changeAmount || null) : null,
        notes: notes.trim() || null,
        created_at: updatedCreatedAt
      }

      if (typeof updateOrderItems === 'function') {
        const { error } = await updateOrderItems(
          order.id,
          normalizedItems,
          subtotal,
          total,
          tax,
          discountAmount,
          orderPayloadUpdates
        )
        if (error) throw new Error(error)
      }

      showToast('Order updated successfully', 'success')

      const updatedOrder = {
        ...order,
        invoice_number: invoiceNumber.trim() || order?.invoice_number,
        items: normalizedItems,
        subtotal: subtotal,
        discount_amount: discountAmount,
        vat_amount: tax,
        tax: tax,
        total_amount: total,
        total: total,
        order_type: orderType,
        payment_method: paymentMethod,
        cash_given: paymentMethod === 'cash' ? numericCashGiven : null,
        change_amount: paymentMethod === 'cash' ? changeAmount : null,
        notes: notes.trim() || null,
        created_at: updatedCreatedAt
      }

      if (onOrderUpdated) {
        onOrderUpdated(updatedOrder)
      }

      onClose()
    } catch (err) {
      showToast(err.message || 'Failed to update order', 'error')
    } finally {
      setSaving(false)
    }
  }

  const orderNumStr = String(invoiceNumber || order?.invoice_number || order?.order_number || order?.id || '').padStart(5, '0')

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <style>{`
        .adaptive-modal-box {
          background-color: var(--surf, #1c1917) !important;
          color: var(--txt, #f4f4f5) !important;
          border: 1px solid var(--bdr, rgba(197, 160, 89, 0.3)) !important;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
          border-radius: 16px !important;
          max-width: 580px;
          width: 100%;
          padding: 24px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
        }

        .adaptive-card {
          background-color: var(--surf2, rgba(0, 0, 0, 0.2)) !important;
          border: 1px solid var(--bdr, rgba(255, 255, 255, 0.1)) !important;
          border-radius: 12px !important;
        }

        .adaptive-input {
          background-color: var(--surf3, var(--surf2, rgba(0, 0, 0, 0.2))) !important;
          color: var(--txt, inherit) !important;
          border: 1px solid var(--bdr, rgba(197, 160, 89, 0.3)) !important;
        }

        .adaptive-input option {
          background-color: var(--surf, #1c1917) !important;
          color: var(--txt, #f4f4f5) !important;
        }

        .type-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid var(--bdr, rgba(197, 160, 89, 0.3));
          background: var(--surf3, rgba(0,0,0,0.2));
          color: var(--txt2, #a1a1aa);
          transition: all 0.2s ease;
        }

        .type-btn.active {
          background: var(--gold, linear-gradient(135deg, #c5a059 0%, #a37f3f 100%));
          color: #000000;
          border-color: transparent;
        }

        .btn-cancel-custom {
          background-color: transparent !important;
          border: 1px solid var(--bdr, rgba(128, 128, 128, 0.3)) !important;
          color: var(--txt, inherit) !important;
          padding: 10px 24px !important;
          border-radius: 8px !important;
          font-weight: 600 !important;
          font-size: 13px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
        }

        .btn-cancel-custom:hover {
          background-color: var(--surf2, rgba(128, 128, 128, 0.15)) !important;
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

        .section-label {
          color: var(--gold, #c5a059);
          font-size: 11px;
          font-weight: 800;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      `}</style>

      <div className="adaptive-modal-box" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold, #c5a059)', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '0.5px' }}>
              EDIT ORDER <span style={{ backgroundColor: 'var(--gold-bg, rgba(197, 160, 89, 0.15))', color: 'var(--gold, #c5a059)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', border: '1px solid var(--bdr, rgba(197, 160, 89, 0.3))' }}>INV-{orderNumStr}</span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--txt2, #a1a1aa)', marginTop: '4px' }}>
              Modify order items, order type, payment details & comments
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--surf2, rgba(128, 128, 128, 0.15))', border: 'none', color: 'var(--txt2, #a1a1aa)', cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div style={{ overflowY: 'auto', paddingRight: '4px', flex: 1, marginBottom: '16px' }}>

          {/* Invoice Number Input */}
          <div className="adaptive-card" style={{ padding: '12px', marginBottom: '14px' }}>
            <label className="section-label">
              Invoice Number / رقم الفاتورة
            </label>
            <input
              type="text"
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="adaptive-input"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none' }}
              placeholder="Enter invoice number..."
            />
          </div>

          {/* 0. Order Type Selector */}
          <div className="adaptive-card" style={{ padding: '12px', marginBottom: '14px' }}>
            <label className="section-label">
              <Utensils size={14} /> Order Type / نوع الطلب
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`type-btn ${orderType === 'dine_in' ? 'active' : ''}`}
                onClick={() => setOrderType('dine_in')}
              >
                <Utensils size={14} /> Dine-In / محلي
              </button>
              <button
                type="button"
                className={`type-btn ${orderType === 'takeaway' ? 'active' : ''}`}
                onClick={() => setOrderType('takeaway')}
              >
                <ShoppingBag size={14} /> Takeaway / سفري
              </button>
              <button
                type="button"
                className={`type-btn ${orderType === 'delivery' ? 'active' : ''}`}
                onClick={() => setOrderType('delivery')}
              >
                <Truck size={14} /> Delivery / توصيل
              </button>
            </div>
          </div>

          {/* 1. Existing Items List */}
          <div className="adaptive-card" style={{ maxHeight: '180px', overflowY: 'auto', marginBottom: '14px', padding: '8px 12px' }}>
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
                      padding: '8px 0',
                      borderBottom: idx === items.length - 1 ? 'none' : '1px solid var(--bdr, rgba(128, 128, 128, 0.15))'
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--txt, inherit)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.product_name || item.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', marginTop: '2px' }}>
                        AED {uPrice.toFixed(2)} each
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="adaptive-input" style={{ display: 'flex', alignItems: 'center', borderRadius: '6px', padding: '2px' }}>
                        <button
                          onClick={() => handleQtyChange(idx, -1)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--gold, #c5a059)', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: '700', fontSize: '12.5px', color: 'var(--txt, inherit)' }}>
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQtyChange(idx, 1)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--gold, #c5a059)', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <div style={{ width: '70px', textAlign: 'right', fontWeight: '700', fontSize: '13px', color: 'var(--txt, inherit)' }}>
                        AED {itemTotal.toFixed(2)}
                      </div>

                      {!isCashier && (
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          style={{ background: 'var(--red-bg, rgba(239, 68, 68, 0.15))', border: 'none', color: 'var(--red, #ef4444)', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Remove Item"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* 2. Add Product Box */}
          <div className="adaptive-card" style={{ padding: '12px', marginBottom: '14px' }}>
            <label className="section-label">
              <PackagePlus size={14} /> Add Product
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="adaptive-input"
                style={{ flex: 1, fontSize: '12.5px', borderRadius: '8px', padding: '8px 10px', outline: 'none' }}
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
                style={{ width: '55px', textAlign: 'center', padding: '8px 4px', borderRadius: '8px', outline: 'none', fontSize: '12.5px' }}
              />
              <button
                onClick={handleAddNewItem}
                className="btn-gold-custom"
                style={{ padding: '8px 14px', fontSize: '12.5px' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* 3. Date & Time Settings */}
          <div className="adaptive-card" style={{ padding: '12px', marginBottom: '14px' }}>
            <label className="section-label">
              <Calendar size={14} /> Date & Time
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', display: 'block', marginBottom: '4px' }}>Order Date</span>
                <input
                  type="date"
                  value={orderDate}
                  onChange={e => setOrderDate(e.target.value)}
                  className="adaptive-input"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none' }}
                />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', display: 'block', marginBottom: '4px' }}>Order Time</span>
                <input
                  type="time"
                  value={orderTime}
                  onChange={e => setOrderTime(e.target.value)}
                  className="adaptive-input"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* 4. Payment Method & Received Amount */}
          <div className="adaptive-card" style={{ padding: '12px', marginBottom: '14px' }}>
            <label className="section-label">
              <CreditCard size={14} /> Payment Details
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: paymentMethod === 'cash' ? '1fr 1fr' : '1fr', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', display: 'block', marginBottom: '4px' }}>Payment Method</span>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="adaptive-input"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none' }}
                >
                  <option value="cash">Cash</option>
                  <option value="visa">Card / Visa</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>

              {paymentMethod === 'cash' && (
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--txt2, #a1a1aa)', display: 'block', marginBottom: '4px' }}>Cash Received (AED)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={cashGiven}
                    onChange={e => setCashGiven(e.target.value)}
                    className="adaptive-input"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none' }}
                  />
                </div>
              )}
            </div>

            {paymentMethod === 'cash' && numericCashGiven > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', color: 'var(--txt2, #a1a1aa)', background: 'var(--surf3, rgba(0,0,0,0.2))', padding: '6px 10px', borderRadius: '6px' }}>
                <span>Change to return:</span>
                <span style={{ fontWeight: '700', color: changeAmount >= 0 ? 'var(--gold, #c5a059)' : '#ef4444' }}>
                  AED {changeAmount.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* 5. Comments & Order Notes */}
          <div className="adaptive-card" style={{ padding: '12px' }}>
            <label className="section-label">
              <MessageSquare size={14} /> Order Notes / Comments
            </label>
            <textarea
              rows="2"
              placeholder="Add order comments or special instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="adaptive-input"
              style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', fontSize: '12.5px', outline: 'none', resize: 'vertical' }}
            />
          </div>

        </div>

        {/* Total Summary */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '10px',
          borderTop: '1px solid var(--bdr, rgba(128, 128, 128, 0.15))',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--txt2, #a1a1aa)', fontWeight: '500' }}>New Total Amount:</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--gold, #c5a059)' }}>
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