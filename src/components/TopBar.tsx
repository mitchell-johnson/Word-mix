import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

function CoinCounter({ coins }: { coins: number }) {
  const [pop, setPop] = useState(false)
  const prev = useRef(coins)
  useEffect(() => {
    if (coins !== prev.current) {
      setPop(true)
      prev.current = coins
      const t = setTimeout(() => setPop(false), 280)
      return () => clearTimeout(t)
    }
  }, [coins])
  return (
    <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px 5px 6px' }}>
      <motion.span className="coin-disc" animate={pop ? { scale: [1, 1.28, 1] } : { scale: 1 }} transition={{ duration: 0.28 }}>
        ✦
      </motion.span>
      <span className="tabnum" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>
        {coins}
      </span>
    </div>
  )
}

function BonusJar({ found, total }: { found: number; total: number }) {
  const fill = total > 0 ? Math.min(1, found / total) : 0
  const h = 18 * fill
  return (
    <div className="glass-pill" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px 5px 8px' }}>
      <svg width="20" height="24" viewBox="0 0 20 24" aria-hidden>
        <defs>
          <clipPath id="jarClip">
            <path d="M5 6 h10 a1 1 0 0 1 1 1 v13 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 v-13 a1 1 0 0 1 1 -1 z" />
          </clipPath>
        </defs>
        <rect x="3" y={21 - h} width="14" height={h + 2} fill="var(--c-gold)" clipPath="url(#jarClip)" />
        <path
          d="M5 6 h10 a1 1 0 0 1 1 1 v13 a3 3 0 0 1 -3 3 h-6 a3 3 0 0 1 -3 -3 v-13 a1 1 0 0 1 1 -1 z"
          fill="none"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="1.4"
        />
        <rect x="6" y="3" width="8" height="3.5" rx="1.4" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.4" />
      </svg>
      <span className="tabnum" style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14 }}>
        {found}
      </span>
    </div>
  )
}

interface Props {
  levelNumber: number
  subtitle: string
  coins: number
  bonusFound: number
  bonusTotal: number
  onOpenMap: () => void
  onOpenSettings: () => void
}

export function TopBar({ levelNumber, subtitle, coins, bonusFound, bonusTotal, onOpenMap, onOpenSettings }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
      <button className="glass-pill" onClick={onOpenMap} style={{ padding: '6px 14px', textAlign: 'left', color: '#fff' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, lineHeight: 1 }}>Level {levelNumber}</div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.72, marginTop: 2 }}>
          {subtitle}
        </div>
      </button>
      <div style={{ flex: 1 }} />
      <BonusJar found={bonusFound} total={bonusTotal} />
      <CoinCounter coins={coins} />
      <button className="glass-pill" onClick={onOpenSettings} aria-label="Settings" style={{ padding: 9, color: '#fff', display: 'grid', placeItems: 'center' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  )
}
