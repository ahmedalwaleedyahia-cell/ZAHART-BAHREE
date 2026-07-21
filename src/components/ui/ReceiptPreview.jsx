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

    // حساب المبلغ الخاضع للضريبة
    const taxableAmount = Math.max(0, subtotal - discountAmount)

    // حساب الضريبة بدقة متوافقة مع حسابات POS
    const calculatedVat =
        vatRate > 0
            ? Number(order.vat_amount ?? (taxableAmount * (vatRate / 100)))
            : 0

    const totalAmount = Number(
        order.total_amount ||
        order.total ||
        (taxableAmount + calculatedVat)
    )

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
                margin: '0 auto',
                padding: '4mm',
                background: '#fff',
                color: '#000',
                boxSizing: 'border-box',
                fontFamily: "'Outfit', 'Courier New', monospace",
                fontSize: '12px',
                lineHeight: '1.4'
            }}
        >
            <div className="r-center r-logo" style={{ textAlign: 'center', marginBottom: '4px' }}>
                <span
                    style={{
                        fontFamily: '"Cinzel","Playfair Display",serif',
                        fontWeight: 800,
                        fontSize: 20,
                        letterSpacing: '2px',
                        display: 'block'
                    }}
                >
                    BAHREE
                </span>
            </div>

            <div className="r-center r-sub r-bold" style={{ textAlign: 'center', fontWeight: 700, fontSize: '12px' }}>
                {s.name || 'Zahrat Bahary Cafeteria'}
            </div>

            <div className="r-center r-sub" style={{ textAlign: 'center', fontSize: '11px' }}>
                {s.address || 'Abu Dhabi, UAE'}
            </div>

            {s.phone && (
                <div className="r-center r-sub" style={{ textAlign: 'center', fontSize: '11px' }}>
                    Tel: {s.phone}
                </div>
            )}

            <div className="r-center r-sub" style={{ textAlign: 'center', fontSize: '11px' }}>
                TRN: {s.trn || '100234567890003'}
            </div>

            <div className="r-divider" />

            <div className="r-row">
                <span>Invoice #</span>
                <span className="r-bold">{order.invoice_number || order.order_number || '1'}</span>
            </div>

            <div className="r-row">
                <span>Date</span>
                <span>{ts}</span>
            </div>

            <div className="r-row">
                <span>Cashier</span>
                <span>{order.cashier_name || order.user_name || 'Cashier'}</span>
            </div>

            <div className="r-row">
                <span>Payment</span>
                <span className="r-bold">{paymentMethod}</span>
            </div>

            <div className="r-divider" />

            <div className="r-bold" style={{ marginBottom: '6px' }}>ITEMS / الأصناف</div>

            {items.map((item, index) => {
                const qty = Number(item.quantity || item.qty || 1)
                const unitPrice = Number(item.unit_price || item.price || 0)
                const lineTotal = unitPrice * qty
                const nameAr = item.product_name_ar || item.name_ar
                const nameEn = item.product_name || item.name

                return (
                    <div key={index} style={{ marginBottom: '8px' }}>
                        <div className="r-row" style={{ alignItems: 'flex-start' }}>
                            <span className="r-item-name" style={{ fontWeight: 600, flex: 1, paddingRight: '4px' }}>
                                {qty} × {nameAr || nameEn}
                            </span>
                            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                                AED {fmtNum(lineTotal)}
                            </span>
                        </div>

                        {nameAr && nameEn && (
                            <div className="r-sub-line" style={{ fontSize: '10px', color: '#444', paddingLeft: '12px' }}>
                                {nameEn}
                            </div>
                        )}

                        <div className="r-sub-line" style={{ fontSize: '10px', color: '#555', paddingLeft: '12px' }}>
                            @ AED {fmtNum(unitPrice)} each
                        </div>
                    </div>
                )
            })}

            <div className="r-divider" />

            <div className="r-row">
                <span>Total Items / إجمالي القطع</span>
                <span>{totalItems}</span>
            </div>

            <div className="r-row">
                <span>Subtotal / المجموع</span>
                <span>AED {fmtNum(subtotal)}</span>
            </div>

            {discountAmount > 0 && (
                <div className="r-row">
                    <span>Discount ({discountPercent}%) / الخصم</span>
                    <span style={{ color: '#000' }}>- AED {fmtNum(discountAmount)}</span>
                </div>
            )}

            {vatRate > 0 && (
                <div className="r-row">
                    <span>VAT ({vatRate}%) / الضريبة</span>
                    <span>AED {fmtNum(calculatedVat)}</span>
                </div>
            )}

            <div className="r-row r-total" style={{ fontSize: '16px', fontWeight: 900, borderTop: '2px solid #000', paddingTop: '6px', marginTop: '4px' }}>
                <span>TOTAL / الإجمالي</span>
                <span>AED {fmtNum(totalAmount)}</span>
            </div>

            {paymentMethod === 'Cash' && (
                <>
                    <div className="r-row" style={{ marginTop: '4px' }}>
                        <span>Cash Received / المدفوع</span>
                        <span>
                            AED {fmtNum(
                                order.cash_given ||
                                order.cashGiven ||
                                0
                            )}
                        </span>
                    </div>

                    <div className="r-row">
                        <span>Change / المتبقي</span>
                        <span className="r-bold">
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

            <div className="r-footer" style={{ textAlign: 'center', marginTop: '10px', fontSize: '10.5px' }}>
                <div style={{ fontWeight: 700, fontSize: '12px' }}>
                    {s.receipt_footer || 'شكراً لزيارتكم'}
                </div>

                <div>Thank you for dining with us</div>

                <div
                    style={{
                        marginTop: 8,
                        fontSize: '9px',
                        letterSpacing: '1px',
                        textTransform: 'uppercase'
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