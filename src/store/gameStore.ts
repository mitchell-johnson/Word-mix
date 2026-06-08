import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { PersistedState, LevelProgress, Settings, HintKind } from '../types'
import { ECONOMY, SCHEMA_VERSION, STORAGE_KEY, STORAGE_PREFIX, DEFAULT_SETTINGS, ZERO_STATS } from '../config'
import { getLevel, clampLevelId, TOTAL_LEVELS } from '../data/levels'
import { cellKey } from '../game/grid'
import { pickRevealLetterCell, pickRevealWordIndex } from '../game/hints'

// Fault-tolerant storage: degrade to an in-memory session instead of crashing on a failed write
// (localStorage quota, Safari private mode reporting ~0 quota, or storage disabled entirely).
const memoryFallback = new Map<string, string>()
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return memoryFallback.get(name) ?? null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {
      memoryFallback.set(name, value) // keep playing this session, just not persisted
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {
      memoryFallback.delete(name)
    }
  },
}

function emptyProgress(): LevelProgress {
  return { solvedWords: [], bonusWordsFound: [], revealedCells: [], completed: false, hintsUsed: 0 }
}

function initialPersisted(): PersistedState {
  const now = Date.now()
  return {
    schemaVersion: SCHEMA_VERSION,
    currentLevelId: 1,
    coins: ECONOMY.startingCoins,
    completedLevelIds: [],
    levelProgress: {},
    settings: { ...DEFAULT_SETTINGS },
    stats: { ...ZERO_STATS },
    createdAt: now,
    lastPlayedAt: now,
  }
}

