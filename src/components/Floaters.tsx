import { useMemo } from 'react'

interface Props {
  themeKey: string
  reduced: boolean
}

/** Ambient drifting specks tuned loosely per theme. Suppressed under reduced motion. */
export function Floaters({ themeKey, reduced }: Props) {
  const specks = useMemo(() => {
    const count = 12
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: Math.round(Math.random() * 100),
      size: 4 + Math.round(Math.random() * 10),
      dur: 9 + Math.round(Math.random() * 12),
      delay: Math.round(Math.random() * 16),
      opacity: 0.18 + Math.random() * 0.4,
    }))
    // themeKey in deps so specks reshuffle per pack
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeKey])

  if (reduced) return null
  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: -5, overflow: 'hidden', pointerEvents: 'none' }}>
      {specks.map((s) => (
        <span
          key={s.id}
          className="floater"
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            // @ts-expect-error custom props
            '--dur': `${s.dur}s`,
            '--o': s.opacity,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
