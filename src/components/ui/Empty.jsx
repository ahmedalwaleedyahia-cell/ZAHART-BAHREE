
export default function Empty({ icon, text = 'No data', sub = '' }) {
  // Safely render the icon — could be a string emoji or a React element
  const renderedIcon = icon
    ? (typeof icon === 'string'
      ? <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden="true">{icon}</span>
      : <span style={{ display: 'flex', justifyContent: 'center' }}>{icon}</span>
    )
    : null

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 16px',
        gap: 8,
        textAlign: 'center',
        opacity: 0.7,
      }}
    >
      {renderedIcon}

      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--txt2, #888)',
          marginTop: renderedIcon ? 4 : 0,
        }}
      >
        {text}
      </span>

      {sub && (
        <span
          style={{
            fontSize: 11,
            color: 'var(--txt3, #aaa)',
            maxWidth: 220,
            lineHeight: 1.5,
          }}
        >
          {sub}
        </span>
      )}
    </div>
  )
}
