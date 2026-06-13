import { useMemo } from 'react'
import { motion } from 'framer-motion'

const CANDY = ['#FF4D8D', '#FF6FA3', '#C44BE6', '#7C3AED', '#FFC53D', '#2FD98B', '#6FA8FF']

/** Celebratory particles. Reduced motion → a few slow gold motes. */
export function Confetti({ reduced }: { reduced: boolean }) {
  const pieces = useMemo(() => {
    const count = reduced ? 12 : 54
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: reduced ? '#FFC53D' : CANDY[i % CANDY.length],
      size: reduced ? 5 + Math.random() * 3 : 7 + Math.random() * 7,
      delay: Math.random() * (reduced ? 0.6 : 0.25),
      drift: (Math.random() - 0.5) * 120,
      rot: Math.random() * 540,
      dur: reduced ? 2.4 + Math.random() * 0.8 : 1.5 + Math.random() * 0.9,
      round: reduced ? '50%' : Math.random() > 0.5 ? '2px' : '50%',
    }))
  }, [reduced])

  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', borderRadius: 'inherit' }}>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          style={{
            position: 'absolute',
            top: reduced ? '90%' : '-6%',
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.round,
            background: p.color,
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
          initial={{ y: 0, x: 0, rotate: 0, opacity: 1 }}
          animate={
            reduced
              ? { y: -160, opacity: [1, 1, 0] }
              : { y: '108vh', x: p.drift, rotate: p.rot, opacity: [1, 1, 0.9, 0] }
          }
          transition={{ duration: p.dur, delay: p.delay, ease: reduced ? 'easeOut' : 'easeIn' }}
        />
      ))}
    </div>
  )
}
