
export function fmtNum(n, decimals = 2) {
    const num = Number(n || 0)

    return num.toLocaleString('en-AE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })
}
export function fmtAED(n, decimals = 2) {
    const num = Number(n || 0)

    return `AED ${num.toLocaleString('en-AE', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`
}
export function fmtDateTime(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date()

    if (isNaN(d.getTime())) return '—'

    const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]

    const pad = (x) => String(x).padStart(2, '0')

    return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}