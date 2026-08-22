import { useState, useMemo } from 'react'
import { useOrders } from '../context/OrdersContext'
import { useProducts } from '../context/ProductsContext'
import { fmtNum } from '../utils/format.js'
import { ShoppingBag, CheckCircle, AlertCircle, Layers, Utensils, Coffee, Cake } from 'lucide-react'

import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'
import '../styles/unified-cards.css'

// دالة توحيد تحويل التاريخ للتوقيت المحلي للجهاز YYYY-MM-DD
const getLocalDateString = (dateInput) => {
    if (!dateInput) return ''
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export default function DailyReportsPage() {
    const { orders, loading: ordersLoading } = useOrders()
    const { availableProducts, loading: productsLoading } = useProducts()

    const loading = ordersLoading || productsLoading

    // الضبط الافتراضي لتاريخ اليوم محلياً
    const [startDate, setStartDate] = useState(() => getLocalDateString(new Date()))
    const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()))

    // فلتر الفئات Selected Category Filter (all, food, drinks, desserts)
    const [selectedCat, setSelectedCat] = useState('all')

    // خريطة لربط المنتجات بفئاتها
    const productCategoryMap = useMemo(() => {
        const map = {}
        if (availableProducts) {
            availableProducts.forEach(p => {
                map[p.id] = p.category_slug || 'food'
            })
        }
        return map
    }, [availableProducts])

    // 1. تصفية الطلبات حسب التاريخ أولاً
    const dateFilteredOrders = useMemo(() => {
        if (!orders) return []

        return orders.filter(order => {
            if (order.status === 'cancelled') return false

            const rawDate = order.created_at || order.date
            const orderDateStr = getLocalDateString(rawDate)
            if (!orderDateStr) return false

            if (startDate && orderDateStr < startDate) return false
            if (endDate && orderDateStr > endDate) return false

            return true
        })
    }, [orders, startDate, endDate])

    // 2. تصفية الطلبات المعروضة بناءً على الفئة المختارة
    const displayedOrders = useMemo(() => {
        if (selectedCat === 'all') return dateFilteredOrders

        return dateFilteredOrders.filter(order => {
            const items = order.items || []
            return items.some(item => {
                const catSlug = productCategoryMap[item.product_id] || 'food'
                return catSlug === selectedCat
            })
        })
    }, [dateFilteredOrders, selectedCat, productCategoryMap])

    // 3. حساب الإحصائيات المباشرة بناءً على الفئة المحددة لتتأثر بها الكروت فوراً
    const stats = useMemo(() => {
        let totalSales = 0
        let cashSales = 0
        let visaSales = 0
        let unpaidSales = 0

        dateFilteredOrders.forEach(order => {
            const method = (order.payment_method || '').toLowerCase()
            const items = order.items || []

            let categoryAmountInOrder = 0

            if (selectedCat === 'all') {
                categoryAmountInOrder = Number(order.total_amount || order.total || 0)
            } else {
                items.forEach(item => {
                    const catSlug = productCategoryMap[item.product_id] || 'food'
                    if (catSlug === selectedCat) {
                        const lineTotal = Number(item.line_total || (Number(item.unit_price || item.price || 0) * Number(item.quantity || item.qty || 1)))
                        categoryAmountInOrder += lineTotal
                    }
                })
            }

            if (categoryAmountInOrder > 0) {
                if (method === 'unpaid') {
                    unpaidSales += categoryAmountInOrder
                } else {
                    totalSales += categoryAmountInOrder
                    if (method === 'cash') cashSales += categoryAmountInOrder
                    else if (method === 'visa' || method === 'card') visaSales += categoryAmountInOrder
                    else cashSales += categoryAmountInOrder
                }
            }
        })

        return {
            totalSales,
            cashSales,
            visaSales,
            unpaidSales,
            count: displayedOrders.length
        }
    }, [dateFilteredOrders, selectedCat, productCategoryMap, displayedOrders])

    const dailyCards = useMemo(() => ([
        {
            id: 'dr-paid',
            label: 'Paid Revenue',
            value: `AED ${fmtNum(stats.totalSales)}`,
            type: 'revenue',
            subtitle: selectedCat === 'all' ? 'Total completed sales' : `${selectedCat.toUpperCase()} revenue`
        },
        {
            id: 'dr-cash',
            label: 'Cash Sales',
            value: `AED ${fmtNum(stats.cashSales)}`,
            type: 'profit',
            subtitle: 'Cash payments'
        },
        {
            id: 'dr-visa',
            label: 'Visa / Card Sales',
            value: `AED ${fmtNum(stats.visaSales)}`,
            type: 'salary',
            subtitle: 'Electronic payments'
        },
        {
            id: 'dr-unpaid',
            label: 'Unpaid Sales',
            value: `AED ${fmtNum(stats.unpaidSales)}`,
            type: 'loss',
            subtitle: 'Pending collection'
        }
    ]), [stats, selectedCat])

    const handleFilterChange = ({ dateFrom, dateTo }) => {
        setStartDate(dateFrom)
        setEndDate(dateTo)
    }

    if (loading) {
        return <div style={{ padding: 24, color: 'var(--txt3)', fontSize: '14px' }}>Loading reports...</div>
    }

    return (
        <div className="scroll-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
                    <p className="page-sub">Summary of sales by payment mode & categories</p>
                </div>

                {/* --- الـ Custom Range وأزرار الفئات تحته مباشرة في نفس الجهة --- */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                    <DashboardFilter
                        dateFrom={startDate}
                        dateTo={endDate}
                        onFilterChange={handleFilterChange}
                    />

                    {/* أزرار الفئات تحت التاريخ مباشرة */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => setSelectedCat('all')}
                            style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid',
                                transition: 'all 0.2s ease',
                                background: selectedCat === 'all' ? 'var(--gold)' : 'transparent',
                                borderColor: selectedCat === 'all' ? 'var(--gold)' : 'var(--border, #333)',
                                color: selectedCat === 'all' ? '#000' : 'var(--txt2)'
                            }}
                        >
                            <Layers size={13} /> All
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedCat('food')}
                            style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid',
                                transition: 'all 0.2s ease',
                                background: selectedCat === 'food' ? 'var(--gold)' : 'transparent',
                                borderColor: selectedCat === 'food' ? 'var(--gold)' : 'var(--border, #333)',
                                color: selectedCat === 'food' ? '#000' : 'var(--txt2)'
                            }}
                        >
                            <Utensils size={13} /> Food
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedCat('drinks')}
                            style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid',
                                transition: 'all 0.2s ease',
                                background: selectedCat === 'drinks' ? 'var(--gold)' : 'transparent',
                                borderColor: selectedCat === 'drinks' ? 'var(--gold)' : 'var(--border, #333)',
                                color: selectedCat === 'drinks' ? '#000' : 'var(--txt2)'
                            }}
                        >
                            <Coffee size={13} /> Drinks
                        </button>

                        <button
                            type="button"
                            onClick={() => setSelectedCat('desserts')}
                            style={{
                                padding: '5px 12px',
                                fontSize: '12px',
                                fontWeight: '600',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid',
                                transition: 'all 0.2s ease',
                                background: selectedCat === 'desserts' ? 'var(--gold)' : 'transparent',
                                borderColor: selectedCat === 'desserts' ? 'var(--gold)' : 'var(--border, #333)',
                                color: selectedCat === 'desserts' ? '#000' : 'var(--txt2)'
                            }}
                        >
                            <Cake size={13} /> Desserts
                        </button>
                    </div>
                </div>
            </div>

            <UnifiedStatCards cards={dailyCards} loading={loading} className="mb-4" />

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="card-title">
                        <ShoppingBag size={17} style={{ color: 'var(--gold)' }} /> Orders Summary ({displayedOrders.length})
                    </span>
                </div>

                {displayedOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt3)', fontSize: '13px' }}>
                        No orders found for the selected category/date range.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>INVOICE #</th>
                                    <th>TIME</th>
                                    <th>PAYMENT METHOD</th>
                                    <th style={{ textAlign: 'right' }}>TOTAL (AED)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedOrders.map(order => {
                                    const methodStr = (order.payment_method || 'CASH').toLowerCase()
                                    const isUnpaid = methodStr === 'unpaid'
                                    const isVisa = methodStr === 'visa' || methodStr === 'card'
                                    const dateObj = new Date(order.created_at || order.date)
                                    const formattedDate = `${dateObj.toLocaleDateString('en-GB')} - ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`

                                    return (
                                        <tr key={order.id}>
                                            <td style={{ fontWeight: '600', color: 'var(--gold)' }}>
                                                #{(order.invoice_number || order.order_number || order.id?.slice(0, 8)).toString().replace(/^#?/, '')}
                                            </td>
                                            <td className="time-cell">
                                                {formattedDate}
                                            </td>
                                            <td>
                                                <span className={`badge ${isUnpaid ? 'badge-red' : isVisa ? 'badge-blue' : 'badge-green'}`}>
                                                    {isUnpaid ? <AlertCircle size={11} /> : <CheckCircle size={11} />}
                                                    {methodStr.toUpperCase()}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: '700', textAlign: 'right' }}>
                                                AED {fmtNum(order.total_amount || order.total)}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}