import type { Level, GridCell, LevelProgress, ActiveLevelState } from '../types'

export const cellKey = (row: number, col: number) => `${row},${col}`

/** Walk every PlacedWord into a rows×cols grid of cells. */
export function buildGrid(level: Level): GridCell[][] {
  const grid: GridCell[][] = []
  for (let r = 0; r < level.rows; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < level.cols; c++) {
      row.push({ row: r, col: c, filled: false, letter: '', wordIndices: [], revealed: false })
    }
    grid.push(row)
  }
  level.words.forEach((w, wi) => {
    for (let i = 0; i < w.word.length; i++) {
      const r = w.row + (w.direction === 'down' ? i : 0)
      const c = w.col + (w.direction === 'across' ? i : 0)
      const cell = grid[r][c]
      cell.filled = true
      cell.letter = w.word[i]
      cell.wordIndices.push(wi)
    }
  })
  return grid
}

/** Combine static level content with this player's progress into a view-model. */
export function buildActiveLevelState(level: Level, progress?: LevelProgress): ActiveLevelState {
  const grid = buildGrid(level)
  const solved = new Set(progress?.solvedWords ?? [])
  const revealedCells = new Set(progress?.revealedCells ?? [])

  const solvedWordIndices: number[] = []
  level.words.forEach((w, wi) => {
    if (solved.has(w.word)) {
      solvedWordIndices.push(wi)
      for (let i = 0; i < w.word.length; i++) {
        const r = w.row + (w.direction === 'down' ? i : 0)
        const c = w.col + (w.direction === 'across' ? i : 0)
        grid[r][c].revealed = true
      }
    }
  })

  // Individual letter-hint reveals.
  for (const key of revealedCells) {
    const [r, c] = key.split(',').map(Number)
    if (grid[r]?.[c]?.filled) grid[r][c].revealed = true
  }

  return {
    level,
    grid,
    solvedWordIndices,
    foundBonusWords: progress?.bonusWordsFound ?? [],
    isComplete: solvedWordIndices.length === level.words.length,
  }
}
