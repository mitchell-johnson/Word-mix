import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Confetti } from './Confetti'

interface Props {
  levelNumber: number
  coinsAwarded: number
  bonusFound: number
  isLastLevel: boolean
  reduced: boolean
  onNext: () => void
}

function useCountUp(target: number, durationMs: number, run: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!run) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs)
      setVal(Math.round(target * (1 - Math.pow(1 - t, 2))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, durationMs, run])
  return val
}

const BANNER = 'LEVEL COMPLETE!'

export function LevelCompleteOverlay({ levelNumber, coinsAwarded, bonusFound, isLastLevel, reduced, onNext }: Props) {
  const coins = useCountUp(coinsAwarded, 800, true)
  const spring = { type: 'spring', stiffness: 320, damping: 22 } as const

  return (
    <div className="scrim" onClick={onNext} role="dialog" aria-label="Level complete">
      <Confetti reduced={reduced} />
      <motion.div
        className="glass-card overlay-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.7, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={reduced ? { duration: 0.18 } : spring}
        style={{ textAlign: 'center' }}
      >
        <motion.div
          initial={{ scale: reduced ? 1 : 1.6, rotate: reduced ? 0 : -8, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={reduced ? { duration: 0.18 } : { ...spring, delay: 0.1 }}
          style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}
        >
          <div className="wax-seal">✶</div>
        </motion.div>

        <h2 className="complete-banner" style={{ margin: '0 0 4px' }}>
          {[...BANNER].map((ch, i) => (
            <motion.span
              key={i}
              className="gradient-text"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'inline-block', whiteSpace: 'pre' }}
              initial={{ y: reduced ? 0 : 14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: reduced ? 0 : 0.2 + i * 0.03, duration: 0.3 }}
            >
              {ch}
            </motion.span>
          ))}
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, margin: '14px 0 6px' }}>
          {[0, 1, 2].map((s) => (
            <motion.div
              key={s}
              initial={{ scale: reduced ? 1 : 1.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={reduced ? { duration: 0.15 } : { ...spring, delay: 0.4 + s * 0.16 }}
            >
              <svg width="44" height="44" viewBox="0 0 24 24" fill="var(--c-gold)" stroke="var(--c-gold-deep)" strokeWidth="1">
                <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 18l-6 3.4 1.4-6.8L2.3 9.1l6.9-.8z" />
              </svg>
            </motion.div>
          ))}
        </div>

        <p style={{ margin: '6px 0 2px', opacity: 0.82, fontWeight: 600 }}>
          Level {levelNumber} cleared{bonusFound > 0 ? ` · ${bonusFound} bonus word${bonusFound === 1 ? '' : 's'}` : ''}
        </p>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, margin: '12px 0 20px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26 }}>
          <span className="coin-disc" style={{ width: 26, height: 26, fontSize: 13 }}>
            ✦
          </span>
          <span className="tabnum">+{coins}</span>
        </div>

        <button className={`btn btn--candy${reduced ? '' : ' cta-breathe'}`} onClick={onNext} style={{ width: '100%', fontSize: 17 }}>
          {isLastLevel ? 'Replay' : 'Next Level'}
        </button>
      </motion.div>
    </div>
  )
}
