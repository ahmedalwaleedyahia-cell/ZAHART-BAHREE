import { useOrders } from '../context/OrdersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import EditOrderModal from '../components/EditOrderModal.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { fmtNum, fmtDateTime } from '../utils/format.js'
import { useState, useRef, useMemo } from 'react'
import Modal from '../components/ui/Modal.jsx'
import Empty from '../components/ui/Empty.jsx'
import ReceiptPreview from '../components/ui/ReceiptPreview.jsx'
import KitchenReceipt from '../components/ui/KitchenReceipt.jsx'
import { ClipboardList, Printer, Search, Utensils, Pencil } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function OrdersPage({ showToast }) {
  const { orders, loading, updateOrderStatus, updatePaymentMethod, fetchOrders } = useOrders()
  const { products } = useProducts()
  const { isAdmin } = useAuth()
  const { settings } = useSettings()
  
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [search, setSearch] = useState('')

  const printContainerRef = useRef(null)

  const handlePrint = useReactToPrint({
    contentRef: printContainerRef,
    documentTitle: `Receipt-${receiptOrder?.invoice_number || receiptOrder?.order_number || '1'}`,
    removeAfterPrint: true,
    pageStyle: `
@page {
    size: 80mm auto;
    margin: 0;
}
html, body {
    margin: 0 !important;
    padding: 0 !important;
    background: white !important;
}
body * {
    visibility: hidden;
}
.print-area, .print-area * {
    visibility: visible;
}
.print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm !important;
}
.page-break {
    break-after: page;
    page-break-after: always;
}
`
  })

  async function handleCancel(id) {
    if (!confirm('Cancel this order?')) return
    const { error } = await updateOrderStatus(id, 'cancelled')
    if (error) {
      showToast(error, 'error')
    } else {
      showToast('Order cancelled', 'info')
    }
  }

  async function handlePaymentChange(orderId, newMethod) {
    const { error } = await updatePaymentMethod(orderId, newMethod)
    if (error) {
      showToast(error, 'error')
    } else {
      showToast(`Payment method updated to ${newMethod.toUpperCase()}`, 'success')
    }
  }

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(o => {
      const invNum = String(o.invoice_number || o.order_number || '')
      const cashier = (o.cashier_name || '').toLowerCase()
      const method = (o.payment_method || '').toLowerCase()
      return invNum.toLowerCase().includes(q) || cashier.includes(q) || method.includes(q)
    })
  }, [orders, search])

  return (
    <div className="scroll-view">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Order History</div>
          <div className="page-sub">All processed orders — real-time</div>
        </div>
        <span className="badge badge-gold">{filteredOrders.length} orders</span>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '20px' }}>
        <div className="search-wrapper" style={{ width: '100%', position: 'relative' }}>
          <Search size={18} className="search-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)' }} />
          <input
            className="search-input"
            type="text"
            placeholder="Search orders, cashier, payment..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '44px', paddingRight: search ? '40px' : '16px' }}
          />
          {search && (
            <button
              className="search-clear-btn"
              onClick={() => setSearch('')}
              type="button"
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--txt3)' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading
        ? <Skeleton rows={8} />
        : filteredOrders.length === 0
          ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '300px' }}>
              <Empty
                icon={<ClipboardList size={36} strokeWidth={1.4} />}
                text={search ? "No matching orders" : "No orders yet"}
                sub={search ? "Try searching for another term" : "Processed orders will appear here"}
              />
            </div>
          )
          : (
            <div className="card table-card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Items</th>
                    <th>Cashier</th>
                    <th>Payment Method</th>
                    <th>Time</th>
                    <th>Total (AED)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => {
                    const method = (o.payment_method || 'cash').toLowerCase()
                    return (
                      <tr
                        key={o.id}
                        className={o.status === 'cancelled' ? 'row-cancelled' : ''}
                      >
                        <td>
                          <span className="order-num">
                            INV-{String(o.invoice_number || o.order_number).padStart(5, '0')}
                          </span>
                        </td>
                        <td className="items-cell">
                          {o.items?.slice(0, 2).map(i => `${i.quantity}× ${i.product_name}`).join(', ')}
                          {(o.items?.length || 0) > 2 && ` +${o.items.length - 2}`}
                        </td>
                        <td style={{ fontSize: 12.5 }}>{o.cashier_name}</td>
                        <td>
                          <select
                            value={method}
                            onChange={(e) => handlePaymentChange(o.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '700',
                              border: '1px solid currentColor',
                              cursor: 'pointer',
                              outline: 'none',
                              backgroundColor: method === 'cash' ? 'rgba(34, 197, 94, 0.15)' : method === 'unpaid' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                              color: method === 'cash' ? '#22c55e' : method === 'unpaid' ? '#ef4444' : '#3b82f6',
                            }}
                          >
                            <option value="cash" style={{ background: '#1e1e1e', color: '#fff' }}>CASH</option>
                            <option value="visa" style={{ background: '#1e1e1e', color: '#fff' }}>VISA</option>
                            <option value="unpaid" style={{ background: '#1e1e1e', color: '#fff' }}>UNPAID</option>
                          </select>
                        </td>
                        <td className="time-cell">{fmtDateTime(o.created_at)}</td>
                        <td><strong>AED {fmtNum(o.total_amount)}</strong></td>
                        <td className="action-cell">
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setReceiptOrder(o)}
                            title="View receipt"
                          >
                            <Printer size={13} strokeWidth={2} />
                          </button>
                          
                          {isAdmin && o.status !== 'cancelled' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditingOrder(o)}
                              title="Edit order items"
                            >
                              <Pencil size={13} strokeWidth={2} />
                            </button>
                          )}

                          {isAdmin && o.status === 'completed' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancel(o.id)}
                              title="Cancel order"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
      }

      {/* Receipt modal */}
      {receiptOrder && (
        <Modal onClose={() => setReceiptOrder(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="modal-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Receipt #{receiptOrder.order_number}</span>
              <span className="badge badge-gold" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Utensils size={12} /> Includes Kitchen Copy
              </span>
            </div>
            <button
              className="btn btn-gold btn-sm"
              onClick={handlePrint}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={13} strokeWidth={2} />
              Print Both Slips
            </button>
          </div>

          <div style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '4px' }}>
            <div ref={printContainerRef} className="print-area">
              <div>
                <ReceiptPreview order={receiptOrder} settings={settings} />
              </div>

              <div className="page-break" style={{ height: '20px' }} />

              <div>
                <KitchenReceipt order={receiptOrder} />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Order Modal */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          products={products}
          onClose={() => setEditingOrder(null)}
          showToast={showToast}
          onOrderUpdated={() => {
            if (typeof fetchOrders === 'function') {
              fetchOrders()
            } else {
              window.location.reload()
            }
          }}
        />
      )}
    </div>
  )
}
