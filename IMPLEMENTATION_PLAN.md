# Word-Mix — Implementation Plan

A beautiful, web-based Wordscapes-style word puzzle game. No login. Open the site → straight
into the game. Progress lives entirely in the browser (`localStorage`); clearing browser
storage wipes progress. Deployed to Cloudflare as static assets.

## Tech stack
- **Vite + React + TypeScript** — fast SPA, static output.
- **Tailwind CSS v4** (`@tailwindcss/vite`) + bespoke CSS for the game's signature look.
- **Zustand** (+ `persist` middleware) — game state persisted to `localStorage`.
- **Framer Motion** — juicy, satisfying animations.
- **Build-time level generator** (Node script) → `src/data/levels.json` (committed). Runtime
  needs no dictionary; each level self-contains its target + bonus words.
- **Cloudflare Workers static assets** (`wrangler deploy`, `assets` binding) → `*.workers.dev`.

## Stage 1: Scaffold & deploy smoke test — Status: In Progress
**Goal**: Vite+React+TS+Tailwind project that builds; a placeholder deployed live to Cloudflare.
**Success**: `npm run build` produces `dist/`; `wrangler deploy` returns a working URL.

## Stage 2: Level generation — Status: Not Started
**Goal**: Robust build-time generator producing ~200 interlocking crossword levels across 6
themed packs, with per-level bonus-word sets. Output committed as `src/data/levels.json`.
**Success**: Every level is fully connected, solvable, no duplicate targets, sane grid size;
bonus-word sets validated against a real dictionary.

## Stage 3: Core game engine + state — Status: Not Started
**Goal**: Zustand store (progress, coins, completed levels, bonus words, settings, stats) with
`localStorage` persistence + versioning. Word-validation logic, hint/coin economy.
**Success**: Forming a target word fills the grid; bonus words award coins; progress survives
reload and resets when storage is cleared.

## Stage 4: UI & visual polish — Status: Not Started
**Goal**: Letter wheel (drag/swipe select with connector line + live preview), crossword grid,
top bar (coins/level/menu), shuffle + hint, scenic themed backgrounds, full motion language,
level-complete celebration, stats screen, settings. Mobile-first, responsive, accessible.
**Success**: Looks stunning on phone + desktop; smooth touch + mouse input; matches DESIGN.md.

## Stage 5: Review, harden, deploy — Status: Not Started
**Goal**: Multi-agent code review (bugs, game-logic correctness, a11y, perf), apply fixes,
final build, deploy to Cloudflare, verify the live game, commit + push.
**Success**: Clean review, green build, playable live URL, work committed and pushed.
