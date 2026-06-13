import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getLevel } from '../data/levels'
import { buildActiveLevelState } from '../game/grid'
import type { ActiveLevelState } from '../types'

/** Reactive view-model for a level: re-derives when that level's progress changes. */
export function useActiveLevel(levelId: number): ActiveLevelState | null {
  const progress = useGameStore((s) => s.persisted.levelProgress[levelId])
  return useMemo(() => {
    const level = getLevel(levelId)
    if (!level) return null
    return buildActiveLevelState(level, progress)
  }, [levelId, progress])
}

/** Reduced motion = explicit setting OR OS preference. */
export function useReducedMotion(): boolean {
  const setting = useGameStore((s) => s.persisted.settings.reducedMotion)
  const [os, setOs] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = () => setOs(m.matches)
    m.addEventListener?.('change', handler)
    return () => m.removeEventListener?.('change', handler)
  }, [])
  return setting || os
}
