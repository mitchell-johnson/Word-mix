# Word Mix

A beautiful, web-based word puzzle in the style of Wordscapes. Open the site and you're
**straight into the game** — no login, no accounts. Swipe across the letter wheel to form words
that fill an interlocking crossword; extra valid words pay bonus coins.

**▶ Play: https://word-mix.mitchell-125.workers.dev**

All progress lives in your browser (`localStorage`). Clearing your browser storage erases it —
there is no backend and nothing leaves the device.

## Features

- **210 hand-generated levels**: the campaign opens with a ten-level 4-letter ramp, then moves up to 5-letter wheels automatically; consecutive levels always have ≥50% different letters.
- **Pick your wheel size** in settings — **4, 5, or 6-letter modes**, each its own progression (your place in each is remembered), cycling through all six scenic themes.
- **Packed crosswords**: every recognizable word the letters allow is placed in the grid where it fits (avg ~12 words per level), so finds count toward the level instead of sitting in the bonus pile.
- **Swipe letter wheel** with a glowing connector trail, live word ticket, and shuffle.
- **Interlocking crosswords** with a satisfying fly-and-stamp animation as words land.
- **Bonus words & coins**, **letter / word hints**, and a **progress map**.
- **Six scenic themes**, frosted-glass UI, juicy spring motion, confetti celebrations.
- Web Audio sound effects, haptics, full **reduced-motion** support, mobile-first responsive.
- **Offline-friendly & installable** (PWA manifest + icons).

## Tech stack

- **Vite + React + TypeScript**, **Tailwind CSS v4**, **Zustand** (persisted), **Framer Motion**.
- Deployed as static assets to **Cloudflare Workers**.
- Levels are generated at **build time** into `src/data/levels.json`; the runtime ships no
  dictionary — each level self-contains its target and bonus words.

## Develop

```bash
npm install
npm run dev          # local dev server
npm run typecheck    # tsc --noEmit
npm run build        # production build → dist/
npm run preview      # serve the built app
```

## Level generation

```bash
npm run gen:levels   # regenerate src/data/levels.json
```

The generator (`scripts/generate-levels.mjs`) picks common base words, finds every recognizable
sub-word from a frequency-ranked whitelist, and packs as many as fit into a single connected
crossword with strict placement rules (no run-extension, no parallel adjacency, every wheel
letter used); leftovers become bonus words. Consecutive levels in every journey are guaranteed
≥50% different letters and no two levels share a letter set. It's deterministic (seeded) and
the constraints are verified at build time.

## Deploy

```bash
npm run deploy       # build + wrangler deploy to Cloudflare
```

## Tests

```bash
node scripts/smoke-test.mjs   # Playwright end-to-end: render, swipe-solve, bonus, complete, persistence
```
