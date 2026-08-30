import { useState, useMemo } from 'react'
import { useOrders } from '../context/OrdersContext'
import { fmtNum } from '../utils/format.js'
import { ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react'

import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'
import '../styles/unified-cards.css'

// دالة توحيد تحويل التاريخ للتوقيت المحلي للجهاز YYYY-MM-DD
const getLocalDateString = (dateInput) => {
    if (!dateInput) return ''
    const d = typeof dateInput === 'string' && dateInput.includes('T')
        ? new Date(dateInput)
        : new Date(dateInput)

    if (isNaN(d.getTime())) return ''

    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export default function DailyReportsPage() {
    const { orders, loading } = useOrders()

    // الضبط الافتراضي لتاريخ اليوم محلياً
    const [startDate, setStartDate] = useState(() => getLocalDateString(new Date()))
    const [endDate, setEndDate] = useState(() => getLocalDateString(new Date()))

    // تصفية الطلبات المطبقة بدقة التوقيت المحلي
    const filteredOrders = useMemo(() => {
        if (!Array.isArray(orders)) return []

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

    // حساب الإحصائيات المالية الموحدة
    const stats = useMemo(() => {
        let totalSales = 0
        let cashSales = 0
        let visaSales = 0
        let unpaidSales = 0

        filteredOrders.forEach(order => {
            const amount = Number(order.total_amount || order.total || 0)
            const method = String(order.payment_method || '').toLowerCase()

            if (method === 'unpaid') {
                unpaidSales += amount
            } else {
                totalSales += amount
                if (method === 'cash') cashSales += amount
                else if (method === 'visa' || method === 'card') visaSales += amount
                else cashSales += amount
            }
        })

        return {
            totalSales,
            cashSales,
            visaSales,
            unpaidSales,
            count: filteredOrders.length
        }
    }, [filteredOrders])

    const dailyCards = useMemo(() => ([
        {
            id: 'dr-paid',
            label: 'Paid Revenue',
            value: `AED ${fmtNum(stats.totalSales)}`,
            type: 'revenue',
            subtitle: 'Total completed sales'
        },
        {
            id: 'dr-cash',
            label: 'Cash Sales',
            value: `AED ${fmtNum(stats.cashSales)}`,
            type: 'profit',
            subtitle: 'Direct cash payments'
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
    ]), [stats])

    const handleFilterChange = ({ dateFrom, dateTo }) => {
        setStartDate(dateFrom)
        setEndDate(dateTo)
    }

    if (loading) {
        return (
            <div style={{ padding: 24, color: 'var(--txt3)', fontSize: '14px' }}>
                Loading reports...
            </div>
        )
    }

    return (
        <div className="scroll-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
                <div>
                    <h1 className="page-title" style={{ margin: 0 }}>Reports</h1>
                    <p className="page-sub">Summary of sales and payment modes</p>
                </div>

                <DashboardFilter
                    dateFrom={startDate}
                    dateTo={endDate}
                    onFilterChange={handleFilterChange}
                />
            </div>

            <UnifiedStatCards cards={dailyCards} loading={loading} className="mb-4" />

            <div className="card" style={{ marginTop: '20px' }}>
                <div className="card-header">
                    <span className="card-title">
                        <ShoppingBag size={17} style={{ color: 'var(--gold)' }} /> Orders Summary ({stats.count})
                    </span>
                </div>

                {filteredOrders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--txt3)', fontSize: '13px' }}>
                        No orders found for the selected date range.
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
                                {filteredOrders.map(order => {
                                    const methodStr = String(order.payment_method || 'CASH').toLowerCase()
                                    const isUnpaid = methodStr === 'unpaid'
                                    const isVisa = methodStr === 'visa' || methodStr === 'card'

                                    const rawTime = order.created_at || order.date
                                    const dateObj = new Date(rawTime)
                                    const isValidDate = !isNaN(dateObj.getTime())

                                    const formattedDate = isValidDate
                                        ? `${dateObj.toLocaleDateString('en-GB')} - ${dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                                        : '—'

                                    const invoiceNum = (order.invoice_number || order.order_number || order.id?.slice(0, 8) || '')
                                        .toString()
                                        .replace(/^#?/, '')

                                    return (
                                        <tr key={order.id}>
                                            <td style={{ fontWeight: '600', color: 'var(--gold)' }}>
                                                #{invoiceNum}
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
                                                AED {fmtNum(order.total_amount || order.total || 0)}
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