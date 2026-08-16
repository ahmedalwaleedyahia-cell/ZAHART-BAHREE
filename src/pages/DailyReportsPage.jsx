import { useState, useMemo } from 'react'
import { useOrders } from '../context/OrdersContext'
import { fmtNum } from '../utils/format.js'
import {
    ShoppingBag, CheckCircle, AlertCircle
} from 'lucide-react'

import UnifiedStatCards from '../components/dashboard/UnifiedStatCards.jsx'
import DashboardFilter from '../components/dashboard/DashboardFilter.jsx'
import '../styles/unified-cards.css'

export default function DailyReportsPage() {
    const { orders, loading } = useOrders()

    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    // تصفية الطلبات بدقة عالية حسب التوقيت المحلي تفادياً لمشاكل التوقيت العالمي (UTC)
    const filteredOrders = useMemo(() => {
        if (!orders) return []

        return orders.filter(order => {
            const rawDate = order.created_at || order.date
            if (!rawDate) return false

            // تحويل تاريخ الطلب إلى YYYY-MM-DD بالتوقيت المحلي للجهاز
            const d = new Date(rawDate)
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            const orderDateStr = `${year}-${month}-${day}`

            if (startDate && orderDateStr < startDate) return false
            if (endDate && orderDateStr > endDate) return false

            return true
        })
    }, [orders, startDate, endDate])

    // حساب الإحصائيات المالية
    const stats = useMemo(() => {
        let totalSales = 0
        let cashSales = 0
        let visaSales = 0
        let unpaidSales = 0

        filteredOrders.forEach(order => {
            const amount = Number(order.total_amount || order.total || 0)
            const method = (order.payment_method || '').toLowerCase()

            if (method === 'unpaid') {
                unpaidSales += amount
            } else {
                totalSales += amount
                if (method === 'cash') cashSales += amount
                else if (method === 'visa' || method === 'card') visaSales += amount
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

    // إعداد كروت الإحصائيات الموحدة
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
        return <div style={{ padding: 24, color: 'var(--txt3)', fontSize: '14px' }}>Loading reports...</div>
    }

    return (
        <div className="scroll-view">

            {/* الهيدر وفلتر التاريخ الموحد */}
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

            {/* الكروت الموحدة */}
            <UnifiedStatCards cards={dailyCards} loading={loading} className="mb-4" />

            {/* جدول المبيعات بأسلوب Unified Design System */}
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