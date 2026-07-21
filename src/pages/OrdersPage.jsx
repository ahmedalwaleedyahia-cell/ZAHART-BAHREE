import { useState, useRef } from 'react'
import { useOrders } from '../context/OrdersContext'
import { useSettings } from '../context/SettingsContext'
import ReceiptPreview from '../components/ui/ReceiptPreview'
import { useReactToPrint } from 'react-to-print'
import { Printer, Search, FileText } from 'lucide-react'

export default function OrdersPage() {
    const { orders } = useOrders()
    const { settings } = useSettings()
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [search, setSearch] = useState('')

    const receiptRef = useRef(null)

    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${selectedOrder?.invoice_number || '1'}`,
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

    const filteredOrders = orders.filter(o => 
        (o.invoice_number || '').toString().includes(search) ||
        (o.id || '').toString().includes(search)
    )

    return (
        <div style={{ padding: '20px' }}>
            <h2>Order History</h2>
            <p style={{ color: 'var(--txt3)', marginBottom: '20px' }}>Full order history & receipts</p>

            <div style={{ display: 'flex', gap: '20px' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ marginBottom: '15px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: '#888' }} />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '8px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {filteredOrders.map(order => (
                            <div 
                                key={order.id} 
                                onClick={() => setSelectedOrder(order)}
                                style={{
                                    padding: '15px',
                                    borderRadius: '8px',
                                    background: selectedOrder?.id === order.id ? 'var(--gold-light, #fff8e7)' : '#fff',
                                    border: selectedOrder?.id === order.id ? '2px solid var(--gold, #c9a96e)' : '1px solid #eee',
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ fontWeight: 'bold' }}>Order #{order.invoice_number || order.id}</div>
                                <div style={{ fontSize: '12px', color: '#666' }}>{new Date(order.created_at).toLocaleString()}</div>
                                <div style={{ marginTop: '5px', fontWeight: '600' }}>AED {order.total_amount || order.total}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {selectedOrder && (
                    <div style={{ width: '380px', background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #eee' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Receipt #{selectedOrder.invoice_number || selectedOrder.id}</span>
                            <button className="btn btn-gold btn-sm" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <Printer size={16} /> PRINT
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <ReceiptPreview ref={receiptRef} order={selectedOrder} settings={settings} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
