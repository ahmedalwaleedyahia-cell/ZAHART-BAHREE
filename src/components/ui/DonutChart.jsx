import { PieChart } from "lucide-react"
export default function DonutChart({ data = [] }) {
    const r = 58          // radius
    const cx = 80          // centre x
    const cy = 80          // centre y
    const sw = 20          // stroke-width (ring thickness)
    const circ = 2 * Math.PI * r
    const total = data.reduce((a, d) => a + (Number(d.value) || 0), 0)

    // Empty state
    if (total === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '28px 0',
                    gap: 10,
                    color: 'var(--txt3)',
                }}
            >
                <PieChart
                    size={32}
                    strokeWidth={1.8}
                    style={{
                        opacity: 0.45,
                        color: 'var(--txt3)',
                    }}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>No category data yet</span>
                <span style={{ fontSize: 12 }}>Breakdown appears once orders are placed</span>
            </div>
        )
    }

    // Build segments — cumulative percentage offsets
    // SVG dash trick:
    //   dasharray  = `${arc_length} ${remaining}`
    //   dashoffset = circumference * (1 - cumulative_before_this_segment)
    //   + rotate(-90deg) via CSS to start at 12 o'clock
    let cumulativePct = 0
    const segments = data.map(d => {
        const val = Number(d.value) || 0
        const pct = val / total
        const dash = pct * circ
        const gap = circ - dash
        // offset = circ - (cumulativePct * circ)  →  shifts dash start forward
        const offset = circ - cumulativePct * circ
        cumulativePct += pct
        return { ...d, val, dash, gap, offset }
    })

    const centreLabel =
        total >= 1000
            ? `${(total / 1000).toFixed(1)}k`
            : Math.round(total).toString()

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                flexWrap: 'wrap',
                padding: '4px 0',
            }}
        >
            {/* ── SVG donut ──────────────────────────────────── */}
            <svg
                width={160}
                height={160}
                viewBox="0 0 160 160"
                style={{ flexShrink: 0, overflow: 'visible' }}
                aria-label="Revenue by category"
            >
                {/* Track ring */}
                <circle
                    cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke="var(--surf4, rgba(160,155,145,0.14))"
                    strokeWidth={sw}
                />

                {/* Coloured arcs */}
                {segments.map((seg, i) =>
                    seg.val > 0 ? (
                        <circle
                            key={i}
                            cx={cx}
                            cy={cy}
                            r={r}
                            fill="none"
                            stroke={seg.color}
                            strokeWidth={sw}
                            strokeDasharray={`${seg.dash} ${seg.gap}`}
                            strokeDashoffset={seg.offset}
                            strokeLinecap="butt"
                            style={{
                                transformOrigin: `${cx}px ${cy}px`,
                                transform: 'rotate(-90deg)',
                                transition: 'stroke-dasharray 0.5s ease',
                            }}
                        />
                    ) : null
                )}

                {/* Centre label — "AED" */}
                <text
                    x={cx}
                    y={cy - 8}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight="600"
                    letterSpacing="0.08em"
                    fontFamily='"Outfit", system-ui, sans-serif'
                    fill="var(--txt3, #8C7355)"
                >
                    AED
                </text>

                {/* Centre label — amount */}
                <text
                    x={cx}
                    y={cy + 9}
                    textAnchor="middle"
                    fontSize={15}
                    fontWeight="800"
                    fontFamily='"Outfit", system-ui, sans-serif'
                    fill="var(--txt, #F1EDE7)"
                >
                    {centreLabel}
                </text>
            </svg>

            {/* ── Legend ────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 80 }}>
                {data.map(d => {
                    const val = Number(d.value) || 0
                    const pct = total > 0 ? Math.round((val / total) * 100) : 0
                    return (
                        <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {/* Dot */}
                            <div
                                style={{
                                    width: 9,
                                    height: 9,
                                    background: d.color,
                                    borderRadius: 3,
                                    flexShrink: 0,
                                    boxShadow: `0 0 6px ${d.color}55`,
                                }}
                            />
                            {/* Text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                    style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: 'var(--txt, #F1EDE7)',
                                        lineHeight: 1.2,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {d.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 10.5,
                                        color: 'var(--txt3, #8C7355)',
                                        lineHeight: 1.3,
                                    }}
                                >
                                    AED {val.toFixed(0)} · {pct}%
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
