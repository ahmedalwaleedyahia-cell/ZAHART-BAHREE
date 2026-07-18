// ─────────────────────────────────────────────────────────────
// RECEIPT COMPONENT
// Path: src/components/ui/ReceiptPreview.jsx
// ─────────────────────────────────────────────────────────────

import { forwardRef } from 'react'
import { fmtDateTime, fmtNum } from '../../utils/format.js'

const ReceiptPreview = forwardRef(({ order, settings }, ref) => {
    if (!order) return null

    const s = settings || {}
    const ts = fmtDateTime(order.created_at || order.time)
    const items = order.items || []

    const paymentMethod =
        (order.payment_method || order.payment) === 'cash'
            ? 'Cash'
            : 'Visa'

    const subtotal = Number(order.subtotal || 0)

    const discountAmount = Number(
        order.discount_amount ||
        order.discount ||
        0
    )

    const discountPercent =
        discountAmount > 0 && subtotal > 0
            ? ((discountAmount / subtotal) * 100).toFixed(0)
            : 0

    const vatRate = Number(order.vat_rate ?? s.vat_rate ?? 0)

    const calculatedVat =
        vatRate > 0
            ? Number(order.vat_amount ?? subtotal * (vatRate / 100))
            : 0

    const totalItems = items.reduce(
        (sum, item) => sum + Number(item.quantity || item.qty || 0),
        0
    )

    return (
        <div
            ref={ref}
            id="receipt"
            className="receipt"
            style={{
                width: '80mm',
                margin: 0,
                padding: '3mm',
                background: '#fff',
                color: '#000',
                boxSizing: 'border-box'
            }}
        >

            <div className="r-center r-logo">
                <span
                    style={{
                        fontFamily: '"Cinzel","Playfair Display",serif',
                        fontWeight: 800,
                        fontSize: 18,
                        letterSpacing: '2px'
                    }}
                >
                    BAHREE
                </span>
            </div>

            <div className="r-center r-sub r-bold">
                {s.name || 'Zahrat Bahary Cafeteria'}
            </div>

            <div className="r-center r-sub">
                {s.address || 'Abu Dhabi, UAE'}
            </div>

            {s.phone && (
                <div className="r-center r-sub">
                    Tel: {s.phone}
                </div>
            )}

            <div className="r-center r-sub">
                TRN: {s.trn || '100234567890003'}
            </div>

            <div className="r-divider" />

            <div className="r-row">
                <span>Invoice #</span>
                <span>{order.invoice_number || order.order_number || '1'}</span>
            </div>

            <div className="r-row">
                <span>Date</span>
                <span>{ts}</span>
            </div>

            <div className="r-row">
                <span>Cashier</span>
                <span>{order.cashier_name || '-'}</span>
            </div>

            <div className="r-row">
                <span>Payment</span>
                <span>{paymentMethod}</span>
            </div>

            <div className="r-divider" />

            <div className="r-bold">ITEMS</div>

            {items.map((item, index) => (
                <div key={index} style={{ marginBottom: 6 }}>
                    <div className="r-row">
                        <span className="r-item-name">
                            {item.quantity || item.qty} ×{' '}
                            {item.product_name_ar ||
                                item.name_ar ||
                                item.product_name ||
                                item.name}
                        </span>

                        <span>
                            AED {fmtNum(
                                Number(item.unit_price || item.price || 0) *
                                Number(item.quantity || item.qty || 0)
                            )}
                        </span>
                    </div>

                    <div className="r-sub-line">
                        @ AED {fmtNum(item.unit_price || item.price)} each
                    </div>
                </div>
            ))}

            <div className="r-divider" />

            <div className="r-row">
                <span>Items</span>
                <span>{totalItems}</span>
            </div>

            <div className="r-row">
                <span>Subtotal</span>
                <span>AED {fmtNum(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
                <div className="r-row">
                    <span>Discount ({discountPercent}%)</span>
                    <span>- AED {fmtNum(discountAmount)}</span>
                </div>
            )}

            {vatRate > 0 && (
                <div className="r-row">
                    <span>VAT ({vatRate}%)</span>
                    <span>AED {fmtNum(calculatedVat)}</span>
                </div>
            )}

            <div className="r-row r-total">
                <span>TOTAL</span>
                <span>
                    AED {fmtNum(
                        order.total_amount ||
                        order.total ||
                        0
                    )}
                </span>
            </div>

            {paymentMethod === 'Cash' && (
                <>
                    <div className="r-row">
                        <span>Cash Received</span>
                        <span>
                            AED {fmtNum(
                                order.cash_given ||
                                order.cashGiven ||
                                0
                            )}
                        </span>
                    </div>

                    <div className="r-row">
                        <span>Change</span>
                        <span>
                            AED {fmtNum(
                                order.change_amount ||
                                order.change ||
                                0
                            )}
                        </span>
                    </div>
                </>
            )}

            <div className="r-divider" />

            <div className="r-footer">
                <div style={{ fontWeight: 700 }}>
                    {s.receipt_footer || 'شكراً لزيارتكم'}
                </div>

                <div>Thank you for dining with us</div>

                <div
                    style={{
                        marginTop: 6,
                        fontSize: 9
                    }}
                >
                    Powered by BAHREE.pos
                </div>
            </div>

        </div>
    )
})

ReceiptPreview.displayName = 'ReceiptPreview'

export default ReceiptPreview