/** Defensively normalize a (possibly old or partial) persisted blob into the current shape. */
function normalizePersisted(raw: unknown): PersistedState {
  const base = initialPersisted()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<PersistedState>
  const progress: Record<number, LevelProgress> = {}
  if (r.levelProgress && typeof r.levelProgress === 'object') {
    for (const [id, p] of Object.entries(r.levelProgress)) {
      const pp = p as Partial<LevelProgress>
      progress[Number(id)] = {
        solvedWords: Array.isArray(pp.solvedWords) ? pp.solvedWords : [],
        bonusWordsFound: Array.isArray(pp.bonusWordsFound) ? pp.bonusWordsFound : [],
        revealedCells: Array.isArray(pp.revealedCells) ? pp.revealedCells : [],
        completed: Boolean(pp.completed),
        hintsUsed: typeof pp.hintsUsed === 'number' ? pp.hintsUsed : 0,
      }
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    currentLevelId: clampLevelId(typeof r.currentLevelId === 'number' ? r.currentLevelId : 1),
    coins: typeof r.coins === 'number' && r.coins >= 0 ? r.coins : base.coins,
    completedLevelIds: Array.isArray(r.completedLevelIds) ? r.completedLevelIds.filter((n) => typeof n === 'number') : [],
    levelProgress: progress,
    settings: { ...DEFAULT_SETTINGS, ...(r.settings as Settings) },
    stats: { ...ZERO_STATS, ...(r.stats ?? {}) },
    createdAt: typeof r.createdAt === 'number' ? r.createdAt : base.createdAt,
    lastPlayedAt: typeof r.lastPlayedAt === 'number' ? r.lastPlayedAt : base.lastPlayedAt,
  }
}

export interface GameStore {
  persisted: PersistedState
  hydrated: boolean

  solveWord: (levelId: number, wordIndex: number) => void
  foundBonusWord: (levelId: number, word: string) => void
  completeLevel: (levelId: number) => void
  revealLetter: (levelId: number) => { row: number; col: number; letter: string } | null
  revealWord: (levelId: number) => number | null
  noteHintUsed: (kind: HintKind) => void
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void
  resetAllProgress: () => void
  _setHydrated: () => void
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      persisted: initialPersisted(),
      hydrated: false,

      solveWord: (levelId, wordIndex) => {
        const p = get().persisted
        const level = getLevel(levelId)
        const word = level?.words[wordIndex]?.word
        if (!word) return
        const prog = p.levelProgress[levelId] ?? emptyProgress()
        if (prog.solvedWords.includes(word)) return // idempotent
        set({
          persisted: {
            ...p,
            lastPlayedAt: Date.now(),
            levelProgress: { ...p.levelProgress, [levelId]: { ...prog, solvedWords: [...prog.solvedWords, word] } },
            stats: { ...p.stats, totalWordsSolved: p.stats.totalWordsSolved + 1 },
          },
        })
      },

      foundBonusWord: (levelId, rawWord) => {
        const p = get().persisted
        const word = rawWord.toUpperCase()
        const prog = p.levelProgress[levelId] ?? emptyProgress()
        if (prog.bonusWordsFound.includes(word)) return // idempotent
        const reward = ECONOMY.coinsPerBonusWord
        set({
          persisted: {
            ...p,
            lastPlayedAt: Date.now(),
            coins: p.coins + reward,
            levelProgress: {
              ...p.levelProgress,
              [levelId]: { ...prog, bonusWordsFound: [...prog.bonusWordsFound, word] },
            },
            stats: {
              ...p.stats,
              totalBonusWordsFound: p.stats.totalBonusWordsFound + 1,
              totalCoinsEarned: p.stats.totalCoinsEarned + reward,
            },
          },
        })
      },

      completeLevel: (levelId) => {
        const p = get().persisted
        const prog = p.levelProgress[levelId] ?? emptyProgress()
        if (prog.completed) return // idempotent — never double-pay
        const reward = ECONOMY.coinsPerLevel
        const completedLevelIds = p.completedLevelIds.includes(levelId)
          ? p.completedLevelIds
          : [...p.completedLevelIds, levelId].sort((a, b) => a - b)
        const nextLevel = Math.min(levelId + 1, TOTAL_LEVELS)
        set({
          persisted: {
            ...p,
            lastPlayedAt: Date.now(),
            coins: p.coins + reward,
            currentLevelId: Math.max(p.currentLevelId, nextLevel), // advance, never regress
            completedLevelIds,
            levelProgress: { ...p.levelProgress, [levelId]: { ...prog, completed: true } },
            stats: {
              ...p.stats,
              levelsCompleted: p.stats.levelsCompleted + 1,
              totalCoinsEarned: p.stats.totalCoinsEarned + reward,
            },
          },
        })
      },

      revealLetter: (levelId) => {
        const p = get().persisted
        const level = getLevel(levelId)
        if (!level || p.coins < ECONOMY.hintRevealLetterCost) return null
        const prog = p.levelProgress[levelId] ?? emptyProgress()
        const cell = pickRevealLetterCell(level, prog)
        if (!cell) return null
        const cost = ECONOMY.hintRevealLetterCost
        set({
          persisted: {
            ...p,
            lastPlayedAt: Date.now(),
            coins: Math.max(ECONOMY.minCoins, p.coins - cost),
            levelProgress: {
              ...p.levelProgress,
              [levelId]: { ...prog, revealedCells: [...prog.revealedCells, cellKey(cell.row, cell.col)], hintsUsed: prog.hintsUsed + 1 },
            },
            stats: { ...p.stats, hintsUsed: p.stats.hintsUsed + 1, totalCoinsSpent: p.stats.totalCoinsSpent + cost },
          },
        })
        return cell
      },

      revealWord: (levelId) => {
        const p = get().persisted
        const level = getLevel(levelId)
        if (!level || p.coins < ECONOMY.hintRevealWordCost) return null
        const prog = p.levelProgress[levelId] ?? emptyProgress()
        const wi = pickRevealWordIndex(level, prog)
        if (wi < 0) return null
        const word = level.words[wi].word
        const cost = ECONOMY.hintRevealWordCost
        set({
          persisted: {
            ...p,
            lastPlayedAt: Date.now(),
            coins: Math.max(ECONOMY.minCoins, p.coins - cost),
            levelProgress: {
              ...p.levelProgress,
              [levelId]: { ...prog, solvedWords: [...prog.solvedWords, word], hintsUsed: prog.hintsUsed + 1 },
            },
            stats: {
              ...p.stats,
              totalWordsSolved: p.stats.totalWordsSolved + 1,
              hintsUsed: p.stats.hintsUsed + 1,
              totalCoinsSpent: p.stats.totalCoinsSpent + cost,
            },
          },
        })
        return wi
      },

      noteHintUsed: () => {
        const p = get().persisted
        set({ persisted: { ...p, stats: { ...p.stats, hintsUsed: p.stats.hintsUsed + 1 } } })
      },

      setSetting: (k, v) => {
        const p = get().persisted
        set({ persisted: { ...p, settings: { ...p.settings, [k]: v } } })
      },

      resetAllProgress: () => {
        try {
          Object.keys(localStorage)
            .filter((key) => key.startsWith(STORAGE_PREFIX))
            .forEach((key) => localStorage.removeItem(key))
        } catch {
          /* storage unavailable — ignore */
        }
        set({ persisted: initialPersisted() })
      },

      _setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ persisted: s.persisted }),
      // Forward-only: on a version bump, route the old blob through normalize instead of discarding
      // it (the default behaviour when no migrate fn exists), so progress survives upgrades.
      migrate: (persistedState) => ({
        persisted: normalizePersisted((persistedState as { persisted?: unknown } | undefined)?.persisted ?? persistedState),
      }),
      merge: (incoming, current) => ({
        ...current,
        persisted: normalizePersisted((incoming as { persisted?: unknown } | undefined)?.persisted),
      }),
      onRehydrateStorage: () => (state) => {
        state?._setHydrated()
      },
    },
  ),
)
