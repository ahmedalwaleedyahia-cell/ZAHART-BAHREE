import { useState } from 'react'
import { Calendar, Check } from 'lucide-react'

export default function DashboardFilter({ onFilterChange }) {
    const [activePreset, setActivePreset] = useState('all')
    const [customRange, setCustomRange] = useState({ start: '', end: '' })
    const [showCustom, setShowCustom] = useState(false)

    const applyPreset = (presetType) => {
        setActivePreset(presetType)
        setShowCustom(false)
        const now = new Date()
        let dateFrom = null
        let dateTo = null

        if (presetType === 'current_month') {
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
        } else if (presetType === 'previous_month') {
            dateFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]
            dateTo = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]
        } else if (presetType === 'current_year') {
            dateFrom = `${now.getFullYear()}-01-01`
            dateTo = `${now.getFullYear()}-12-31`
        }

        onFilterChange({ dateFrom, dateTo, preset: presetType })
    }

    const handleCustomApply = (e) => {
        e.preventDefault()
        if (!customRange.start || !customRange.end) return
        setActivePreset('custom')
        onFilterChange({
            dateFrom: customRange.start,
            dateTo: customRange.end,
            preset: 'custom'
        })
    }

    // دالة التحكم في الألوان لتتوافق ديناميكياً مع الـ Light والـ Dark Mode
    const getActiveStyle = (isActive) => {
        if (isActive) {
            return {
                backgroundColor: 'var(--gold, #C9A96E)',
                color: 'var(--surf1, #000000)', // يتغير تلقائياً ليصبح داكناً ومقروءاً فوق التوهج الذهبي
                borderColor: 'var(--gold, #C9A96E)',
                fontWeight: '700',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }
        }
        return {
            backgroundColor: 'transparent',
            color: 'var(--txt1, #000000)', // كلام أسود في الـ Light Mode ويتحول لأبيض تلقائياً في الـ Dark Mode
            border: '1px solid var(--bdr, #ccc)',
            padding: '6px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontWeight: '500'
        }
    }

    return (
        <div className="dashboard-filter-container" style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', background: 'var(--surf2, #ffffff)', border: '1px solid var(--bdr, #eee)', padding: '12px', borderRadius: '14px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                    className={`filter-btn ${activePreset === 'all' ? 'active' : ''}`}
                    style={getActiveStyle(activePreset === 'all')}
                    onClick={() => { setActivePreset('all'); setShowCustom(false); onFilterChange({ dateFrom: null, dateTo: null, preset: 'all' }); }}
                > All Time </button>
                <button
                    className={`filter-btn ${activePreset === 'current_month' ? 'active' : ''}`}
                    style={getActiveStyle(activePreset === 'current_month')}
                    onClick={() => applyPreset('current_month')}
                > Current Month </button>
                <button
                    className={`filter-btn ${activePreset === 'previous_month' ? 'active' : ''}`}
                    style={getActiveStyle(activePreset === 'previous_month')}
                    onClick={() => applyPreset('previous_month')}
                > Previous Month </button>
                <button
                    className={`filter-btn ${activePreset === 'current_year' ? 'active' : ''}`}
                    style={getActiveStyle(activePreset === 'current_year')}
                    onClick={() => applyPreset('current_year')}
                > Current Year </button>
                <button
                    className={`filter-btn ${activePreset === 'custom' ? 'active' : ''}`}
                    style={{ ...getActiveStyle(activePreset === 'custom'), display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setShowCustom(!showCustom)}
                >
                    <Calendar size={14} /> Custom Range
                </button>
            </div>

            {showCustom && (
                <form onSubmit={handleCustomApply} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surf3, #f9f9f9)', border: '1px solid var(--bdr, #eee)', padding: '6px 12px', borderRadius: 8 }}>
                    <input
                        type="date"
                        value={customRange.start}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                        required
                        style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
                    />
                    <span style={{ color: 'var(--txt1, #000000)', fontSize: '13px', fontWeight: '500' }}>to</span>
                    <input
                        type="date"
                        value={customRange.end}
                        onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                        required
                        style={{ background: 'var(--surf1, #ffffff)', color: 'var(--txt1, #000000)', border: '1px solid var(--bdr, #ccc)', borderRadius: 6, padding: '4px 8px' }}
                    />
                    <button type="submit" style={{ background: 'var(--gold, #C9A96E)', color: 'var(--surf1, #000000)', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={14} />
                    </button>
                </form>
            )}
        </div>
    )
}