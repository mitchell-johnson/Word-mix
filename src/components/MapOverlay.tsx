import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { levelsForMode } from '../data/levels'

interface Props {
  mode: number
  currentLevelId: number // the level the player is up to in this mode
  completedIds: number[]
  onPick: (id: number) => void
  onClose: () => void
}

export function MapOverlay({ mode, currentLevelId, completedIds, onPick, onClose }: Props) {
  const completed = useMemo(() => new Set(completedIds), [completedIds])
  const seq = useMemo(() => levelsForMode(mode), [mode])
  const currentIdx = seq.indexOf(currentLevelId)
  const doneInMode = seq.filter((id) => completed.has(id)).length

  return (
    <div className="scrim" onClick={onClose} style={{ alignItems: 'stretch', padding: 0 }}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(26,16,48,0.72)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'max(env(safe-area-inset-top),12px) 16px 10px' }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
              {mode}-letter journey
            </h2>
            <div style={{ fontSize: 13, opacity: 0.75, fontWeight: 600 }}>
              {doneInMode} of {seq.length} levels completed
            </div>
          </div>
          <button className="glass-pill" onClick={onClose} style={{ padding: '8px 16px', color: '#fff', fontWeight: 700 }}>
            Close
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px calc(env(safe-area-inset-bottom) + 20px)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))', gap: 8 }}>
            {seq.map((id, i) => {
              const isDone = completed.has(id)
              const isCurrent = i === currentIdx && !isDone
              const unlocked = isDone || i <= currentIdx
              return (
                <button
                  key={id}
                  disabled={!unlocked}
                  onClick={() => unlocked && onPick(id)}
                  className="tabnum"
                  style={{
                    aspectRatio: '1',
                    borderRadius: 14,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 15,
                    color: isDone ? '#7a4d06' : '#fff',
                    background: isDone
                      ? 'var(--grad-gold)'
                      : isCurrent
                        ? 'var(--grad-candy)'
                        : unlocked
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(255,255,255,0.05)',
                    border: isCurrent ? '1px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.14)',
                    opacity: unlocked ? 1 : 0.4,
                    position: 'relative',
                  }}
                  aria-label={`Level ${i + 1}${isDone ? ', completed' : isCurrent ? ', current' : unlocked ? '' : ', locked'}`}
                >
                  {i + 1}
                  {isDone && <span style={{ position: 'absolute', top: 2, right: 3, fontSize: 9 }}>★</span>}
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
