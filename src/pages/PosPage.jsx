// POS VIEW — Full cashier terminal
// Path: src/pages/PosPage.jsx
import { useProducts } from '../context/ProductsContext'
import { useOrders } from '../context/OrdersContext'
import { useSettings } from '../context/SettingsContext'
import { useState, useMemo, useRef } from 'react'
import { fmtNum } from '../utils/format.js'
import Modal from '../components/ui/Modal'
import ReceiptPreview from '../components/ui/ReceiptPreview.jsx'
import Skeleton from '../components/ui/Skeleton.jsx'
import { useReactToPrint } from 'react-to-print'
import {
    UtensilsCrossed,
    ShoppingCart,
    Printer,
    Banknote,
    CreditCard,
    Search,
    Layers,
} from 'lucide-react'

export default function PosPage({ showToast }) {
    const { availableProducts, categories, loading } = useProducts()
    const {
        cart, addToCart, removeFromCart, updateQty, clearCart,
        paymentMethod, setPaymentMethod,
        discountPct, setDiscountPct,
        orderNotes, setOrderNotes,
        cashGiven, setCashGiven,
        subtotal, discountAmount, vatAmount, totalAmount, changeAmount, cartCount,
        processing, lastOrder, processPayment,
    } = useOrders()

    const { settings } = useSettings()
    const vatRate = settings?.vat_rate !== undefined ? Number(settings.vat_rate) : 0;

    const [search, setSearch] = useState('')
    const [selectedCat, setSelectedCat] = useState('all')
    const [successModal, setSuccessModal] = useState(false)
    const [receiptModal, setReceiptModal] = useState(false)

    // المرجع الخاص بعنصر الطباعة المعزول
    const receiptRef = useRef(null)
    const handlePrint = useReactToPrint({
        contentRef: receiptRef,
        documentTitle: `Receipt-${lastOrder?.invoice_number || 1}`,
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

#receipt,
#receipt * {
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

    font-size: 12px !important;
}
`,
    });

    const filtered = useMemo(() => {
        return availableProducts.filter(p =>
            (selectedCat === 'all' || p.category_slug === selectedCat) &&
            (
                !search ||
                (p.name || '')
                    .toLowerCase()
                    .includes(search.toLowerCase()) ||
                (p.name_ar && p.name_ar.includes(search))
            )
        )
    }, [availableProducts, selectedCat, search])

    const cashInsufficient =
        paymentMethod === 'cash' &&
        Number(cashGiven || 0) < totalAmount

    async function handleCharge() {
        if (processing) return
        const { error } = await processPayment()
        if (error) {
            showToast(error, 'error')
            return
        }
        setSuccessModal(true)
    }

    return (
        <div className="pos-layout">
            {/* ── Left — product browser ── */}
            <div className="pos-left">
                <div className="pos-search-bar">
                    <div className="search-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            className="search-input"
                            placeholder="Search menu items..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '44px' }}
                        />
                        {search && (
                            <button className="search-clear-btn" onClick={() => setSearch('')} type="button">✕</button>
                        )}
                    </div>
                </div>

                <div className="cat-tabs">
                    <button
                        className={`cat-tab ${selectedCat === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedCat('all')}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        <Layers size={14} /> All
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.slug}
                            className={`cat-tab ${selectedCat === c.slug ? 'active' : ''}`}
                            onClick={() => setSelectedCat(c.slug)}
                        >
                            {c.emoji} {c.name}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="product-grid"><Skeleton rows={12} /></div>
                ) : filtered.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40, color: 'var(--txt3)' }}>
                        <UtensilsCrossed size={40} />
                        <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--txt)' }}>
                            {availableProducts.length === 0 ? 'No products available' : 'No items match your search'}
                        </span>
                        <span style={{ fontSize: 13 }}>
                            {availableProducts.length === 0 ? 'Ask the admin to add products first' : 'Try a different search or category'}
                        </span>
                    </div>
                ) : (
                    <div className="product-grid">
                        {filtered.map(p => {
                            let isOutOfStock = false
                            let isLowStock = false
                            let stockText = ''

                            if (p.inventory_enabled) {
                                if (p.category_slug === 'drinks') {
                                    const stock = p.current_stock || 0
                                    isOutOfStock = stock <= 0
                                    isLowStock = !isOutOfStock && stock <= (p.minimum_stock || 0)
                                    stockText = `📦 Stock: ${stock}`
                                } else if (p.category_slug === 'desserts') {
                                    const weight = p.current_weight || 0
                                    isOutOfStock = weight <= 0
                                    isLowStock = !isOutOfStock && weight <= (p.minimum_stock || 0)
                                    stockText = `⚖ Wt: ${weight} ${p.stock_unit || 'gram'}`
                                }
                            }

                            return (
                                <button
                                    key={p.id}
                                    className="product-tile"
                                    onClick={() => !isOutOfStock && addToCart(p)}
                                    disabled={isOutOfStock}
                                    style={{
                                        opacity: isOutOfStock ? 0.45 : 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px',
                                        height: p.image_url ? '200px' : '135px',
                                        minHeight: p.image_url ? '200px' : '135px',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {p.image_url ? (
                                        <div className="tile-img" style={{ width: '100%', height: '110px', overflow: 'hidden', borderRadius: '6px', marginBottom: '8px' }}>
                                            <img
                                                src={p.image_url}
                                                alt={p.name}
                                                className="tile-photo"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    ) : (
                                        <div className="tile-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '26px', marginBottom: '4px' }}>
                                            <UtensilsCrossed size={18} style={{ color: 'var(--gold, #C9A96E)', opacity: 0.6 }} />
                                        </div>
                                    )}

                                    <div className="tile-info" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1 }}>
                                        <div className="tile-name-group" style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%', textAlign: 'center' }}>
                                            <span className="tile-name-ar" dir="rtl" style={{ fontSize: '0.98rem', fontWeight: '700', color: 'var(--txt)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >
                                                {p.name_ar ? p.name_ar : p.name}
                                            </span>
                                            {p.name_ar && (
                                                <span className="tile-name-en" style={{ fontSize: '0.72rem', color: 'var(--txt3)', textTransform: 'capitalize', display: 'block', fontWeight: '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} >
                                                    {p.name}
                                                </span>
                                            )}

                                            {p.inventory_enabled && (
                                                <div style={{ fontSize: '11px', marginTop: '3px', fontWeight: '600' }}>
                                                    <div>{stockText}</div>
                                                    {isOutOfStock && <span style={{ color: 'var(--red)' }}>🔴 Out Of Stock</span>}
                                                    {isLowStock && <span style={{ color: 'var(--amber)' }}>🟡 Low Stock</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="tile-price" style={{ marginTop: 'auto', textAlign: 'center', fontWeight: '700' }}>
                                        AED {fmtNum(p.price)}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* ── Right — cart panel ── */}
            <div className="cart-panel">
                <div className="cart-header">
                    <span className="cart-title">Current Order</span>
                    <span className="cart-badge">{cartCount}</span>
                </div>

                <div className="cart-items">
                    {cart.length === 0 ? (
                        <div className="cart-empty">
                            <ShoppingCart size={48} />
                            <span>Tap items to add</span>
                        </div>
                    ) : cart.map(item => (
                        <div key={item.id} className="cart-item">
                            <div className="cart-qty-badge">{item.qty}</div>
                            <div className="cart-item-body">
                                <div className="cart-item-name" dir={item.name_ar ? 'rtl' : 'ltr'} style={{ textAlign: item.name_ar ? 'right' : 'left', fontWeight: '600' }} >
                                    {item.name_ar ? item.name_ar : item.name}
                                </div>
                                <div className="cart-item-unit" style={{ fontSize: '0.72rem', color: 'var(--txt3)' }}>
                                    {item.name_ar && (
                                        <span style={{ textTransform: 'capitalize', marginRight: '6px' }}>
                                            {item.name} ·
                                        </span>
                                    )}
                                    AED {fmtNum(item.price)} × {item.qty}
                                </div>
                            </div>
                            <div className="cart-item-sub">AED {fmtNum(item.price * item.qty)}</div>
                            <div className="cart-item-ctrl">
                                <button className="qty-btn" type='button' onClick={() => updateQty(item.id, item.qty + 1)} aria-label="Increase" >+</button>
                                <button className="qty-btn qty-btn-minus" onClick={() => updateQty(item.id, item.qty - 1)} aria-label="Decrease" >−</button>
                                <button className="remove-btn" type='button' onClick={() => removeFromCart(item.id)} aria-label="Remove" >✕</button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="cart-footer">
                    <textarea className="notes-input" rows={2} placeholder="Notes, allergies, special requests…" value={orderNotes} onChange={e => setOrderNotes(e.target.value)} />
                    <div className="discount-row">
                        <span className="meta-label">Discount %</span>
                        <input className="mini-input" type="number" value={discountPct} min={0} max={100} onChange={e => setDiscountPct(Number(e.target.value) || 0)} />
                        <span className="meta-label" style={{ marginLeft: 'auto' }}>
                            VAT {vatRate}%
                        </span>
                    </div>

                    <div className="totals">
                        <div className="total-row">
                            <span>Subtotal</span>
                            <span>AED {fmtNum(subtotal)}</span>
                        </div>
                        <div className="total-row">
                            <span>Discount</span>
                            <span className="text-green">− AED {fmtNum(discountAmount)}</span>
                        </div>
                        <div className="total-row">
                            <span>VAT ({vatRate}%)</span>
                            <span>AED {fmtNum(vatAmount)}</span>
                        </div>
                        <div className="total-row total-row-bold">
                            <span>Total</span>
                            <span>AED {fmtNum(totalAmount)}</span>
                        </div>
                    </div>

                    <div className="pay-method-row">
                        <button
                            type='button' className={`pay-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('cash')}
                        >
                            <Banknote size={17} />
                            <span>CASH</span>
                        </button>

                        <button
                            type='button' className={`pay-btn ${paymentMethod === 'visa' ? 'active' : ''}`}
                            onClick={() => setPaymentMethod('visa')}
                        >
                            <CreditCard size={17} />
                            <span>VISA</span>
                        </button>
                    </div>
                    {paymentMethod === 'cash' && (
                        <div>
                            <input
                                className="cash-input"
                                type="number"
                                placeholder="Cash received (AED)…"
                                value={cashGiven}
                                onChange={e => setCashGiven(e.target.value)}
                            />
                            {cashInsufficient && (
                                <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                                    Cash amount is less than total bill.
                                </div>
                            )}
                            {cashGiven && changeAmount >= 0 && !cashInsufficient && (
                                <div className="change-row">
                                    <span>Change</span>
                                    <span className="text-green" style={{ fontWeight: 700 }}>
                                        AED {fmtNum(changeAmount)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    <button className="charge-btn" onClick={handleCharge} disabled={cart.length === 0 || processing || cashInsufficient}  >
                        {processing ? 'Processing…' : `Charge AED ${fmtNum(totalAmount)}`}
                    </button>
                </div>
            </div>

            {/* ── Success modal ── */}
            {successModal && lastOrder && (
                <Modal onClose={() => setSuccessModal(false)}>
                    <div className="success-screen">
                        <div className="success-tick">✓</div>
                        <h3>Payment Successful!</h3>
                        <p style={{ marginTop: 4 }}>Order #{lastOrder.invoice_number || lastOrder.order_number || '1'} completed</p>
                        {Number(lastOrder.change_amount) > 0 && (
                            <div className="change-highlight">
                                <div className="change-label">Change to Return</div>
                                <div className="change-amount">AED {fmtNum(lastOrder.change_amount)}</div>
                            </div>
                        )}
                        <div className="modal-actions" style={{ justifyContent: 'center', marginTop: 20 }}>
                            <button className="btn btn-ghost" onClick={() => { setReceiptModal(true); setSuccessModal(false) }} >
                                <Printer size={16} /> Receipt
                            </button>
                            <button className="btn btn-gold" onClick={() => setSuccessModal(false)}>
                                New Order
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ── Receipt preview modal ── */}
            {receiptModal && lastOrder && (
                <Modal onClose={() => setReceiptModal(false)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }} >
                        <div className="modal-title" style={{ marginBottom: 0 }} >
                            Receipt Preview
                        </div>
                        <button className="btn btn-gold btn-sm" onClick={handlePrint} >
                            <Printer size={16} /> Print Receipt
                        </button>

                    </div>

                    {/* الحاوية المخصصة للطباعة التي تلتقطها مكتبة react-to-print */}
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '8px',
                            padding: '0',
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <ReceiptPreview ref={receiptRef} order={lastOrder} settings={settings} />
                    </div>
                </Modal>
            )}
        </div>
    )
}