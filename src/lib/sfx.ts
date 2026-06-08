// Tiny Web Audio synth for satisfying, asset-free sound effects. Respects the `sound` setting.

import { useGameStore } from '../store/gameStore'

let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function soundOn(): boolean {
  return useGameStore.getState().persisted.settings.sound
}

interface Tone {
  freq: number
  dur: number
  type?: OscillatorType
  gain?: number
  delay?: number
  glideTo?: number
}

function play(tones: Tone[]) {
  const ac = audio()
  if (!ac) return
  const now = ac.currentTime
  for (const t of tones) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    const start = now + (t.delay ?? 0)
    const peak = t.gain ?? 0.14
    osc.type = t.type ?? 'sine'
    osc.frequency.setValueAtTime(t.freq, start)
    if (t.glideTo) osc.frequency.exponentialRampToValueAtTime(t.glideTo, start + t.dur)
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(peak, start + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur)
    osc.connect(g).connect(ac.destination)
    osc.start(start)
    osc.stop(start + t.dur + 0.02)
  }
}

// Pentatonic note ladder for rising select feedback.
const LADDER = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51]

export function sfxSelect(step: number) {
  if (!soundOn()) return
  play([{ freq: LADDER[Math.min(step, LADDER.length - 1)], dur: 0.12, type: 'triangle', gain: 0.1 }])
}

export function sfxValid() {
  if (!soundOn()) return
  play([
    { freq: 659.25, dur: 0.14, type: 'triangle', gain: 0.12 },
    { freq: 987.77, dur: 0.18, type: 'triangle', gain: 0.12, delay: 0.08 },
  ])
}

export function sfxBonus() {
  if (!soundOn()) return
  play([
    { freq: 880, dur: 0.1, type: 'sine', gain: 0.12 },
    { freq: 1318.51, dur: 0.16, type: 'sine', gain: 0.12, delay: 0.07 },
  ])
}

export function sfxInvalid() {
  if (!soundOn()) return
  play([{ freq: 220, dur: 0.18, type: 'sawtooth', gain: 0.08, glideTo: 160 }])
}

export function sfxDupe() {
  if (!soundOn()) return
  play([{ freq: 440, dur: 0.12, type: 'sine', gain: 0.08 }])
}

export function sfxHint() {
  if (!soundOn()) return
  play([{ freq: 740, dur: 0.16, type: 'sine', gain: 0.1, glideTo: 1100 }])
}

export function sfxComplete() {
  if (!soundOn()) return
  const seq = [523.25, 659.25, 783.99, 1046.5]
  play(seq.map((freq, i) => ({ freq, dur: 0.28, type: 'triangle' as OscillatorType, gain: 0.13, delay: i * 0.1 })))
}
