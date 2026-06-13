import type { Level, WordMatch } from '../types'

/**
 * Classify a swiped word against the active level.
 * Pure: callers pass the sets of already-found words for O(1) dupe detection.
 */
export function classifyWord(
  rawWord: string,
  level: Level,
  solvedWords: Set<string>,
  foundBonus: Set<string>,
  bonusSet: Set<string>,
): WordMatch {
  const word = rawWord.toUpperCase()
  if (word.length < 3) return { kind: 'invalid' }

  const wordIndex = level.words.findIndex((w) => w.word === word)
  if (wordIndex !== -1) {
    if (solvedWords.has(word)) return { kind: 'dupe' }
    return { kind: 'grid', wordIndex }
  }

  if (bonusSet.has(word)) {
    if (foundBonus.has(word)) return { kind: 'dupe' }
    return { kind: 'bonus' }
  }

  return { kind: 'invalid' }
}
