import { useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import { useGameStore } from './store/gameStore'
import { useReducedMotion } from './lib/useActiveLevel'
import { getLevel, clampLevelId, TOTAL_LEVELS } from './data/levels'
import { ECONOMY, PACK_THEME, STORAGE_KEY } from './config'
import type { Settings } from './types'
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
  const currentLevelId = useGameStore((s) => s.persisted.currentLevelId)
  const completedIds = useGameStore((s) => s.persisted.completedLevelIds)
  const coins = useGameStore((s) => s.persisted.coins)
  const settings = useGameStore((s) => s.persisted.settings)
  const stats = useGameStore((s) => s.persisted.stats)
  const levelProgress = useGameStore((s) => s.persisted.levelProgress)
  const setSetting = useGameStore((s) => s.setSetting)
  const resetAllProgress = useGameStore((s) => s.resetAllProgress)
  const reduced = useReducedMotion()

  const [viewLevelId, setViewLevelId] = useState<number | null>(null)
  const [completeFor, setCompleteFor] = useState<number | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)

  // Land on the resume level once storage hydrates.
  useEffect(() => {
    if (hydrated && viewLevelId === null) setViewLevelId(clampLevelId(currentLevelId))
  }, [hydrated, viewLevelId, currentLevelId])

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

  const themeClass = PACK_THEME[getLevel(viewLevelId)?.pack ?? 1] ?? 'theme-sunrise'
  const paused = completeFor !== null || settingsOpen || mapOpen

  const handleNext = () => {
    const finished = completeFor ?? viewLevelId
    setCompleteFor(null)
    if (finished >= TOTAL_LEVELS) {
      setMapOpen(true) // finished the campaign — browse the journey
    } else {
      setViewLevelId(clampLevelId(finished + 1))
    }
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
          levelId={completeFor}
          coinsAwarded={ECONOMY.coinsPerLevel}
          bonusFound={levelProgress[completeFor]?.bonusWordsFound.length ?? 0}
          isLastLevel={completeFor >= TOTAL_LEVELS}
          reduced={reduced}
          onNext={handleNext}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          settings={settings}
          stats={stats}
          coins={coins}
          completed={completedIds.length}
          total={TOTAL_LEVELS}
          onToggle={(k: keyof Settings) => setSetting(k, !settings[k])}
          onReset={resetAllProgress}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {mapOpen && (
        <MapOverlay
          currentLevelId={currentLevelId}
          completedIds={completedIds}
          total={TOTAL_LEVELS}
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
