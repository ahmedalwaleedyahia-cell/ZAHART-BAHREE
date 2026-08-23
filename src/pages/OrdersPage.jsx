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
import { ClipboardList, Printer, Search, Utensils, Pencil, Trash2 } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function OrdersPage({ showToast }) {
  const { orders, loading, deleteOrder, updatePaymentMethod, reload } = useOrders()
  const { products } = useProducts()
  const { isAdmin } = useAuth()
  const { settings } = useSettings()

  const [receiptOrder, setReceiptOrder] = useState(null)
  const [editingOrder, setEditingOrder] = useState(null)
  const [deletingOrder, setDeletingOrder] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
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

  async function confirmDeleteOrder() {
    if (!deletingOrder) return
    setIsDeleting(true)
    const { success, error } = await deleteOrder(deletingOrder.id)
    setIsDeleting(false)

    if (success) {
      showToast?.('تم حذف الطلب بنجاح من قاعدة البيانات', 'info')
      setDeletingOrder(null)
    } else {
      showToast?.(error || 'فشل حذف الطلب', 'error')
    }
  }

  async function handlePaymentChange(orderId, newMethod) {
    const { error } = await updatePaymentMethod(orderId, newMethod)
    if (error) {
      showToast?.(error, 'error')
    } else {
      showToast?.(`تم تحديث طريقة الدفع إلى ${newMethod.toUpperCase()}`, 'success')
    }
  }

  const filteredOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return []
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
      <div className="page-header">
        <div>
          <div className="page-title">Order History</div>
          <div className="page-sub">All processed orders — real-time</div>
        </div>
        <span className="badge badge-gold">{filteredOrders.length} orders</span>
      </div>

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
                    const itemList = o.items || o.order_items || []
                    return (
                      <tr
                        key={o.id}
                        className={o.status === 'cancelled' ? 'row-cancelled' : ''}
                      >
                        <td>
                          <span className="order-num">
                            INV-{String(o.invoice_number || o.order_number || 0).padStart(5, '0')}
                          </span>
                        </td>

                        <td className="items-cell">
                          {Array.isArray(itemList) && itemList.length > 0 ? (
                            <>
                              {itemList.slice(0, 2).map((i) => {
                                const qty = i.quantity || i.qty || 1
                                const name = i.product_name_ar || i.product_name || i.name_ar || i.name || i.title || 'صنف'
                                return `${qty}× ${name}`
                              }).join(', ')}
                              {itemList.length > 2 && ` +${itemList.length - 2}`}
                            </>
                          ) : (
                            <span style={{ color: 'var(--txt3)', fontSize: '11px' }}>لا توجد عناصر</span>
                          )}
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
                        <td className="action-cell" style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setReceiptOrder(o)}
                            title="View receipt"
                            style={{ color: 'var(--gold, #eab308)' }}
                          >
                            <Printer size={14} strokeWidth={2} />
                          </button>

                          {o.status !== 'cancelled' && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditingOrder(o)}
                              title="Edit order items"
                              style={{ color: 'var(--gold, #eab308)' }}
                            >
                              <Pencil size={14} strokeWidth={2} />
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setDeletingOrder(o)}
                              title="Delete Order Permanently"
                              style={{
                                color: '#ef4444',
                                width: '30px',
                                height: '30px',
                                padding: 0,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Trash2 size={14} strokeWidth={2} />
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

      {/* --- نافذة تأكيد حذف الطلب --- */}
      {deletingOrder && (
        <Modal onClose={() => setDeletingOrder(null)}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '10px 10px 5px',
            fontFamily: 'inherit',
            direction: 'rtl'
          }}>
            <div style={{
              width: '54px',
              height: '54px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#111827' }}>
              حذف الطلب؟
            </h3>

            <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 24px 0', lineHeight: '1.6' }}>
              هل أنت تأكد أنك تريد حذف الطلب <strong style={{ color: '#111827' }}>INV-{String(deletingOrder.invoice_number || deletingOrder.order_number || 0).padStart(5, '0')}</strong> من النظام؟
            </p>

            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={confirmDeleteOrder}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                تأكيد الحذف
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                  <line x1="12" y1="2" x2="12" y2="12" />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setDeletingOrder(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '9px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#4b5563',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                إلغاء ✕
              </button>
            </div>
          </div>
        </Modal>
      )}

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

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          products={products}
          onClose={() => setEditingOrder(null)}
          showToast={showToast}
          onOrderUpdated={() => {
            if (typeof reload === 'function') {
              reload()
            }
          }}
        />
      )}
    </div>
  )
}