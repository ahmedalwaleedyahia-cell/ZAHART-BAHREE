/**
 * BarChart.jsx — Zahra.pos Unified Bar Chart
 *
 * STANDARD FORMAT:
 *   data = [{ name: string, value: number }]
 */
import { BarChart3 } from "lucide-react"
export default function BarChart({
  data = [],
  color = '#C9A96E',
  height = 180,
}) {
  /* ── Normalize data (CRITICAL FIX) ─────────────── */
  const normalized = (data || []).map(d => ({
    name: d.name ?? d.label ?? '',
    value: Number(d.value ?? 0),
  }))

  /* ── Empty / zero guard ─────────────────────────── */
  if (
    normalized.length === 0 ||
    normalized.every(d => d.value === 0)
  ) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          gap: 10,
          fontFamily: 'var(--font)',
        }}
      >
        <BarChart3
          size={30}
          strokeWidth={1.8}
          style={{
            opacity: 0.45,
            color: 'var(--txt3)',
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt2)' }}>
          No data yet
        </span>
        <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
          Data will appear as orders come in
        </span>
      </div>
    )
  }

  /* ── Layout constants ───────────────────────────── */
  const LABEL_TOP = 14
  const LABEL_BOTTOM = 14
  const TRACK_H = height - LABEL_TOP - LABEL_BOTTOM

  const values = normalized.map(d => d.value)
  const max = Math.max(...values, 1)

  /* ── Render ─────────────────────────────────────── */
  return (
    <div
      style={{
        width: '100%',
        height,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 5,
        overflowX: 'auto',
        overflowY: 'visible',
        fontFamily: 'var(--font)',
      }}
    >
      {normalized.map((d, i) => {
        const pct = d.value > 0 ? (d.value / max) * 100 : 0
        const barH = Math.round((pct / 100) * TRACK_H)

        return (
          <div
            key={i}
            title={`${d.name}: ${d.value}`}
            style={{
              flex: '1 1 0',
              minWidth: 22,
              maxWidth: 60,
              height,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Top value */}
            <div
              style={{
                height: LABEL_TOP,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--txt3)',
              }}
            >
              {d.value >= 1000
                ? `${(d.value / 1000).toFixed(1)}k`
                : d.value || ''}
            </div>

            {/* Bar */}
            <div
              style={{
                height: TRACK_H,
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: barH > 0 ? barH : 0,
                  minHeight: d.value > 0 ? 3 : 0,
                  background: `linear-gradient(to top, ${color}99, ${color})`,
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 0.4s ease',
                }}
              />
            </div>

            {/* Bottom label */}
            <div
              style={{
                height: LABEL_BOTTOM,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                fontSize: 9,
                color: 'var(--txt3)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
              }}
            >
              {d.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}