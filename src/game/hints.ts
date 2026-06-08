import type { Level, LevelProgress } from '../types'
import { cellKey } from './grid'

/** A cell to reveal for a letter hint, or null if nothing useful remains. */
export function pickRevealLetterCell(
  level: Level,
  progress: LevelProgress,
): { row: number; col: number; letter: string } | null {
  const solved = new Set(progress.solvedWords)
  const revealed = new Set(progress.revealedCells)

  // Prefer the shortest unsolved word so a hint makes visible progress.
  const unsolved = level.words
    .map((w, i) => ({ w, i }))
    .filter(({ w }) => !solved.has(w.word))
    .sort((a, b) => a.w.word.length - b.w.word.length)

  for (const { w } of unsolved) {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + (w.direction === 'down' ? i : 0)
      const c = w.col + (w.direction === 'across' ? i : 0)
      if (!revealed.has(cellKey(r, c))) {
        return { row: r, col: c, letter: w.word[i] }
      }
    }
  }
  return null
}

/** The shortest unsolved word's index, or -1. */
export function pickRevealWordIndex(level: Level, progress: LevelProgress): number {
  const solved = new Set(progress.solvedWords)
  let best = -1
  let bestLen = Infinity
  level.words.forEach((w, i) => {
    if (!solved.has(w.word) && w.word.length < bestLen) {
      bestLen = w.word.length
      best = i
    }
  })
  return best
}
