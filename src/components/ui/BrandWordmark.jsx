export default function BrandWordmark({ size = 'md', style = {} }) {
  const sizes = {
    sm: { flower: 18, name: 17, tag: 9, gap: 5 },
    md: { flower: 24, name: 22, tag: 10, gap: 6 },
    lg: { flower: 32, name: 28, tag: 11, gap: 8 },
  }

  const s = sizes[size] || sizes.md
  return (
    <div
      style={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >

      {/* NAME */}
      <div
        style={{
          fontFamily: '"Cinzel", "Playfair Display", serif',
          fontWeight: 700,
          fontSize: s.name + 6,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',

          background:
            'linear-gradient(180deg,#fff3c4 0%,#f6d37a 20%,#d9b86a 45%,#b78a3e 70%,#fff1b0 100%)',

          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',

          textShadow:
            '0 0 12px rgba(214,178,94,.25), 0 0 24px rgba(214,178,94,.15)',
        }}
      >
        ZAHART BAHREE
      </div>

      {/* GOLD DIVIDER */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          width: 290,
          marginTop: 12,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 2,
            background:
              'linear-gradient(90deg,transparent,#d6b25e,#f6d37a)',
          }}
        />

        <span
          style={{
            margin: '0 12px',
            color: '#f6d37a',
            fontSize: 12,
            textShadow: '0 0 10px rgba(246,211,122,.8)',
          }}
        >
          ✦
        </span>

        <div
          style={{
            flex: 1,
            height: 2,
            background:
              'linear-gradient(90deg,#f6d37a,#d6b25e,transparent)',
          }}
        />
      </div>

    </div>
  )
}