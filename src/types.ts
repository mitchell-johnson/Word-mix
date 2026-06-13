// Shared types for Word-Mix.

export type Direction = 'across' | 'down'

/** Static, content-only level (adapted from the generated levels.json). */
export interface Level {
  id: number
  pack: number
  packName: string
  theme: string
  letters: string[] // UPPERCASE wheel pool; duplicates allowed & meaningful
  base: string // UPPERCASE pangram
  rows: number
  cols: number
  words: PlacedWord[] // solving ALL clears the level
  bonusWords: string[] // UPPERCASE, sorted; valid words not on the grid
}

export interface PlacedWord {
  word: string // UPPERCASE answer
  row: number // top-left-most letter (0-based, y)
  col: number // 0-based, x
  direction: Direction
}

/** Derived, in-memory only — never serialized. */
export interface GridCell {
  row: number
  col: number
  filled: boolean // false → renders as a gap (.cell--void)
  letter: string // UPPERCASE; meaningful when filled
  wordIndices: number[] // indices into Level.words passing through this cell
  revealed: boolean // true once a solved word covers this cell
}

/** Runtime view-model combining a Level with this player's progress. */
export interface ActiveLevelState {
  level: Level
  grid: GridCell[][]
  solvedWordIndices: number[]
  foundBonusWords: string[] // UPPERCASE
  isComplete: boolean
}

export type HintKind = 'revealLetter' | 'revealWord' | 'shuffle'

/** Wheel size the player chooses: only levels with this many letters are played. */
export type LetterMode = 4 | 5 | 6

export interface Settings {
  sound: boolean
  haptics: boolean
  reducedMotion: boolean
  autoShuffle: boolean
  letterMode: LetterMode
}

export interface LevelProgress {
  solvedWords: string[] // UPPERCASE
  bonusWordsFound: string[] // UPPERCASE
  revealedCells: string[] // "row,col" cells revealed by a letter hint
  completed: boolean
  hintsUsed: number
}

export interface LifetimeStats {
  levelsCompleted: number
  totalWordsSolved: number
  totalBonusWordsFound: number
  totalCoinsEarned: number
  totalCoinsSpent: number
  hintsUsed: number
}

export interface PersistedState {
  schemaVersion: number
  currentLevelId: number
  coins: number
  completedLevelIds: number[]
  levelProgress: Record<number, LevelProgress>
  settings: Settings
  stats: LifetimeStats
  createdAt: number
  lastPlayedAt: number
}

/** Classification result for a swiped word. */
export type WordMatch =
  | { kind: 'grid'; wordIndex: number }
  | { kind: 'bonus' }
  | { kind: 'dupe' }
  | { kind: 'invalid' }
