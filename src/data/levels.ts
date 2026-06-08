// Typed loader over the generated levels.json. Adapts the generator's field names/casing
// (width/height/dir/lowercase) into the runtime Level shape (rows/cols/direction/UPPERCASE).

import raw from './levels.json'
import type { Level, PlacedWord, Direction } from '../types'

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
