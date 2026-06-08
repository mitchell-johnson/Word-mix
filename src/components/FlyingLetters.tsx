import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

export interface Flight {
  id: string
  cellKey: string
  letter: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  size: number
  delay: number
}

interface Props {
  flights: Flight[]
  onLand: (flight: Flight) => void
}

export function FlyingLetters({ flights, onLand }: Props) {
  if (flights.length === 0) return null
  return createPortal(
    <div className="fly-layer">
      {flights.map((f) => {
        const peakY = Math.min(f.fromY, f.toY) - 28
        return (
          <motion.div
            key={f.id}
            className="fly-letter"
            style={{ width: f.size, height: f.size, fontSize: f.size * 0.62 }}
            initial={{ x: f.fromX - f.size / 2, y: f.fromY - f.size / 2, scale: 0.92, opacity: 1 }}
            animate={{
              x: f.toX - f.size / 2,
              y: [f.fromY - f.size / 2, peakY - f.size / 2, f.toY - f.size / 2],
              scale: 1,
            }}
            transition={{ duration: 0.34, delay: f.delay, ease: 'easeInOut' }}
            onAnimationComplete={() => onLand(f)}
          >
            {f.letter}
          </motion.div>
        )
      })}
    </div>,
    document.body,
  )
}
