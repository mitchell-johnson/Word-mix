import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { useActiveLevel, useReducedMotion } from '../lib/useActiveLevel'
import { getLevel, getBonusSet } from '../data/levels'
import { classifyWord } from '../game/wordMatch'
import { cellKey } from '../game/grid'
import { ECONOMY } from '../config'
import { sfxValid, sfxBonus, sfxInvalid, sfxDupe, sfxHint, sfxComplete } from '../lib/sfx'
import { buzz } from '../lib/haptics'
import { TopBar } from './TopBar'
import { Crossword } from './Crossword'
import { LetterWheel, type TicketKind } from './LetterWheel'
import { HintBar } from './HintBar'
import { Toast, type ToastData } from './Toast'
import { FlyingLetters, type Flight } from './FlyingLetters'

interface Props {
  levelId: number
  paused: boolean
  onCompleted: (levelId: number) => void
  onOpenMap: () => void
  onOpenSettings: () => void
}

export function GameScreen({ levelId, paused, onCompleted, onOpenMap, onOpenSettings }: Props) {
  const level = getLevel(levelId)!
  const active = useActiveLevel(levelId)
  const reduced = useReducedMotion()

  const coins = useGameStore((s) => s.persisted.coins)
  const settings = useGameStore((s) => s.persisted.settings)
  const totalWordsSolved = useGameStore((s) => s.persisted.stats.totalWordsSolved)
  const revealedCells = useGameStore((s) => s.persisted.levelProgress[levelId]?.revealedCells)
  const solveWord = useGameStore((s) => s.solveWord)
  const foundBonusWord = useGameStore((s) => s.foundBonusWord)
  const completeLevel = useGameStore((s) => s.completeLevel)
  const revealLetter = useGameStore((s) => s.revealLetter)
  const revealWord = useGameStore((s) => s.revealWord)

  const [wheelOrder, setWheelOrder] = useState<number[]>(() => level.letters.map((_, i) => i))
  const [shuffleNonce, setShuffleNonce] = useState(0)
  const [flights, setFlights] = useState<Flight[]>([])
  const [suppressed, setSuppressed] = useState<Set<string>>(new Set())
  const [justFilled, setJustFilled] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<ToastData | null>(null)

  const boardAreaRef = useRef<HTMLDivElement>(null)
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const activeRef = useRef(active)
  activeRef.current = active
  const pendingCompleteRef = useRef(false)
  const outstanding = useRef<Set<string>>(new Set())
  const toastId = useRef(0)
  const flyId = useRef(0)
  const justFillTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset transient view state when the level changes.
  useEffect(() => {
    setWheelOrder(level.letters.map((_, i) => i))
    setShuffleNonce((n) => n + 1)
    setFlights([])
    setSuppressed(new Set())
    setJustFilled(new Set())
    pendingCompleteRef.current = false
    outstanding.current = new Set()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId])

  useEffect(
    () => () => {
      justFillTimers.current.forEach(clearTimeout)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

  // Publish the board area's available height so the grid can scale cells to fit it vertically.
  useLayoutEffect(() => {
    const el = boardAreaRef.current
    if (!el) return
    const update = () => el.style.setProperty('--board-h', `${el.clientHeight}px`)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const registerCell = useCallback((key: string, el: HTMLDivElement | null) => {
    if (el) cellRefs.current.set(key, el)
    else cellRefs.current.delete(key)
  }, [])

  const solvedWordsSet = useMemo(
    () => new Set(active?.solvedWordIndices.map((i) => level.words[i].word) ?? []),
    [active, level],
  )
  const foundBonusSet = useMemo(() => new Set(active?.foundBonusWords ?? []), [active])
  const bonusSet = useMemo(() => getBonusSet(levelId), [levelId])

  const hintCells = useMemo(() => {
    const set = new Set(revealedCells ?? [])
    // drop cells that are now part of a solved word (they render as normal filled tiles)
    for (const i of active?.solvedWordIndices ?? []) {
      const w = level.words[i]
      for (let j = 0; j < w.word.length; j++) {
        const r = w.row + (w.direction === 'down' ? j : 0)
        const c = w.col + (w.direction === 'across' ? j : 0)
        set.delete(cellKey(r, c))
      }
    }
    return set
  }, [revealedCells, active, level])

  const classify = useCallback(
    (word: string): TicketKind => {
      const m = classifyWord(word, level, solvedWordsSet, foundBonusSet, bonusSet)
      if (m.kind === 'grid') return 'valid'
      return m.kind
    },
    [level, solvedWordsSet, foundBonusSet, bonusSet],
  )

  const popCells = useCallback((keys: string[]) => {
    setJustFilled((prev) => {
      const n = new Set(prev)
      keys.forEach((k) => n.add(k))
      return n
    })
    const t = setTimeout(() => {
      setJustFilled((prev) => {
        const n = new Set(prev)
        keys.forEach((k) => n.delete(k))
        return n
      })
    }, 460)
    justFillTimers.current.push(t)
  }, [])

  const finalizeCompletion = useCallback(() => {
    if (!pendingCompleteRef.current) return
    pendingCompleteRef.current = false
    completeLevel(levelId)
    sfxComplete()
    buzz([0, 35, 40, 35])
    setTimeout(() => onCompleted(levelId), 140)
  }, [completeLevel, levelId, onCompleted])

  const showToast = useCallback((message: string) => {
    toastId.current += 1
    setToast({ id: toastId.current, message })
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 1300)
  }, [])

  const doShuffle = useCallback(() => {
    setWheelOrder((prev) => {
      const a = prev.slice()
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[a[i], a[j]] = [a[j], a[i]]
      }
      return a
    })
    setShuffleNonce((n) => n + 1)
  }, [])

  const wordCells = useCallback(
    (wordIndex: number) => {
      const w = level.words[wordIndex]
      const keys: string[] = []
      for (let i = 0; i < w.word.length; i++) {
        const r = w.row + (w.direction === 'down' ? i : 0)
        const c = w.col + (w.direction === 'across' ? i : 0)
        keys.push(cellKey(r, c))
      }
      return keys
    },
    [level],
  )

  const onLand = useCallback(
    (flight: Flight) => {
      outstanding.current.delete(flight.id)
      setFlights((prev) => prev.filter((f) => f.id !== flight.id))
      setSuppressed((prev) => {
        const n = new Set(prev)
        n.delete(flight.cellKey)
        return n
      })
      popCells([flight.cellKey])
      if (outstanding.current.size === 0 && pendingCompleteRef.current) finalizeCompletion()
    },
    [popCells, finalizeCompletion],
  )

  const handleSubmit = useCallback(
    (word: string, centers: { x: number; y: number }[]): TicketKind => {
      const a = activeRef.current
      if (!a) return 'invalid'
      const match = classifyWord(word, level, solvedWordsSet, foundBonusSet, bonusSet)

      if (match.kind === 'grid') {
        const wi = match.wordIndex
        const keys = wordCells(wi)
        const rects = keys.map((k) => cellRefs.current.get(k)?.getBoundingClientRect())
        const willComplete = a.solvedWordIndices.length + 1 === level.words.length

        solveWord(levelId, wi)
        sfxValid()
        buzz(12)

        if (reduced || rects.some((r) => !r)) {
          popCells(keys)
          if (willComplete) {
            pendingCompleteRef.current = true
            setTimeout(finalizeCompletion, 240)
          }
        } else {
          setSuppressed((prev) => new Set([...prev, ...keys]))
          const size = rects[0]!.width
          const newFlights: Flight[] = keys.map((key, i) => {
            const dr = rects[i]!
            flyId.current += 1
            const id = `f${flyId.current}`
            outstanding.current.add(id)
            return {
              id,
              cellKey: key,
              letter: level.words[wi].word[i],
              fromX: centers[i]?.x ?? dr.left + dr.width / 2,
              fromY: centers[i]?.y ?? dr.top + dr.height / 2,
              toX: dr.left + dr.width / 2,
              toY: dr.top + dr.height / 2,
              size,
              delay: i * 0.04,
            }
          })
          if (willComplete) {
            pendingCompleteRef.current = true
            // Watchdog: never let completion depend solely on framer-motion's onAnimationComplete
            // (which can be skipped if the animation is interrupted). finalizeCompletion is idempotent.
            const t = setTimeout(() => {
              outstanding.current.clear()
              finalizeCompletion()
            }, 900)
            justFillTimers.current.push(t)
          }
          setFlights((prev) => [...prev, ...newFlights])
        }

        if (settings.autoShuffle) doShuffle()
        return 'valid'
      }

      if (match.kind === 'bonus') {
        foundBonusWord(levelId, word)
        sfxBonus()
        buzz([4, 24, 4])
        showToast(`BONUS  +${ECONOMY.coinsPerBonusWord}`)
        return 'bonus'
      }

      if (match.kind === 'dupe') {
        sfxDupe()
        return 'dupe'
      }

      sfxInvalid()
      buzz(20)
      return 'invalid'
    },
    [
      level,
      levelId,
      solvedWordsSet,
      foundBonusSet,
      bonusSet,
      reduced,
      settings.autoShuffle,
      solveWord,
      foundBonusWord,
      wordCells,
      popCells,
      doShuffle,
      showToast,
      finalizeCompletion,
    ],
  )

  const onRevealLetter = useCallback(() => {
    const cell = revealLetter(levelId)
    if (!cell) return
    sfxHint()
    buzz(10)
    popCells([cellKey(cell.row, cell.col)])
  }, [revealLetter, levelId, popCells])

  const onRevealWord = useCallback(() => {
    const a = activeRef.current
    const wi = revealWord(levelId)
    if (wi == null || wi < 0 || !a) return
    sfxHint()
    buzz([6, 20, 6])
    popCells(wordCells(wi))
    if (a.solvedWordIndices.length + 1 === level.words.length) {
      pendingCompleteRef.current = true
      setTimeout(finalizeCompletion, 320)
    }
  }, [revealWord, levelId, wordCells, popCells, level, finalizeCompletion])

  if (!active) return null

  const wheelLetters = wheelOrder.map((i) => level.letters[i])
  const solvedCount = active.solvedWordIndices.length
  const total = level.words.length

  return (
    <div className="app-shell">
      <TopBar
        levelId={level.id}
        packName={level.packName}
        coins={coins}
        bonusFound={active.foundBonusWords.length}
        bonusTotal={level.bonusWords.length}
        onOpenMap={onOpenMap}
        onOpenSettings={onOpenSettings}
      />

      <div className="board-area" ref={boardAreaRef}>
        <div className="board-plate">
          <Crossword
            grid={active.grid}
            cols={level.cols}
            rows={level.rows}
            suppressed={suppressed}
            justFilled={justFilled}
            hintCells={hintCells}
            registerCell={registerCell}
          />
        </div>
      </div>

      {totalWordsSolved === 0 && solvedCount === 0 && (
        <div className="coach-mark" style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 2 }}>
          Swipe the letters to make a word
        </div>
      )}

      <LetterWheel
        letters={wheelLetters}
        classify={classify}
        onSubmit={handleSubmit}
        onShuffle={doShuffle}
        shuffleNonce={shuffleNonce}
        disabled={paused}
      />

      <HintBar
        coins={coins}
        solved={solvedCount}
        total={total}
        onRevealLetter={onRevealLetter}
        onRevealWord={onRevealWord}
        disabled={paused}
      />

      <Toast toast={toast} />
      <FlyingLetters flights={flights} onLand={onLand} />
    </div>
  )
}
