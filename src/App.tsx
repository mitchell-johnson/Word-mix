export default function App() {
  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(160deg, #2a1b5e 0%, #3a2a7a 45%, #6d4aa8 100%)',
        color: '#fff',
        fontFamily: 'system-ui, sans-serif',
        letterSpacing: '0.04em',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 44, fontWeight: 800 }}>Word&nbsp;Mix</div>
        <div style={{ opacity: 0.7, marginTop: 8 }}>coming online…</div>
      </div>
    </div>
  )
}
