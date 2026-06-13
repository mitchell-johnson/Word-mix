import { useGameStore } from '../store/gameStore'

/** Best-effort haptic buzz; gated by the `haptics` setting and platform support. */
export function buzz(pattern: number | number[]) {
  if (!useGameStore.getState().persisted.settings.haptics) return
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* ignore */
    }
  }
}
