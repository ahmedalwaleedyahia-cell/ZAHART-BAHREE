import { forwardRef } from 'react'
import { fmtNum, fmtDateTime } from '../../utils/format.js'
import { Utensils } from 'lucide-react'

const KitchenReceipt = forwardRef(({ order }, ref) => {
    if (!order) return null

    const items = order.items || []
    const paymentMethod = (order.payment_method || order.payment) === 'cash' ? 'Cash' : 'Visa'
    const totalAmount = Number(order.total_amount || order.total || 0)
    const ts = fmtDateTime(order.created_at || order.time)

    return (
        <div
            ref={ref}
            id="kitchen-receipt"
            className="receipt"
            style={{
                width: '80mm',
                margin: '0 auto',
                padding: '4mm',
                background: '#fff',
                color: '#000',
                boxSizing: 'border-box',
                fontFamily: "'Outfit', 'Courier New', monospace",
                fontSize: '13px',
                lineHeight: '1.4'
            }}
        >
            <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '18px', marginBottom: '6px', borderBottom: '2px solid #000', paddingBottom: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Utensils size={18} /> KITCHEN ORDER / أمر مطبخ
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '800', margin: '6px 0' }}>
                <span>Order #:</span>
                <span>{order.invoice_number || order.order_number || order.id}</span>
            </div>

            <div style={{ fontSize: '11px', marginBottom: '6px', color: '#333' }}>
                Time: {ts}
            </div>

            <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '8px 0', margin: '6px 0' }}>
                <div style={{ fontWeight: '800', marginBottom: '6px', fontSize: '13px' }}>ITEMS / الأصناف:</div>
                {items.map((item, idx) => {
                    const qty = Number(item.quantity || item.qty || 1)
                    const nameAr = item.product_name_ar || item.name_ar
                    const nameEn = item.product_name || item.name
                    return (
                        <div key={idx} style={{ marginBottom: '6px', fontSize: '15px', fontWeight: '800' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>{qty} × {nameAr || nameEn}</span>
                            </div>
                            {nameAr && nameEn && (
                                <div style={{ fontSize: '11px', fontWeight: 'normal', color: '#444', paddingLeft: '14px' }}>
                                    {nameEn}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginTop: '6px' }}>
                <span>Payment Method:</span>
                <span style={{ fontWeight: '800' }}>{paymentMethod}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', borderTop: '2px solid #000', paddingTop: '6px', marginTop: '6px' }}>
                <span>TOTAL:</span>
                <span>AED {fmtNum(totalAmount)}</span>
            </div>
        </div>
    )
})

KitchenReceipt.displayName = 'KitchenReceipt'

export default KitchenReceipt