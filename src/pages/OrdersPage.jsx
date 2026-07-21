import { useOrders } from '../context/OrdersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSettings } from '../context/SettingsContext.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { fmtNum, fmtDateTime } from '../utils/format.js'
import { useState, useRef } from 'react'
import Modal from '../components/ui/Modal.jsx'
import Empty from '../components/ui/Empty.jsx'
import ReceiptPreview from '../components/ui/ReceiptPreview.jsx'
import { ClipboardList, Printer } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

export default function OrdersPage({ showToast }) {
  const { orders, loading, updateOrderStatus } = useOrders()
  const { isAdmin } = useAuth()
  const { settings } = useSettings()
  const [receiptOrder, setReceiptOrder] = useState(null)

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

  return (
    <div className="scroll-view">
      {/* Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">Order History</div>
          <div className="page-sub">All processed orders — real-time</div>
        </div>
        <span className="badge badge-gold">{orders.length} orders</span>
      </div>

      {/* Content */}
      {loading
        ? <Skeleton rows={8} />
        : orders.length === 0
          ? (
            <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', minHeight: '300px' }}>
              <Empty
                icon={<ClipboardList size={36} strokeWidth={1.4} />}
                text="No orders yet"
                sub="Processed orders will appear here"
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
                  {orders.map(o => (
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
