import { CreditCard, Wallet } from 'lucide-react'

export default function PaymentSplit({
  cash = 0,
  visa = 0
}) {
  const total = cash + visa

  const cashPct =
    total > 0
      ? Math.round((cash / total) * 100)
      : 0

  const visaPct =
    total > 0
      ? 100 - cashPct
      : 0

  return (
    <div>
      <div
        style={{
          display: 'flex',
          height: 32,
          marginBottom: 18,
          overflow: 'hidden',
          border: '1px solid var(--bdr)',
          borderRadius: 8,
          background: 'var(--surf2)',
        }}
      >
        {total > 0 ? (
          <>
            <div
              style={{
                width: `${cashPct}%`,
                background: '#C9A96E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: '#000',
              }}
            >
              {cashPct}%
            </div>

            <div
              style={{
                width: `${visaPct}%`,
                background: '#3B82F6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {visaPct}%
            </div>
          </>
        ) : (
          <div
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: 'var(--txt3)',
            }}
          >
            No payments yet
          </div>
        )}
      </div>

      {[
        { l: 'Cash', v: cash, c: '#C9A96E', Icon: Wallet },
        { l: 'Visa', v: visa, c: '#3B82F6', Icon: CreditCard },
      ].map(r => (
        <div
          key={r.l}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <r.Icon size={13} color={r.c} strokeWidth={2} />

          <span style={{ fontSize: 13 }}>
            {r.l}
          </span>

          <span
            style={{
              marginLeft: 'auto',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            AED {Number(r.v || 0).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  )
}