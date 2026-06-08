import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Settings, LifetimeStats, LetterMode } from '../types'
import { LETTER_MODES } from '../config'

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: 'transparent',
        border: 'none',
        color: '#fff',
        padding: '12px 2px',
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      <span>{label}</span>
      <span
        style={{
          width: 46,
          height: 28,
          borderRadius: 999,
          background: on ? 'var(--grad-candy)' : 'rgba(255,255,255,0.18)',
          border: '1px solid rgba(255,255,255,0.3)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <motion.span
          style={{ position: 'absolute', top: 2, left: 2, width: 22, height: 22, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
          animate={{ x: on ? 18 : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </span>
    </button>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '10px 12px' }}>
      <div className="tabnum" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  )
}

interface Props {
  settings: Settings
  stats: LifetimeStats
  coins: number
  completed: number
  total: number
  onToggle: <K extends keyof Settings>(k: K) => void
  onSetLetterMode: (m: LetterMode) => void
  onReset: () => void
  onClose: () => void
}

export function SettingsSheet({ settings, stats, coins, completed, total, onToggle, onSetLetterMode, onReset, onClose }: Props) {
  const [confirmReset, setConfirmReset] = useState(false)
  return (
    <div className="scrim" onClick={onClose} style={{ alignItems: 'flex-end' }}>
      <motion.div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        style={{ maxWidth: 440, marginBottom: 8 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>Settings</h2>
          <button className="glass-pill" onClick={onClose} style={{ padding: '6px 14px', color: '#fff', fontWeight: 700 }}>
            Done
          </button>
        </div>

        <h3 style={{ margin: '4px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Word length</h3>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${LETTER_MODES.length}, 1fr)`, gap: 8, marginBottom: 6 }}>
          {LETTER_MODES.map((m) => {
            const active = settings.letterMode === m
            return (
              <button
                key={m}
                onClick={() => onSetLetterMode(m)}
                aria-pressed={active}
                style={{
                  padding: '14px 0',
                  borderRadius: 16,
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 18,
                  color: '#fff',
                  background: active ? 'var(--grad-candy)' : 'rgba(255,255,255,0.1)',
                  border: active ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.18)',
                  boxShadow: active ? '0 6px 18px rgba(255,77,141,0.4)' : 'none',
                }}
              >
                {m}
                <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, opacity: 0.85, letterSpacing: '0.04em' }}>LETTERS</div>
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, opacity: 0.55, margin: '0 0 12px' }}>Switching length picks up where you left off in that mode.</p>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <Toggle on={settings.sound} onClick={() => onToggle('sound')} label="Sound effects" />
          <Toggle on={settings.haptics} onClick={() => onToggle('haptics')} label="Haptics" />
          <Toggle on={settings.reducedMotion} onClick={() => onToggle('reducedMotion')} label="Reduced motion" />
          <Toggle on={settings.autoShuffle} onClick={() => onToggle('autoShuffle')} label="Auto-shuffle after a word" />
        </div>

        <h3 style={{ margin: '16px 0 8px', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7 }}>Your progress</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <Stat label="Levels" value={`${completed}/${total}`} />
          <Stat label="Words" value={stats.totalWordsSolved} />
          <Stat label="Bonus" value={stats.totalBonusWordsFound} />
          <Stat label="Coins" value={coins} />
          <Stat label="Earned" value={stats.totalCoinsEarned} />
          <Stat label="Hints" value={stats.hintsUsed} />
        </div>

        <button
          className="btn"
          onClick={() => {
            if (confirmReset) {
              onReset()
              setConfirmReset(false)
              onClose()
            } else {
              setConfirmReset(true)
            }
          }}
          style={{ width: '100%', marginTop: 18, background: confirmReset ? 'rgba(255,92,108,0.85)' : undefined }}
        >
          {confirmReset ? 'Tap again to erase ALL progress' : 'Reset progress'}
        </button>
        <p style={{ fontSize: 11, opacity: 0.55, textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
          Progress is stored only in this browser. Clearing site data erases it.
        </p>
      </motion.div>
    </div>
  )
}
