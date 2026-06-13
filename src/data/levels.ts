// Typed loader over the generated levels.json. Adapts the generator's field names/casing
// (width/height/dir/lowercase) into the runtime Level shape (rows/cols/direction/UPPERCASE).

import raw from './levels.json'
import type { Level, PlacedWord, Direction } from '../types'
import { THEME_ORDER } from '../config'

interface RawWord {
  word: string
  row: number
  col: number
  dir: Direction
}
interface RawLevel {
  id: number
  pack: number
  packName: string
  theme: string
  base: string
  letters: string[]
  width: number
  height: number
  words: RawWord[]
  bonusWords: string[]
}
interface RawData {
  version: number
  packs: { id: number; name: string; theme: string }[]
  levels: RawLevel[]
}

const data = raw as unknown as RawData

function adapt(l: RawLevel): Level {
  const words: PlacedWord[] = l.words.map((w) => ({
    word: w.word.toUpperCase(),
    row: w.row,
    col: w.col,
    direction: w.dir,
  }))
  return {
    id: l.id,
    pack: l.pack,
    packName: l.packName,
    theme: l.theme,
    letters: l.letters.map((c) => c.toUpperCase()),
    base: l.base.toUpperCase(),
    rows: l.height,
    cols: l.width,
    words,
    bonusWords: l.bonusWords.map((w) => w.toUpperCase()),
  }
}

const LEVELS: Level[] = data.levels.map(adapt)
const byId = new Map<number, Level>(LEVELS.map((l) => [l.id, l]))
const bonusSets = new Map<number, Set<string>>()

export const PACKS = data.packs
export const TOTAL_LEVELS = LEVELS.length

export function getLevel(id: number): Level | undefined {
  return byId.get(id)
}

/** Clamp an arbitrary id into the valid campaign range. */
export function clampLevelId(id: number): number {
  if (!Number.isFinite(id)) return 1
  return Math.min(Math.max(1, Math.floor(id)), TOTAL_LEVELS)
}

export function getBonusSet(id: number): Set<string> {
  let s = bonusSets.get(id)
  if (!s) {
    const lvl = byId.get(id)
    s = new Set(lvl ? lvl.bonusWords : [])
    bonusSets.set(id, s)
  }
  return s
}

export function allLevels(): Level[] {
  return LEVELS
}

// ---- Letter-mode (wheel size) navigation ----
// Each mode is an ordered journey of level ids. Modes 5 and 6 contain every level of that wheel
// size. Mode 4 — the default campaign — is a ten-level 4-letter ramp that then continues through
// the entire 5-letter journey, so the wheel automatically grows to 5 letters after level 10.
// Progress per mode is derived from the global completed set, so switching modes never loses
// your place (5-letter levels cleared in the campaign count in the 5-letter journey, and vice
// versa).

const idsBySize = new Map<number, number[]>()
for (const l of LEVELS) {
  const n = l.letters.length
  if (n >= 4 && n <= 6) {
    if (!idsBySize.has(n)) idsBySize.set(n, [])
    idsBySize.get(n)!.push(l.id)
  }
}
for (const list of idsBySize.values()) list.sort((a, b) => a - b)

const idsByMode = new Map<number, number[]>([
  [4, [...(idsBySize.get(4) ?? []), ...(idsBySize.get(5) ?? [])]],
  [5, idsBySize.get(5) ?? []],
  [6, idsBySize.get(6) ?? []],
])

export function levelsForMode(mode: number): number[] {
  return idsByMode.get(mode) ?? []
}

export function modeLevelCount(mode: number): number {
  return levelsForMode(mode).length
}

/** 1-based position of a level within its mode (0 if the level isn't in this mode). */
export function modeIndexOf(mode: number, id: number): number {
  return levelsForMode(mode).indexOf(id) + 1
}

/** First not-yet-completed level in a mode, or null if the mode is fully cleared. */
export function firstUnsolvedInMode(mode: number, completed: Set<number>): number | null {
  for (const id of levelsForMode(mode)) if (!completed.has(id)) return id
  return null
}

/** The level to resume/show for a mode: first unsolved, else the last (for replay/end states). */
export function currentLevelForMode(mode: number, completed: Set<number>): number {
  const seq = levelsForMode(mode)
  return firstUnsolvedInMode(mode, completed) ?? seq[seq.length - 1] ?? seq[0] ?? 1
}

/** Theme class for a position in a mode — cycles through all six themes across the mode. */
export function themeClassForMode(mode: number, modeIndex: number): string {
  const count = modeLevelCount(mode) || 6
  const segment = Math.max(1, Math.ceil(count / THEME_ORDER.length))
  const idx = Math.floor(Math.max(0, modeIndex - 1) / segment) % THEME_ORDER.length
  return THEME_ORDER[idx]
}
