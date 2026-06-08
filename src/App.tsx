import { useEffect, useMemo, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { useReducedMotion } from './lib/useActiveLevel'
import {
  currentLevelForMode,
  firstUnsolvedInMode,
  modeIndexOf,
  modeLevelCount,
  themeClassForMode,
} from './data/levels'
import { ECONOMY, STORAGE_KEY } from './config'
import type { LetterMode, Settings } from './types'
import { GameScreen } from './components/GameScreen'
import { Floaters } from './components/Floaters'
import { LevelCompleteOverlay } from './components/LevelCompleteOverlay'
import { SettingsSheet } from './components/SettingsSheet'
import { MapOverlay } from './components/MapOverlay'

function Splash({ themeClass }: { themeClass: string }) {
  return (
    <>
      <div className={`app-bg ${themeClass}`} />
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 52, letterSpacing: '0.02em' }}>
            Word Mix
          </div>
          <div className="coach-mark" style={{ marginTop: 10, opacity: 0.8, fontWeight: 600 }}>
            loading…
          </div>
        </div>
      </div>
    </>
  )
}

export default function App() {
  const hydrated = useGameStore((s) => s.hydrated)
  const completedIds = useGameStore((s) => s.persisted.completedLevelIds)
  const coins = useGameStore((s) => s.persisted.coins)
  const settings = useGameStore((s) => s.persisted.settings)
  const stats = useGameStore((s) => s.persisted.stats)
  const levelProgress = useGameStore((s) => s.persisted.levelProgress)
  const setSetting = useGameStore((s) => s.setSetting)
  const resetAllProgress = useGameStore((s) => s.resetAllProgress)
  const reduced = useReducedMotion()

  const mode = settings.letterMode
  const completedSet = useMemo(() => new Set(completedIds), [completedIds])

  const [viewLevelId, setViewLevelId] = useState<number | null>(null)
  const [completeFor, setCompleteFor] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)

  // Land on (and re-derive) the resume level once hydrated and whenever the mode changes.
  useEffect(() => {
    if (!hydrated) return
    const completed = new Set(useGameStore.getState().persisted.completedLevelIds)
    setViewLevelId(currentLevelForMode(mode, completed))
  }, [hydrated, mode])

  // Multi-tab: re-hydrate when another tab writes our key.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) void useGameStore.persist.rehydrate()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  if (!hydrated || viewLevelId === null) {
    return <Splash themeClass="theme-sunrise" />
  }

  const themeClass = themeClassForMode(mode, modeIndexOf(mode, viewLevelId))
  const paused = completeFor !== null || settingsOpen || mapOpen
  const completedInMode = completedIds.filter((id) => modeIndexOf(mode, id) > 0).length

  const handleNext = () => {
    setCompleteFor(null)
    const completed = new Set(useGameStore.getState().persisted.completedLevelIds)
    const next = firstUnsolvedInMode(mode, completed)
    if (next == null) setMapOpen(true) // mode fully cleared — browse the journey
    else setViewLevelId(next)
  }

  const handleSetMode = (m: LetterMode) => {
    setSetting('letterMode', m) // the mode-change effect re-points viewLevelId
    setSettingsOpen(false)
  }

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className={reduced ? 'no-motion' : undefined}>
        <div className={`app-bg ${themeClass}`} />
        <Floaters themeKey={themeClass} reduced={reduced} />

      <GameScreen
        key={viewLevelId}
        levelId={viewLevelId}
        paused={paused}
        onCompleted={(id) => setCompleteFor(id)}
        onOpenMap={() => setMapOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {completeFor !== null && (
        <LevelCompleteOverlay
          levelNumber={modeIndexOf(mode, completeFor)}
          coinsAwarded={ECONOMY.coinsPerLevel}
          bonusFound={levelProgress[completeFor]?.bonusWordsFound.length ?? 0}
          isLastLevel={modeIndexOf(mode, completeFor) >= modeLevelCount(mode)}
          reduced={reduced}
          onNext={handleNext}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          stats={stats}
          coins={coins}
          completed={completedInMode}
          total={modeLevelCount(mode)}
          onToggle={(k: keyof Settings) => setSetting(k, !settings[k])}
          onSetLetterMode={handleSetMode}
          onReset={resetAllProgress}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {mapOpen && (
        <MapOverlay
          mode={mode}
          currentLevelId={currentLevelForMode(mode, completedSet)}
          completedIds={completedIds}
          onPick={(id) => {
            setMapOpen(false)
            setViewLevelId(id)
          }}
          onClose={() => setMapOpen(false)}
        />
      )}
      </div>
    </MotionConfig>
  )
}
