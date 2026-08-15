import { Calendar } from 'lucide-react'

export default function DashboardFilter({
    dateFrom = '',
    dateTo = '',
    onFilterChange
}) {
    const handleFromChange = (e) => {
        const val = e.target.value
        onFilterChange?.({ dateFrom: val, dateTo })
    }

    const handleToChange = (e) => {
        const val = e.target.value
        onFilterChange?.({ dateFrom, dateTo: val })
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            marginBottom: 16,
            gap: 12,
            flexWrap: 'wrap'
        }}>
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--surf2)',
                padding: '6px 12px',
                borderRadius: 8,
                gap: 8,
                border: '1px solid var(--bdr)'
            }}>
                <Calendar size={15} color="var(--gold)" />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)' }}>
                    Custom Range:
                </span>

                <input
                    type="date"
                    value={dateFrom}
                    onChange={handleFromChange}
                    style={{
                        background: 'var(--surf3)',
                        color: 'var(--txt)',
                        border: '1px solid var(--bdr)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                />

                <span style={{ fontSize: 12, color: 'var(--txt3)' }}>to</span>

                <input
                    type="date"
                    value={dateTo}
                    onChange={handleToChange}
                    style={{
                        background: 'var(--surf3)',
                        color: 'var(--txt)',
                        border: '1px solid var(--bdr)',
                        borderRadius: 6,
                        padding: '4px 8px',
                        fontSize: 12,
                        outline: 'none',
                        cursor: 'pointer'
                    }}
                />
            </div>
        </div>
    )
}