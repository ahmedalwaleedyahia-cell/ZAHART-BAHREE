import { useOrders } from '../context/OrdersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { fmtNum, fmtDateTime } from '../utils/format.js'
import { useState, useRef, useMemo } from 'react'
import Modal from '../components/ui/Modal.jsx'
import Empty from '../components/ui/Empty.jsx'
import ReceiptPreview from '../components/ui/ReceiptPreview.jsx'
import { ClipboardList, Printer, Search } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function OrdersPage({ showToast }) {
  const { orders, loading, updateOrderStatus } = useOrders()
  const { isAdmin } = useAuth()
  const { settings } = useSettings()
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [search, setSearch] = useState('')

  const receiptRef = useRef(null)

  const handlePrint = useReactToPrint({
    contentRef: receiptRef,
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
#receipt, #receipt * {
    visibility: visible;
}
#receipt {
    position: absolute;
    left: 0;
    top: 0;
    width: 80mm !important;
    max-width: 80mm !important;
    padding: 3mm !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    background: white !important;
    color: black !important;
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

  // فلترة الطلبات بناءً على رقم الفاتورة أو أرقام الطلب أو اسم الكاشير
  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders
    const q = search.toLowerCase()
    return orders.filter(o => {
      const invNum = String(o.invoice_number || o.order_number || '')
      const cashier = (o.cashier_name || '').toLowerCase()
      return invNum.toLowerCase().includes(q) || cashier.includes(q)
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

      {/* Search Bar matching product management layout */}
      <div style={{ marginBottom: '20px' }}>
        <div className="search-wrapper" style={{ width: '100%', position: 'relative' }}>
          <Search size={18} className="search-icon" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--txt3)' }} />
          <input
            className="search-input"
            type="text"
            placeholder="Search orders by invoice number or cashier..."
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
                sub={search ? "Try searching for a different invoice number" : "Processed orders will appear here"}
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
                    <th>Payment</th>
                    <th>Time</th>
                    <th>Total (AED)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(o => (
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
                        <span className={`badge badge-${o.payment_method === 'cash' ? 'green' : 'blue'}`}>
                          {o.payment_method}
                        </span>
                      </td>
                      <td className="time-cell">{fmtDateTime(o.created_at)}</td>
                      <td><strong>AED {fmtNum(o.total_amount)}</strong></td>
                      <td className="action-cell">
                        {/* Receipt button */}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setReceiptOrder(o)}
                          title="View receipt"
                        >
                          <Printer size={13} strokeWidth={2} />
                        </button>
                        {/* Cancel — admin only, completed orders only */}
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
                  ))}
                </tbody>
              </table>
            </div>
          )
      }

      {/* Receipt modal */}
      {receiptOrder && (
        <Modal onClose={() => setReceiptOrder(null)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div className="modal-title" style={{ marginBottom: 0 }}>
              Receipt #{receiptOrder.order_number}
            </div>
            <button
              className="btn btn-gold btn-sm"
              onClick={handlePrint}
            >
              <Printer size={13} strokeWidth={2} />
              Print
            </button>
          </div>
          <ReceiptPreview ref={receiptRef} order={receiptOrder} settings={settings} />
        </Modal>
      )}
    </div>
  )
}
