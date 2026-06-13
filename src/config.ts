import type { Settings, LifetimeStats, LetterMode } from './types'

// Economy — constants, never persisted (retunable via app update without a save migration).
export const ECONOMY = {
  startingCoins: 150,
  coinsPerLevel: 20, // on level completion
  coinsPerBonusWord: 5, // per first-found bonus word
  hintRevealLetterCost: 25, // reveal one letter in an unsolved word
  hintRevealWordCost: 60, // reveal an entire shortest unsolved word
  shuffleCost: 0, // free — never blocks a stuck player
  minCoins: 0,
} as const

export const SCHEMA_VERSION = 1
export const STORAGE_KEY = 'wordmix:v1:state'
export const STORAGE_PREFIX = 'wordmix:'

// pack id (1-based) → theme class + display name. Mirrors the generator's packs.
export const PACK_THEME: Record<number, string> = {
  1: 'theme-sunrise',
  2: 'theme-mint',
  3: 'theme-bubblegum',
  4: 'theme-cosmic',
  5: 'theme-tangerine',
  6: 'theme-aurora',
}

export const DEFAULT_SETTINGS: Settings = {
  sound: true,
  haptics: true,
  reducedMotion: false,
  autoShuffle: false,
  letterMode: 4,
}

// Selectable wheel sizes.
export const LETTER_MODES: LetterMode[] = [4, 5, 6]

// Scenic themes, in journey order. Each letter mode cycles through all six as you progress, so
// every mode gets the full visual variety regardless of which packs its levels came from.
export const THEME_ORDER = [
  'theme-sunrise',
  'theme-mint',
  'theme-bubblegum',
  'theme-cosmic',
  'theme-tangerine',
  'theme-aurora',
] as const

export const THEME_NAMES: Record<string, string> = {
  'theme-sunrise': 'Sunrise Bay',
  'theme-mint': 'Mint Lagoon',
  'theme-bubblegum': 'Bubblegum Dusk',
  'theme-cosmic': 'Cosmic Grape',
  'theme-tangerine': 'Tangerine Reef',
  'theme-aurora': 'Aurora Frost',
}

export const ZERO_STATS: LifetimeStats = {
  levelsCompleted: 0,
  totalWordsSolved: 0,
  totalBonusWordsFound: 0,
  totalCoinsEarned: 0,
  totalCoinsSpent: 0,
  hintsUsed: 0,
}
