import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ringPositions, hitTestTile } from '../game/wheelGeometry'
import { sfxSelect } from '../lib/sfx'
import { buzz } from '../lib/haptics'

export type TicketKind = 'valid' | 'bonus' | 'dupe' | 'invalid' | 'neutral'

interface Props {
  letters: string[]
  classify: (word: string) => TicketKind
  onSubmit: (word: string, centers: { x: number; y: number }[]) => TicketKind
  onShuffle: () => void
  shuffleNonce: number
  disabled: boolean
}

export function LetterWheel({ letters, classify, onSubmit, onShuffle, shuffleNonce, disabled }: Props) {
  const n = letters.length
  const positions = useMemo(() => ringPositions(n), [n])
  const hubRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const selRef = useRef<number[]>([])
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const spinRef = useRef<HTMLButtonElement>(null)

  const [selection, setSelection] = useState<number[]>([])
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const [feedback, setFeedback] = useState<{ word: string; kind: TicketKind } | null>(null)

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    },
    [],
  )

  const setSel = useCallback((next: number[]) => {
    selRef.current = next
    setSelection(next)
  }, [])

  const localFraction = (clientX: number, clientY: number) => {
    const rect = hubRef.current!.getBoundingClientRect()
    return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    if ((e.target as HTMLElement).closest('.shuffle-btn')) return
    e.preventDefault()
    draggingRef.current = true
    setFeedback(null)
    try {
      hubRef.current?.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    const idx = hitTestTile(e.clientX, e.clientY, hubRef.current!.getBoundingClientRect(), n)
    setPointer(localFraction(e.clientX, e.clientY))
    if (idx >= 0) {
      setSel([idx])
      sfxSelect(0)
      buzz(6)
    } else {
      setSel([])
    }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    setPointer(localFraction(e.clientX, e.clientY))
    const idx = hitTestTile(e.clientX, e.clientY, hubRef.current!.getBoundingClientRect(), n)
    if (idx < 0) return
    const prev = selRef.current
    if (prev.length === 0) {
      setSel([idx])
      sfxSelect(0)
      buzz(6)
      return
    }
    const last = prev[prev.length - 1]
    if (idx === last) return
    if (prev.length >= 2 && idx === prev[prev.length - 2]) {
      setSel(prev.slice(0, -1)) // backtrack
      return
    }
    if (prev.includes(idx)) return // tiles can't be reused
    setSel([...prev, idx])
    sfxSelect(prev.length)
    buzz(6)
  }

  const finishDrag = (e: React.PointerEvent, submit: boolean) => {
    if (!draggingRef.current) return
    draggingRef.current = false
    try {
      hubRef.current?.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    setPointer(null)
    const sel = selRef.current
    setSel([])
    if (!submit || sel.length === 0) return
    const word = sel.map((i) => letters[i]).join('')
    const rect = hubRef.current!.getBoundingClientRect()
    const centers = sel.map((i) => ({
      x: rect.left + positions[i].x * rect.width,
      y: rect.top + positions[i].y * rect.height,
    }))
    const kind = onSubmit(word, centers)
    if (kind === 'invalid' || kind === 'dupe') {
      setFeedback({ word, kind })
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
      feedbackTimer.current = setTimeout(() => setFeedback(null), kind === 'invalid' ? 380 : 720)
    }
  }

  const handleShuffle = () => {
    if (disabled) return
    if (spinRef.current) {
      spinRef.current.style.transform = 'translate(-50%, -50%) rotate(0deg)'
      // force reflow then spin
      void spinRef.current.offsetWidth
      spinRef.current.style.transform = 'translate(-50%, -50%) rotate(360deg)'
    }
    buzz(8)
    onShuffle()
  }

  // Live ticket state
  const currentWord = selection.map((i) => letters[i]).join('')
  let ticketWord = ''
  let ticketKind: TicketKind = 'neutral'
  if (currentWord.length > 0) {
    ticketWord = currentWord
    const k = classify(currentWord)
    ticketKind = k === 'invalid' ? 'neutral' : k // never show red while spelling
  } else if (feedback) {
    ticketWord = feedback.word
    ticketKind = feedback.kind
  }

  const ticketClass =
    ticketWord.length === 0
      ? 'word-chip word-chip--hidden'
      : `word-chip${ticketKind !== 'neutral' ? ' word-chip--' + ticketKind : ''}${
          feedback?.kind === 'invalid' ? ' shake' : ''
        }`

  const linePoints = selection.map((i) => `${positions[i].x * 100},${positions[i].y * 100}`).join(' ')
  const lastSel = selection.length ? positions[selection[selection.length - 1]] : null

  return (
    <div className="wheel-wrap">
      <div className="ticket-slot">
        <div className={ticketClass}>
          {[...ticketWord].map((ch, i) => (
            <span key={i} className="word-chip-letter">
              {ch}
            </span>
          ))}
        </div>
      </div>

      <div className="wheel-area">
        <div
          ref={hubRef}
          className="wheel-hub"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishDrag(e, true)}
          onPointerCancel={(e) => finishDrag(e, false)}
          onLostPointerCapture={(e) => finishDrag(e, false)}
          role="application"
          aria-label="Letter wheel — swipe across letters to form a word"
        >
          <svg className="wheel-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="connGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--accent)" />
                <stop offset="1" stopColor="#ffffff" />
              </linearGradient>
            </defs>
            {selection.length >= 1 && lastSel && pointer && (
              <line
                className="connector"
                x1={lastSel.x * 100}
                y1={lastSel.y * 100}
                x2={pointer.x * 100}
                y2={pointer.y * 100}
              />
            )}
            {selection.length >= 2 && <polyline className="connector" points={linePoints} />}
            {selection.length >= 2 && <polyline className="connector-shimmer" points={linePoints} />}
          </svg>

          <div key={shuffleNonce} className="wheel-tiles">
            {letters.map((ch, i) => {
              const selected = selection.includes(i)
              return (
                <div
                  key={i}
                  className={`wheel-tile${selected ? ' wheel-tile--selected' : ''}`}
                  style={{
                    left: `${positions[i].x * 100}%`,
                    top: `${positions[i].y * 100}%`,
                    animationDelay: `${i * 28}ms`,
                  }}
                >
                  {ch}
                </div>
              )
            })}
          </div>

          <button ref={spinRef} className="shuffle-btn" onClick={handleShuffle} aria-label="Shuffle letters">
            <svg width="44%" height="44%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
