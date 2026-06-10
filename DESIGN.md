Now I have the full picture. The package.json confirms React 19, Zustand 5, Framer Motion, Tailwind 4 (Vite plugin), Wrangler deploy, and `an-array-of-english-words` for the BROAD list. Note the output path question from the critique: `gen:levels` has no redirect, and `an-array-of-english-words@^2.0.0` is present. I'll fold these realities in.

Here is the complete DESIGN.md.

# WORDMIX — Engineering Design Specification

**Status:** Source of truth, v1 · **Audience:** Engineers building the game · **Stack:** React 19 + TypeScript + Vite + Tailwind v4 + Zustand 5 + Framer Motion · **Deploy:** Static SPA on Cloudflare · **Auth:** None · **Persistence:** `localStorage` only

WordMix is a Wordscapes-style word puzzle. The player swipes letters on a circular wheel to form words that fill a crossword grid; extra valid words pay bonus coins. Levels are static, generated at build time. All progress lives in the browser. There is no login, no backend, no network dependency at runtime beyond the initial static asset fetch.

This document is the single, implementation-ready spec. It folds the corrected level-generation algorithm (all critique fixes applied inline), the finalized visual system, and the data/persistence model into one coherent build plan.

---

## Table of Contents

1. [Product Overview & UX Flow](#1-product-overview--ux-flow)
2. [Visual System](#2-visual-system)
3. [Component Architecture](#3-component-architecture)
4. [Game State & Persistence](#4-game-state--persistence)
5. [Level-Generation Algorithm (corrected)](#5-level-generation-algorithm-corrected)
6. [Word-List Sourcing](#6-word-list-sourcing)
7. [Build & Deploy Notes](#7-build--deploy-notes)
8. [Build Order & Milestones](#8-build-order--milestones)

---

## 1. Product Overview & UX Flow

### 1.1 The core loop

1. The player sees a **crossword grid** of debossed empty cells and a **letter wheel** of 5–7 tiles at the bottom.
2. They **swipe across tiles** to spell a word; a connector trail draws between selected tiles and a floating **word ticket** shows the forming word.
3. On release:
   - **Valid grid word** → its letters fly from the wheel and **stamp** into the crossword. Cells rise from debossed to raised.
   - **Valid bonus word** (real word, not on the grid) → coins awarded, the **bonus jar** fills.
   - **Invalid** → gentle coral shake, tiles reset, no penalty.
   - **Already found** → blue "already found" hint, the existing word pulses, no penalty.
4. When **every grid word** is solved, the level completes: confetti, a gold wax-seal stamp, stars, and a coin payout, then auto-advance is offered.

This is a single-screen game. There is no level select gate on the critical path — the app resumes directly into the player's current level.

### 1.2 Screens & routes

The app is effectively single-route (no router library required). UI is driven by store state and modal flags:

| Surface | Trigger | Notes |
|---|---|---|
| **Game screen** | Default / app boot | The only persistent surface. Resumes into `currentLevelId`. |
| **Level complete overlay** | All grid words solved | Modal over the game screen. Skippable on tap. |
| **Pack/map overlay** (optional v1.1) | Tap level pill | Read-only progress view; not required for core loop. |
| **Settings sheet** | Tap gear in top bar | Sound, music, haptics, reduced motion, auto-shuffle, reset progress. |
| **Pause/menu sheet** | Tap menu | Resume, settings, how-to. |

### 1.3 First-run & resume

- **First visit:** no persisted store exists. Boot seeds `initialState` (`currentLevelId = 1`, `coins = 100`, `createdAt = now`) and lands the player on Level 1. A brief one-time inline coach mark ("Swipe the letters") fades in on the wheel.
- **Returning visit:** boot reads the persisted store, takes `currentLevelId`, rebuilds the in-memory grid from static level content + saved progress, and routes straight into that level. No menu.

### 1.4 Onboarding

Onboarding is diegetic and minimal — no separate tutorial screens. Level 1 (Pack 1 "Sprouts", 5-letter base, 4 short targets) is the tutorial. A pulsing finger-trace hint plays once on the wheel until the player completes their first swipe, then never again (`stats.totalWordsSolved > 0`).

### 1.5 Economy (player-facing rules)

All values are constants in `src/config/economy.ts` (never persisted, so they can be retuned via app update without a save migration):

```ts
export const ECONOMY = {
  startingCoins: 100,
  coinsPerLevel: 20,            // paid on level completion
  coinsPerBonusWord: 5,         // paid per first-found bonus word
  coinsPerWordFirstSolve: 0,    // grid words are the objective, not a reward source
  dailyBonusCoins: 25,          // first play of a new calendar day
  hintRevealLetterCost: 25,     // reveal one not-yet-shown letter in any unsolved word
  hintRevealWordCost: 60,       // reveal an entire shortest unsolved word (~2.4x a letter = deliberate splurge)
  shuffleCost: 0,               // free, to encourage exploration; never blocks a stuck player
  minCoins: 0,                  // coins never go negative
  maxCoinsDisplay: 99999,
} as const;
```

**Balance rationale:** Starting 100 coins buys ~4 letter hints or ~1.6 word hints before the player must earn. `coinsPerLevel (20)` + `coinsPerBonusWord (5)` keeps a steady-but-finite supply so hints feel earned. Grid words pay 0 because solving them is the win condition, not a faucet — only **bonus words** and **level completion** pay out.

### 1.6 Accessibility & motion

- **`prefers-reduced-motion`** (or the explicit Settings toggle) disables confetti, ambient floaters, fly-arcs, and breathing animations; functional state changes still occur via 150 ms fades.
- Tap targets ≥ 44px. Wheel tiles are 26% of the hub (≈65px at the 250px hub cap, ≈53px on a 320px screen; still ≥ 44px tap target).
- All text meets ≥ 4.5:1 contrast (white on scenic gradients; deep-violet ink on light tiles/cards — see §2).
- Haptics (`navigator.vibrate`) are best-effort and gated by the `haptics` setting.

---

## 2. Visual System

**"Neon-Glass Candy"** — vivid, playful, broadly appealing. The aesthetic spine: **deep saturated living backdrops → frosted glass UI → one candy gradient as the hero color move → letters that physically fly and *stamp* into the crossword → juicy spring motion, with gold reserved for reward.**

### 2.0 Foundational principles

1. **Glass over color, never color over glass.** Every interactive surface (cards, chips, wheel hub, modals, the answer board) is a frosted `backdrop-blur` panel floating on a vivid scenic gradient. The gradient supplies energy; the glass supplies the calm needed to read words.
2. **One hero gradient per moment.** The active word ticket, the valid-find pulse, the flying letters, and the level-complete burst all use the *same* `--grad-candy`. This single repeated color move is the brand.
3. **Two distinct "warm" tokens — never conflate them.** `--accent` is the *theme* color (re-tints connector, glows, sparkles per pack). `--c-gold` is *reward* gold (coins, stars, bonus, wax seal) and is **constant across every theme** so value always reads the same.
4. **Spring for anything the finger touches; long linear loops for ambient.** Tile selection, word landing, shuffle, stamps = spring. Backgrounds/floaters = 6–20s linear/ease loops.
5. **Depth via layered light, not heavy borders.** Tiles get a top inner highlight + a colored ambient "glow shadow." Borders are 1px translucent white, never gray.
6. **The grid changes material.** Empty cells are *debossed* (pressed into the glass plate); filled cells *rise out* as solid cream tiles. Watching a letter go recessed-empty → raised-filled is the core satisfaction loop.
7. **No pure black text.** Text ink is deep violet (`#2A1F4A`), never `#000`. White only on scenic/glass; ink only on light tiles/cards.
8. **Always honor `prefers-reduced-motion`.**

### 2.1 Color tokens

Define on `:root`; mirror in Tailwind theme (§2.9).

```css
:root {
  /* Brand */
  --c-primary:      #7C3AED;   /* electric violet — brand core, buttons */
  --c-primary-600:  #6D28D9;
  --c-primary-glow: #A855F7;

  /* Signature candy gradient (THE hero — chip/flying letters/celebrate) */
  --grad-candy: linear-gradient(135deg, #FF4D8D 0%, #FF6FA3 28%, #C44BE6 64%, #7C3AED 100%);

  /* Reward gold — CONSTANT across all themes (coins, stars, bonus, wax seal) */
  --c-gold:      #FFC53D;
  --c-gold-deep: #F59E0B;   /* gold shadow/edge/engraving */
  --c-gold-glow: #FFE08A;   /* gold highlight */
  --grad-gold: radial-gradient(120% 120% at 30% 25%, #FFE08A 0%, #FFC53D 55%, #F59E0B 100%);

  /* Status */
  --c-success:      #2FD98B;   /* valid word — mint */
  --c-success-glow: #6FFFC0;
  --c-error:        #FF5C6C;   /* invalid — coral (never harsh red) */
  --c-info:         #6FA8FF;   /* "already found" — calm blue */
  --c-bonus:        #FFB020;   /* bonus tiles & badge — amber */

  /* Glass surfaces */
  --glass-fill:        rgba(255,255,255,0.14);
  --glass-fill-2:      rgba(255,255,255,0.22);   /* raised */
  --glass-stroke:      rgba(255,255,255,0.35);   /* 1px luminous edge */
  --glass-stroke-soft: rgba(255,255,255,0.18);
  --scrim:             rgba(20,10,40,0.55);       /* modal backdrop */

  /* Solid surfaces (rare) */
  --surface-light:  #FFFFFF;
  --surface-raised: #FBF7FF;   /* faint violet-white */
  --surface-dark:   #1A1030;

  /* Text */
  --text-on-light:   #2A1F4A;   /* deep violet body on cream/white (NOT black) */
  --text-on-light-2: #6B5B8A;   /* muted on light only */
  --text-on-dark:    #FFFFFF;   /* on scenic/glass */
  --text-on-dark-2:  rgba(255,255,255,0.72);
  --tile-ink:        #3A1F6B;   /* letter color on cream tiles (AAA on white) */

  /* Per-theme accent — injected by .theme-* class (default = sunrise) */
  --accent: #FF9F45;

  /* Easings */
  --ease-spring: cubic-bezier(.34,1.56,.64,1);   /* overshoot — touch, pops, stamps */
  --ease-soft:   cubic-bezier(.22,1,.36,1);      /* UI moves, flights */
}
```

**Text rules:** white on scenic/glass; ink (`--text-on-light` / `--tile-ink`) inside cream tiles, the board plate, and modals. Never put `--text-on-light-2` on glass. **Gold rule:** `--c-gold` only for value/reward; ordinary chrome uses glass + `--accent`.

### 2.2 Six scenic background themes

Each theme maps to one pack and sets `--accent`. The background is a fixed full-viewport layer `.app-bg` (`fixed inset-0 -z-10`) holding a base `linear-gradient` sky plus `radial-gradient` light blooms, comma-stacked (first listed = top layer). White text passes ≥ 4.5:1 on all six because every gradient stays in the medium-to-dark saturation band.

**Theme transition:** entering a new pack cross-fades `.app-bg` over **900 ms ease-in-out** while the board plate does a soft `scale(0.98 → 1)` settle.

```css
/* Pack 1 — Sunrise Bay (garden, warm onboarding) */
.theme-sunrise {
  --accent: #FF9F45;
  background:
    radial-gradient(120% 80% at 50% 8%, rgba(255,221,148,.55) 0%, rgba(255,221,148,0) 55%),
    linear-gradient(180deg, #FF8E6E 0%, #FF6FA3 38%, #8A5BE2 78%, #4B3CA7 100%);
}
/* Ambient: sun-bloom radial breathes scale 1→1.06, opacity .55→.7, 9s ease-in-out alt + 3–4 rising specks */

/* Pack 2 — Mint Lagoon (flowers, fresh & calm) */
.theme-mint {
  --accent: #2FD9B5;
  background:
    radial-gradient(110% 75% at 80% 12%, rgba(167,255,235,.5) 0%, rgba(167,255,235,0) 50%),
    linear-gradient(165deg, #34E0C4 0%, #1FB6C9 40%, #2C7FD6 72%, #2A4D9E 100%);
}
/* Ambient: horizontal caustics shimmer — white radial drifting translateX(-6%→6%), 14s linear alt */

/* Pack 3 — Bubblegum Dusk (forest, signature candy hero) */
.theme-bubblegum {
  --accent: #FF4D8D;
  background:
    radial-gradient(120% 85% at 50% 100%, rgba(255,120,200,.5) 0%, rgba(255,120,200,0) 60%),
    linear-gradient(180deg, #6A3CE0 0%, #B14BE6 35%, #FF5FB0 70%, #FF8E6E 100%);
}
/* Ambient: bottom ground-glow radial (behind wheel) pulses opacity .4→.6, 6s.
   Marquee theme; --accent matches --grad-candy's lead pink so the moment unifies. */

/* Pack 4 — Cosmic Grape (desert, moody premium) */
.theme-cosmic {
  --accent: #9B8CFF;
  background:
    radial-gradient(90% 60% at 25% 20%, rgba(123,97,255,.5) 0%, rgba(123,97,255,0) 55%),
    radial-gradient(80% 60% at 85% 75%, rgba(255,77,141,.32) 0%, rgba(255,77,141,0) 60%),
    linear-gradient(160deg, #1B1147 0%, #3A1E6E 45%, #5B2A8C 75%, #2A1454 100%);
}
/* Ambient: 12 tiny 1–2px white dots, twinkle on 2–4s staggered loops + 1 nebula radial over 20s */

/* Pack 5 — Tangerine Reef (mountain, high energy) */
.theme-tangerine {
  --accent: #FFC400;
  background:
    radial-gradient(120% 70% at 70% 6%, rgba(255,214,120,.5) 0%, rgba(255,214,120,0) 50%),
    linear-gradient(175deg, #FF7A18 0%, #FF4D6D 42%, #C42BB0 74%, #6A1FA0 100%);
}
/* Ambient: warm heat-haze overlay, opacity 0→.15→0 over 10s.
   NOTE: --accent (#FFC400) is near reward gold — keep coins/stars on --c-gold regardless;
   the connector still reads as theme via its white→accent gradient + glow. */

/* Pack 6 — Aurora Frost (space, cool prestige finale) */
.theme-aurora {
  --accent: #5FF0C9;
  background:
    radial-gradient(100% 70% at 30% 10%, rgba(95,240,201,.4) 0%, rgba(95,240,201,0) 55%),
    radial-gradient(90% 60% at 75% 30%, rgba(120,160,255,.4) 0%, rgba(120,160,255,0) 55%),
    linear-gradient(180deg, #0B2A4A 0%, #134E6F 40%, #1B7A8C 70%, #0E3B52 100%);
}
/* Ambient: aurora ribbon — wide translucent green-blue band, upper third, skewed,
   slow translate + opacity shift over 16s ease-in-out alt. Premium showpiece. */
```

### 2.3 Typography

Two Google Fonts. **Fredoka** (rounded, chunky) for display/letters/numbers; **Plus Jakarta Sans** for UI body/labels.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
```
```css
:root {
  --font-display: 'Fredoka', system-ui, sans-serif;
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
}
```

| Use | Font | Weight | Size (mobile) | Tracking | Notes |
|---|---|---|---|---|---|
| Letter tiles (wheel & grid) | Fredoka | 600 | 12.6cqw (≈22–31px) | 0.01em | Uppercase, the star |
| Word-preview ticket | Fredoka | 700 | 24px | 0.1em | Uppercase, wide |
| Level title / "Level 24" | Fredoka | 700 | 22px | 0 | On glass pill |
| Coin / score numbers | Fredoka | 600 | 18px | 0 | `font-variant-numeric: tabular-nums` |
| "LEVEL COMPLETE!" banner | Fredoka | 700 | clamp 34–48px | 0.02em | Gradient-clipped (`--grad-candy`) |
| Buttons (Play, Shuffle) | Plus Jakarta | 800 | 16px | 0.02em | Uppercase optional |
| Body / hints / tooltips | Plus Jakarta | 500–600 | 15px | 0 | |
| Tiny labels / pack names | Plus Jakarta | 700 | 12px | 0.08em | Uppercase |

Headings: `text-rendering: optimizeLegibility; line-height: 1.05`. All tile/ticket/grid glyphs `text-transform: uppercase; -webkit-font-smoothing: antialiased`.

### 2.4 Letter tile & grid cell styling

**Wheel tile — glossy candy button**

```css
.wheel-tile {
  width: 26%; aspect-ratio: 1;          /* 26% of the hub — ≈65px at the 250px cap */
  border-radius: 50%;
  display: grid; place-items: center;
  font-family: var(--font-display); font-weight: 600; font-size: 12.6cqw;
  color: var(--tile-ink); text-transform: uppercase;
  text-shadow: 0 1px 0 rgba(255,255,255,0.85);   /* letterpress emboss */
  background:
    radial-gradient(48% 36% at 32% 22%, rgba(255,255,255,1), rgba(255,255,255,0) 72%),
    linear-gradient(180deg, #FFFFFF 0%, #F6EFFF 55%, #ECDFFF 100%);
  border: 1px solid rgba(255,255,255,0.95);
  box-shadow:
    inset 0 2px 3px rgba(255,255,255,0.95),      /* top gloss */
    inset 0 -5px 9px rgba(124,58,237,0.16),      /* candy inner shade */
    0 8px 18px rgba(40,16,80,0.32),              /* drop */
    0 3px 12px color-mix(in srgb, var(--accent) 28%, transparent),  /* accent glow */
    0 0 0 5px rgba(255,255,255,0.07);            /* faint halo on glass */
  transition: transform .12s var(--ease-spring), box-shadow .12s;
  user-select: none; touch-action: none;
}
.wheel-tile--selected {                          /* while swiping */
  color: #fff;
  text-shadow: 0 2px 8px rgba(110,16,80,0.5);
  background:
    radial-gradient(50% 38% at 32% 20%, rgba(255,255,255,0.5), rgba(255,255,255,0) 70%),
    var(--grad-candy);
  border-color: rgba(255,255,255,0.85);
  transform: scale(1.12);
  box-shadow:
    inset 0 2px 4px rgba(255,255,255,0.6),
    inset 0 -5px 9px rgba(90,18,120,0.35),
    0 10px 26px rgba(255,77,141,0.6),            /* candy glow */
    0 0 0 4px rgba(255,255,255,0.28);
}
```

**Grid cells — debossed-empty → raised-filled (core loop)**

```css
/* EMPTY — debossed ghost slot pressed into the board plate */
.cell {
  width: var(--cell); height: var(--cell);
  border-radius: 10px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.16);
  box-shadow:
    inset 0 2px 3px rgba(40,16,80,0.20),         /* top inner shadow = pressed-in */
    inset 0 -1px 1px rgba(255,255,255,0.18);
  display: grid; place-items: center;
  font-family: var(--font-display); font-weight: 600; font-size: 22px;
  color: transparent;
}
.cell--void { background: transparent; border: 0; box-shadow: none; }  /* non-cell hole */

/* FILLED — solid cream tile risen out of the plate */
.cell--filled {
  background: linear-gradient(180deg, #FFFFFF 0%, #F1E9FF 100%);
  border-color: rgba(255,255,255,0.95);
  color: var(--tile-ink);
  box-shadow:
    inset 0 2px 2px rgba(255,255,255,0.95),
    inset 0 -2px 4px rgba(124,58,237,0.10),
    0 4px 10px rgba(40,16,80,0.22);              /* casts shadow = raised */
}
.cell--just-filled { animation: cellPop .42s var(--ease-spring); }      /* word that just landed */
.cell--seed  { box-shadow: 0 0 0 1px var(--c-gold-deep), 0 0 0 4px rgba(255,197,61,0.30), 0 4px 10px rgba(40,16,80,0.22); }
.cell--bonus { box-shadow: inset 0 2px 2px rgba(255,255,255,.95), 0 0 0 2px var(--c-bonus); }
```

**Responsive sizing & the board plate.** Cells auto-scale via a CSS var so any grid fits any phone:

```css
:root { --cell: clamp(30px, (100vw - 56px) / var(--grid-cols, 7), 50px); }

.board-plate {                                   /* the frosted crossword plate */
  border-radius: 28px;
  background: var(--glass-fill);
  border: 1px solid var(--glass-stroke-soft);
  box-shadow: 0 12px 30px rgba(20,10,40,0.30), inset 0 1px 0 rgba(255,255,255,0.35);
  backdrop-filter: blur(16px) saturate(130%);
  padding: 18px;
}
```

`--grid-cols` is set per level from `level.cols` so found words surface *through* glass against the live scene.

### 2.5 The letter wheel

**Layout.** Circular glass hub anchored bottom-center, `min(64vw, 250px)` diameter. Letters sit on a ring at radius = 33% of the hub via trig (tiles are 26% wide, leaving a 4%-of-hub inset between tile edges and the wheel rim):

```
θ = -90° + i·(360 / n)          // first letter at top
x = 50% + R·cos(θ)
y = 50% + R·sin(θ)              // R = 33% of hub width (RING = 0.33 in wheelGeometry.ts)
```

Hub center holds the **Shuffle** button (circular glass, rotate-arrows icon).

```css
.wheel-hub {
  border-radius: 50%;
  background: radial-gradient(80% 80% at 50% 35%, rgba(255,255,255,0.22), rgba(255,255,255,0.07));
  border: 1px solid var(--glass-stroke-soft);
  backdrop-filter: blur(18px) saturate(140%);
  box-shadow:
    inset 0 1px 1px rgba(255,255,255,0.4),
    0 -8px 40px rgba(0,0,0,0.25);                /* lifts the scene above it */
}
```

**Selection connector — the "Candy Connector Trail" + living shimmer.** A single full-hub `<svg>` beneath the tiles. Selected tile centers are pushed into a `<polyline>`; the live segment to the fingertip is a separate `<line>`.

```css
.connector {
  fill: none;
  stroke: url(#connGrad);          /* SVG gradient: var(--accent) → white */
  stroke-width: 12; stroke-linecap: round; stroke-linejoin: round;
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--accent) 70%, transparent));
  opacity: 0.9;
  transition: stroke-width .15s var(--ease-soft);
}
.connector--charging { stroke-width: 14; }   /* eases up as more letters connect */
.connector-node { fill: var(--accent); }     /* r=6 dot under each visited tile */
.connector-shimmer {                          /* living shimmer: traveling white dashes */
  stroke: rgba(255,255,255,.75); stroke-width: 12; fill: none;
  stroke-dasharray: 2 16; animation: dash 1.2s linear infinite;
}
@keyframes dash { to { stroke-dashoffset: -18; } }
```
```html
<linearGradient id="connGrad" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="var(--accent)"/>
  <stop offset="1" stop-color="#FFFFFF"/>
</linearGradient>
```

`navigator.vibrate(6)` fires on each new tile hit (when haptics enabled).

**Word ticket — the material-changing preview.** A floating glass pill that grows letter-by-letter and *changes material to telegraph the result before it resolves*.

```css
.word-chip {
  display: inline-flex; gap: 1px; padding: 8px 18px; border-radius: 999px;
  font-family: var(--font-display); font-weight: 700; font-size: 24px; line-height: 1.1;
  letter-spacing: 0.1em; text-transform: uppercase; color: #fff;
  background: rgba(255,255,255,0.12);
  border: 1px solid var(--glass-stroke);
  backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
  transition: background .2s, box-shadow .2s, transform .2s var(--ease-spring);
}
.word-chip--valid   { background: var(--grad-candy);                     box-shadow: 0 8px 28px rgba(255,77,141,0.5); }
.word-chip--bonus   { background: linear-gradient(135deg,#FFC53D,#FFB020); box-shadow: 0 8px 28px rgba(255,176,32,0.5); }
.word-chip--dupe    { background: color-mix(in srgb, var(--c-info) 80%, transparent); }   /* already found */
.word-chip--invalid { background: rgba(255,92,108,0.85); }                                /* + shake */
.word-chip-letter   { animation: popIn .18s var(--ease-spring); }
@keyframes popIn { from{transform:scale(.6);opacity:0} to{transform:scale(1);opacity:1} }
```

Ticket hidden (`opacity:0; translateY(6px)`) when no letters are selected.

### 2.6 Motion language

Tokens: `--ease-spring` (overshoot) and `--ease-soft`. Use Framer Motion where "spring" is noted; else CSS. **All of §2.6 honors `prefers-reduced-motion`** → disable confetti/floaters/fly-arcs/breathing, substitute 150 ms fades, keep functional state changes.

**Word fills into grid (core loop — fly + stamp)**
1. Ticket flashes `--grad-candy`, scale-pops `1 → 1.12 → 1` (**180 ms**).
2. Each letter **flies** from its wheel tile to its destination cell as a candy chip with a slight arc, staggered **40 ms**, **320 ms** each, `--ease-soft`.
3. On landing, the cell goes debossed → **`cellPop` stamp**: `scale(.4) → 1.12 → 1` (**420 ms**, spring) + one-frame white flash overlay (opacity .8→0, 220 ms) + a faint dust-puff radial fade (180 ms).

```css
@keyframes cellPop { 0%{transform:scale(.4)} 60%{transform:scale(1.12)} 100%{transform:scale(1)} }
```

**Bonus word reward (jar fills)**
- Ticket morphs amber, shoots toward the **Bonus jar** in the top bar; the jar **fills by one notch** with gold and does a quick wobble (rotate ±6°, 300 ms).
- `+N` coin burst: 3–5 `--grad-gold` coin sprites spring outward then arc into the coin counter (**600 ms**, spring, 30 ms stagger). Counter punches `scale 1 → 1.25 → 1` (260 ms) and rolls up.
- Amber-glass toast drops from top: "BONUS! +N" — in 300 ms, rest 900 ms, out 250 ms.

**Level complete (stamp, ~2.2 s, skippable on tap)**
1. Scrim fades in (200 ms).
2. **Celebration particles — default:** warm candy confetti (40–60 pieces in theme accent + candy palette, gravity + rotation, 1.8 s). *Calm-mode variant* (auto under reduced-motion, or a "reduced FX" setting): slow upward gold light-motes (12 particles, 2.5 s).
3. Center **glass trophy card** springs up from `scale(.7), y+40` (420 ms, spring).
4. **Gold wax-seal stamp** thumps onto the card: `scale(1.6 → 1)` + `rotate(-8° → 0)` (260 ms, soft thud shadow) — the recurring brand "press."
5. **"LEVEL COMPLETE!"** gradient-clipped Fredoka, per-letter rise stagger (40 ms each, 300 ms).
6. **3 stars** stamp in one-by-one (`scale 1.6 → 1` + gold radial flash + 8 ms haptic, 220 ms apart).
7. Coin reward counts up over 800 ms, counter-punch every ~5 coins.
8. Grid does a left→right gold shimmer sweep (moving gradient mask) underneath.
9. "Next" glass button **breathes** (`scale 1 ↔ 1.04`, 1.4 s loop).

**Invalid / already-found (gentle, never punishing)**
- **Invalid:** ticket → coral, horizontal shake, connector flashes coral then dissolves (opacity→0, 180 ms), tiles spring back. 20 ms haptic.
- **Already found:** ticket → blue, **no shake**; a small "Already found" label fades in (160 ms, holds 700 ms); the existing grid word does one gentle gold edge-pulse. No penalty.

```css
.shake { animation: chipShake .3s ease-in-out; }
@keyframes chipShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-6px)} 80%{transform:translateX(6px)} }
```

**Wheel shuffle**
1. Shuffle icon spins `rotate(0 → 360deg)` (400 ms, soft).
2. Tiles fade →0 + `scale .7` toward hub center (140 ms), recompute angles, spring back out (360 ms, spring, 25 ms stagger).
3. Hub breathes `scale 1 → 1.03 → 1` (300 ms). 8 ms haptic. Connector/ticket clear instantly.

**Hint reveal:** one cell stamps in (debossed→raised) with a gold glint sweep; coin counter decrements with a red-tinted punch.

**Timing summary**

| Event | Duration | Easing |
|---|---|---|
| Tile select pop | 120ms | spring |
| Ticket letter add | 180ms | spring |
| Word → grid fly | 320ms/letter, 40ms stagger | soft |
| Cell stamp on land | 420ms | spring |
| Invalid shake | 300ms | ease-in-out |
| Bonus coin burst | 600ms, 30ms stagger | spring |
| Shuffle | 400 + 360ms | soft + spring |
| Wax-seal stamp | 260ms | spring |
| Level complete (full) | ~2200ms | mixed |
| CTA breath | 1400ms loop | ease-in-out |
| Ambient backgrounds | 6–20s | linear / ease alternate |

### 2.7 Signature distinctive details (implement all six)

1. **Letters physically fly and *stamp* into the crossword** — the wheel→grid kinetic link plus the debossed→raised material change is the central satisfaction loop.
2. **The Candy Connector Trail with living shimmer** — gradient-stroked (accent→white), glowing rope with node dots that charges up (width 12→14) and a traveling white-dash shimmer.
3. **The material-changing word ticket** — glass pill switches material (candy/gold/coral/blue) to telegraph valid / bonus / invalid / already-found before it resolves.
4. **The gold wax-seal "stamp" beat** — level-complete and the in-grid "found" marker both *press* a gold wax-seal motif rather than pop; the recurring brand gesture.
5. **Two-token color system** — `--accent` reskins connector/glows/sparkles/star-flashes per pack via `color-mix`; reward gold stays constant so value always reads identically.
6. **Glass-on-living-scenery with a glowing wheel hub + breathing life** — frosted glass on animated gradient scenery; the hub casts an upward inner shadow + theme-tinted ground-glow; every scene has tuned ambient floaters; the CTA breathes.

```css
.floater {                                       /* reusable ambient floater */
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,.9), rgba(255,255,255,0));
  animation: floatUp var(--dur,12s) linear infinite; opacity: var(--o,.5);
}
@keyframes floatUp {
  0%{transform:translateY(110vh) scale(.6);opacity:0} 10%{opacity:var(--o,.5)}
  90%{opacity:var(--o,.5)} 100%{transform:translateY(-10vh) scale(1);opacity:0}
}
```

### 2.8 Shared overlays & layout

**Top bar:** level pill (glass, left) · coins + bonus jar (glass, right). Coin = `--grad-gold` disc with embossed "✦", count in Fredoka 600 cream on a glass pill (`tabular-nums`). Bonus jar = a small jar glyph that visually **fills with gold** as bonus words are found.

**Mobile-first layout** (`min-h-dvh` flex column):
top bar → **`.board-plate`** holding the crossword (flex-1, centered) → flexible spacer → **word ticket** → **`.wheel-hub`** pinned bottom with shuffle/hint, `pb-[env(safe-area-inset-bottom)]`. `.app-bg` theme layer is `fixed inset-0 -z-10`.

**Desktop (≥ 768px):** cap app width at **440px**, centered; let `.app-bg` fill the viewport behind so the game reads as a vivid phone-shaped panel on a wide living backdrop. Optional gentle parallax on background bloom layers.

### 2.9 Tailwind v4 wiring

This project uses Tailwind v4 via `@tailwindcss/vite` — there is **no `tailwind.config.js`**. Tokens are declared with `@theme` in the main stylesheet:

```css
/* src/styles/index.css */
@import "tailwindcss";

@theme {
  --color-primary:      #7C3AED;
  --color-primary-600:  #6D28D9;
  --color-primary-glow: #A855F7;
  --color-gold:         #FFC53D;
  --color-gold-deep:    #F59E0B;
  --color-gold-glow:    #FFE08A;
  --color-success:      #2FD98B;
  --color-info:         #6FA8FF;
  --color-error:        #FF5C6C;
  --color-bonus:        #FFB020;
  --color-ink:          #3A1F6B;
  --color-inkbody:      #2A1F4A;

  --font-display: 'Fredoka', sans-serif;
  --font-body:    'Plus Jakarta Sans', sans-serif;

  --radius-tile:  10px;
  --radius-plate: 28px;
  --radius-pill:  999px;

  --ease-spring: cubic-bezier(.34,1.56,.64,1);
  --ease-soft:   cubic-bezier(.22,1,.36,1);

  --shadow-tile:  inset 0 2px 2px rgba(255,255,255,.95), 0 4px 10px rgba(40,16,80,.22);
  --shadow-candy: 0 8px 22px rgba(255,77,141,.55);
  --shadow-gold:  0 0 0 4px rgba(255,197,61,.30), 0 6px 22px rgba(255,197,61,.35);
}
```

**File targets:** `src/styles/index.css` (Tailwind import + `@theme`), `src/styles/tokens.css` (the `:root` runtime tokens + 6 `.theme-*` classes from §2.1–2.2), `src/styles/components.css` (plate/cells/wheel/tiles/ticket/connector). The active pack's `.theme-*` class is applied to `.app-bg`.

---

## 3. Component Architecture

### 3.1 Directory layout

```
src/
  main.tsx                      # React 19 root, mounts <App/>
  App.tsx                       # boot, hydration gate, theme application, overlay routing
  config/
    economy.ts                  # ECONOMY constants (§1.5)
    packs.ts                    # pack id → theme class, display name
  data/
    levels.json                 # generated artifact (committed) — see §5/§7
    levels.ts                   # typed loader/index over levels.json
  types/
    level.ts                    # Level, PlacedWord, GridCell, ActiveLevelState
    store.ts                    # GameStore, PersistedState, Settings, etc.
  store/
    gameStore.ts                # Zustand store + persist middleware
    selectors.ts                # buildActiveLevelState, completedSet, etc.
    migrate.ts                  # forward-only migrate(persisted, fromVersion)
  game/
    grid.ts                     # buildGrid(level) → GridCell[][]
    wordMatch.ts                # classify a swiped path → valid|bonus|dupe|invalid
    hints.ts                    # revealLetter / revealWord target selection
    wheelGeometry.ts            # trig for tile ring + hit-testing
  components/
    App.tsx
    GameScreen.tsx
    TopBar.tsx
    CoinCounter.tsx
    BonusJar.tsx
    BoardPlate.tsx
    Crossword.tsx               # renders GridCell[][]
    Cell.tsx
    LetterWheel.tsx             # hub + tiles + connector + ticket; owns pointer logic
    WheelTile.tsx
    Connector.tsx               # the SVG trail + shimmer
    WordTicket.tsx
    ShuffleButton.tsx
    HintBar.tsx
    overlays/
      LevelCompleteOverlay.tsx
      SettingsSheet.tsx
      Confetti.tsx
    fx/
      FlyingLetters.tsx         # wheel→grid fly+stamp orchestration
      Floaters.tsx              # ambient particles per theme
  styles/
    index.css                   # Tailwind import + @theme
    tokens.css                  # :root tokens + .theme-* classes
    components.css              # plate/cell/wheel/tile/ticket/connector
```

### 3.2 Component tree & responsibilities

```
<App>                          # hydration gate; applies .theme-* to .app-bg; routes overlays
  <div className="app-bg theme-*"/>
  <Floaters theme=.../>        # ambient, suppressed under reduced motion
  <GameScreen>
    <TopBar>
      <LevelPill/>             # "Level 24" + pack name; tap → SettingsSheet/menu
      <CoinCounter/>
      <BonusJar fill=.../>     # 0..1 fill ratio = foundBonus / totalBonus (capped)
    <BoardPlate>
      <Crossword grid={GridCell[][]}>
        <Cell .../>            # one per grid position; state: void|empty|filled|just-filled|seed|bonus
    <WordTicket state={ticketState}/>     # candy|bonus|dupe|invalid|hidden
    <LetterWheel>              # owns pointer capture; emits onWordSubmit(path)
      <Connector points=.../>
      <WheelTile .../> * n
      <ShuffleButton/>
    <HintBar/>                 # reveal-letter, reveal-word buttons w/ costs
  <FlyingLetters/>             # portal layer above board; plays fly+stamp on solve
  <LevelCompleteOverlay/>      # mounted when activeLevel.isComplete
  <SettingsSheet/>             # mounted when ui.settingsOpen
```

### 3.3 Key interaction contracts

- **`<LetterWheel>`** owns all pointer/touch handling (`pointerdown` → `pointermove` hit-test against tile ring via `wheelGeometry.ts` → `pointerup`). It builds an ordered `path: number[]` (tile indices) and the resulting word string. As the path changes it calls `onPathChange(path)` so `<Connector>` and `<WordTicket>` re-render and the ticket can preview-classify (valid/bonus/dupe/invalid). On release it calls `onSubmit(word)`.
- **Classification** lives in `game/wordMatch.ts`, a pure function: given the swiped `word`, the `ActiveLevelState`, and the level's `bonusWords` Set, it returns `{ kind: 'grid', wordIndex } | { kind: 'bonus' } | { kind: 'dupe' } | { kind: 'invalid' }`. The component dispatches the corresponding store action and triggers the matching animation.
- **`<FlyingLetters>`** is a portal-rendered FX layer. On a `grid` solve, `GameScreen` hands it the source tile rects and the destination cell rects (read from the DOM via refs/`getBoundingClientRect`) and it animates the fly+stamp, then signals completion so cells flip to `--filled`.
- **State is the source of truth, animation is decoration.** The store updates immediately on a valid solve (so progress is never lost if an animation is interrupted); cells read their `filled`/`revealed` state from the rebuilt grid. Under reduced motion, `<FlyingLetters>` resolves instantly with a fade.

### 3.4 Rendering the grid

`game/grid.ts → buildGrid(level)` produces a `GridCell[][]` of size `rows × cols`. Each `PlacedWord` is walked; cells it covers get `filled = true`, the correct `letter`, and the word's index pushed to `wordIndices`. Cells no word covers are `filled = false` and render as `.cell--void`. The selector `buildActiveLevelState` then sets `revealed = true` on cells covered by any solved word (so partially-solved levels render correctly on resume). Solved-word tracking is keyed by the **UPPERCASE word string** rather than array index for robustness against re-generation (see §4.6).

---

## 4. Game State & Persistence

### 4.1 Two-world separation

- **Static level content** (`Level` JSON) is content: versioned independently, cacheable, never written.
- **Player state** (`PersistedState`) is the only thing in `localStorage`.

Keeping them apart means regenerating/rebalancing levels never requires a save migration, as long as level `id`s and word-string identity stay stable.

### 4.2 Content types

```ts
/** Static, content-only artifact shipped with the app. row = y (top→bottom),
 *  col = x (left→right), both zero-based. */
export interface Level {
  id: number;                   // stable 1-based campaign position
  letters: string[];            // wheel pool, lowercase, sorted; duplicates allowed & meaningful
  rows: number;                 // grid bounding box
  cols: number;
  words: PlacedWord[];          // solving ALL clears the level; canonical order
  bonusWords: string[];         // SORTED, UPPERCASE; valid words NOT on the grid; excludes targets
  difficulty?: "easy" | "medium" | "hard";
  pack?: { id: string; name: string; indexInPack: number };
}

export interface PlacedWord {
  word: string;                 // UPPERCASE answer
  row: number; col: number;     // top-left-most letter
  direction: "across" | "down";
}

/** Derived, in-memory only — NOT serialized, NOT persisted. */
export interface GridCell {
  row: number; col: number;
  filled: boolean;              // false cells render as gaps (.cell--void)
  letter: string;               // UPPERCASE; meaningful when filled
  wordIndices: number[];        // indices into Level.words passing through this cell
  revealed: boolean;            // true once a solved word covers this cell
}

/** Runtime view-model combining a Level with this player's progress. */
export interface ActiveLevelState {
  level: Level;
  grid: GridCell[][];
  solvedWordIndices: number[];
  foundBonusWords: string[];    // UPPERCASE
  isComplete: boolean;
}
```

### 4.3 Persisted store shape

```ts
export interface GameStore {
  persisted: PersistedState;               // the ONLY thing written to localStorage

  // transient (recomputed each session)
  activeLevelId: number | null;
  loadedLevels: Record<number, Level>;     // in-memory content cache
  hydrated: boolean;

  // actions (not persisted)
  solveWord: (levelId: number, wordIndex: number) => void;
  foundBonusWord: (levelId: number, word: string) => void;
  completeLevel: (levelId: number) => void;
  buyHint: (kind: HintKind) => boolean;    // false if insufficient coins
  addCoins: (n: number, reason: string) => void;
  setSetting: <K extends keyof Settings>(k: K, v: Settings[K]) => void;
  resetAllProgress: () => void;            // wipes persisted + storage
}

export interface PersistedState {
  schemaVersion: number;                   // mirrors persist `version`
  currentLevelId: number;                  // resume target on open
  coins: number;                           // never negative
  completedLevelIds: number[];             // sorted array; rehydrated into a Set in a selector
  levelProgress: Record<number, LevelProgress>;  // keyed by level id; absent if never started
  settings: Settings;
  stats: LifetimeStats;
  createdAt: number;
  lastPlayedAt: number;
}

export interface LevelProgress {
  solvedWords: string[];        // UPPERCASE solved word strings (see §4.6); + derive indices
  bonusWordsFound: string[];    // UPPERCASE
  completed: boolean;
  hintsUsed: number;
}

export interface Settings {
  sound: boolean; music: boolean; haptics: boolean;
  reducedMotion: boolean;       // respects prefers-reduced-motion + explicit toggle
  autoShuffle: boolean;         // auto-shuffle wheel after each solved word
  theme: "system" | "light" | "dark";
}

export interface LifetimeStats {
  levelsCompleted: number; totalWordsSolved: number; totalBonusWordsFound: number;
  totalCoinsEarned: number; totalCoinsSpent: number; hintsUsed: number;
  currentStreak: number; longestStreak: number;
  lastStreakDate: string | null;           // YYYY-MM-DD
}

export type HintKind = "revealLetter" | "revealWord" | "shuffle";
```

### 4.4 Zustand + persist wiring

```ts
create<GameStore>()(
  persist(
    (set, get) => ({ ...initialState, ...actions }),
    {
      name: "wordmix:v1:state",            // single source of truth for all progress
      version: SCHEMA_VERSION,             // 1
      storage: createJSONStorage(() => localStorage),
      migrate,                             // forward-only; see §4.7
      partialize: (s) => ({ persisted: s.persisted }),  // only the data slice hits storage
    }
  )
);
```

### 4.5 localStorage keys

Every key is namespaced `wordmix:` so a reset (or a manual browser "clear site data") wipes exactly these and nothing else. There is **no IndexedDB, cookie, or backend** shadow copy.

| Key | Purpose |
|---|---|
| `wordmix:v1:state` | The entire persisted store (PersistedState JSON, written by persist `name`). Single source of truth. |
| `wordmix:meta:installId` | UUID minted on first load, **outside** the versioned store so it survives migrations; anonymous analytics/streak dedupe. Optional. |
| `wordmix:meta:schemaVersion` | Mirror of current schema version for a pre-hydration boot sanity check. Optional belt-and-suspenders. |

### 4.6 Resume, selectors & solved-word identity

- **Boot:** read the persisted store → take `currentLevelId` → load that `Level` from `levels.json` → `buildActiveLevelState`. If the store is absent, create `initialState` (`currentLevelId=1`, `coins=startingCoins`, `createdAt=now`) and land on Level 1. No menu gate.
- **Selectors** rehydrate `completedLevelIds` into a `Set` for O(1) lookup and rebuild `GridCell[][]` from static content + `LevelProgress`.
- **Solved-word identity:** `LevelProgress.solvedWords` stores **UPPERCASE word strings**, not array indices. Indices are derived against the loaded level. This stays robust if word ordering within a level ever changes during regeneration. (A duplicate word string within a single level is disallowed by the generator — see §5 validation — so the mapping is unambiguous.)

### 4.7 Migration

- The persist `version` field **is** `schemaVersion` (start at 1). `migrate(persistedState, fromVersion)` runs **forward-only**, version by version (v1→v2→v3, each a small pure transform).
- Rules: never read static level content inside a migration (its shape may also have changed); only transform player state; always **add** new fields with safe defaults rather than mutating existing ones. Bump `schemaVersion` only on breaking shape changes — additive optional fields need no bump.
- **Downgrade guard:** if `fromVersion > current` (a save from a newer app), do **not** silently parse it — snapshot the raw blob to `wordmix:v1:state.bak` and start fresh, to avoid corrupting newer data.
- **Historical re-grants** (e.g. a retroactive coin grant) must be done in a migration, never by editing past saves implicitly.

### 4.8 Hardening & edge cases

- **Idempotency:** `solveWord` / `foundBonusWord` / `completeLevel` guard against double-award by checking membership before mutating coins/stats — so replays, storage-event re-applies, and React StrictMode double-invokes never double-pay.
- **Corruption:** wrap hydration `JSON.parse` in try/catch; on failure, back up the raw string to `…bak` and fall back to `initialState` rather than crashing.
- **Quota:** `localStorage` writes can throw `QuotaExceededError` (Safari private mode reports ~0 quota). Wrap writes in try/catch and degrade to an in-memory-only session. The store is tiny (ids + small arrays) — realistic use is well under a few KB even at hundreds of levels.
- **Multi-tab:** listen for the `storage` event and re-hydrate (or at minimum re-read coins/completed) so a second tab does not overwrite the first with stale data. Last-write-wins is acceptable for single-player; the sync prevents jarring rollbacks.
- **Reset:** `resetAllProgress()` resets the in-memory slice to `initialState` **and** `localStorage.removeItem` for every `wordmix:`-prefixed key (enumerate via `Object.keys(localStorage)`). Then re-mint `installId` and re-seed so the next render lands cleanly on Level 1.

---

## 5. Level-Generation Algorithm (corrected)

A build-time, deterministic, seeded generator emits a single committed `src/data/levels.json`. **All level-gen critique fixes are folded directly into the steps and rules below; the spec here is already corrected.** No runtime dictionary ships — the per-level frozen accept-set is the only word data the client needs.

### 5.1 Two-tier word strategy (the load-bearing decision)

- **TIER 1 — COMMON** (frequency-ranked, ~10k words). Drives **base-letter-set selection** and **target-word selection**, so every grid word feels familiar (`garden → garden, range, grand, near`). Using the broad set for targets yields garbage (`jeat, balu, aulic, caum`); the common set yields familiar words. This split is essential.
- **TIER 2 — BROAD** (large dictionary, used **only** to enumerate valid bonus words formable from the base letters). **Corrected (critique fix):** BROAD is **not** the raw 274k Scrabble list for acceptance. It is **intersected with a mid-frequency recognizability list** (Norvig top ~50–80k) so only words a normal player recognizes are accepted as bonus. Obscure 2–3-letter Scrabble-isms (`agen`, `ager`, `areg`, `dae`, `ared`) are dropped. See §6.

### 5.2 Parameters

```ts
const PARAMS = {
  seed: 1337,
  totalLevels: 200,
  baseLenRange: [5, 7],
  minDistinctBaseLetters: 5,
  vowelMin: 2,                          // base must contain >=2 vowels (edge-case guard)
  targetMinWordLen: 3,
  minBonusWordsPerLevel: 8,
  // NO max-bonus rejection (critique fix): store the full accept-set; never reject a good base for being vowel-rich.
  maxPlacementAttemptsPerLevel: 400,
  maxBaseTriesPerLevel: 300,
  maxScrambleTries: 50,                 // bounded baseDisplay re-scramble (critique fix)
  firstWordOrientation: "down",         // base word always placed first at origin
  locale: "US",                         // single canonical locale for BOTH targets and bonus (critique fix)
};

const PACKS = [
  // gridMax loosened where geometry demands (critique fix); commonPoolTopN raised for early packs (critique fix)
  { id:"sprouts",  theme:"garden",   baseLen:5, targetMin:4, targetMax:5, gridMax:7, commonPoolTopN:3500,  allowRepeatLetter:false, levels:33 },
  { id:"meadow",   theme:"flowers",  baseLen:5, targetMin:5, targetMax:5, gridMax:7, commonPoolTopN:5000,  allowRepeatLetter:false, levels:33 },
  { id:"grove",    theme:"forest",   baseLen:6, targetMin:5, targetMax:6, gridMax:8, commonPoolTopN:7000,  allowRepeatLetter:false, levels:33 },
  { id:"canyon",   theme:"desert",   baseLen:6, targetMin:6, targetMax:6, gridMax:8, commonPoolTopN:8500,  allowRepeatLetter:false, levels:34 },
  { id:"summit",   theme:"mountain", baseLen:7, targetMin:6, targetMax:7, gridMax:9, commonPoolTopN:10000, allowRepeatLetter:false, levels:33 },
  { id:"cosmos",   theme:"space",    baseLen:7, targetMin:7, targetMax:7, gridMax:9, commonPoolTopN:10000, allowRepeatLetter:true,  levels:34 },
];
```

> **Pack themes are cosmetic labels + a background key only** — they do not constrain vocabulary (keeps the generator simple and avoids starving the word pool). Theme maps to the matching `.theme-*` class from §2.2.

### 5.3 Algorithm steps (corrected)

**0. LOAD.** Read the COMMON list and the BROAD list. Lowercase, keep `/^[a-z]+$/`, dedupe. Build COMMON as an ordered array (preserves frequency rank). **(Critique fix — mandatory profanity filtering):** before any enumeration, subtract a **committed slur/profanity blocklist** (LDNOOBW + a slur list) from **both** COMMON and BROAD. Filtering COMMON alone is insufficient because bonus words bypass COMMON entirely. **(Critique fix — recognizability):** build the BROAD accept-set as `BROAD_raw ∩ Recognizability(Norvig top ~50–80k)`, US-locale only (subtract known British-only variants), minus proper-noun/abbreviation blocklists. Store BROAD as a `Set`. Seed a deterministic PRNG (`mulberry32(PARAMS.seed)`).

**1. PRECOMPUTE.** Helpers: `counts(w)` = letter histogram; `subset(sub, sup)` = **multiset** comparison via histograms (so repeated-letter bases like `cosmos` correctly allow `moss` only when two `s` exist). Bucket COMMON and BROAD by length for faster subset scans.

**2. PICK A BASE (corrected circular scan).** For the pack's `commonPoolTopN` slice (frequency order): start at `offset = prng() * N | 0`, then **iterate the slice circularly** — visit index `(offset + k) mod N` for `k = 0..N-1`, each exactly once, skipping already-used bases. (Critique fix: this removes the undefined wrap-around; high offsets no longer silently truncate the candidate space.) Accept the first word of length `pack.baseLen` that has `≥ vowelMin` vowels and, if `allowRepeatLetter === false`, `distinctLetters === baseLen` (else `distinctLetters ≥ minDistinctBaseLetters`). **The base letter set is the full MULTISET of the word's letters** (repeats preserved when `allowRepeatLetter`) — this is exactly what the player receives. **(Critique fix — uniqueness):** reject any base whose sorted-letter string was already used in this pack, **or** shares ≥ 4 letters with an already-used base in the same pack (minimum letter-set distance), to avoid near-duplicate puzzles.

**3. CANDIDATE TARGETS.** Scan COMMON for words of length `[targetMinWordLen .. baseLen]` that satisfy `subset(word, base)`. Apply blocklists. If fewer than `pack.targetMin` candidates, reject this base → step 2.

**4. SELECT + PLACE (corrected base-first greedy interlock).** Build a grid as `Map<"r,c", char>`. **(Critique fix — base placed first, unconditionally):** commit the **base word** at the origin running DOWN *before* any sorting — do not rely on "longest first" to pick it. Then sort the *remaining* candidates by length desc (tie-break frequency rank, then PRNG). For each, scan every placed cell; where `word[i] === placedCell.char`, anchor the new word **perpendicular** so `word[i]` lands on that cell; accept the first anchor passing `canPlace()`. Stop at `pack.targetMax`; require ≥ `pack.targetMin`.

**5. `canPlace(word, r, c, dir)` + full-run re-scan (corrected).** Walk each cell: if occupied it must equal `word[i]` (valid crossing, mark `touched`); if empty, its two **perpendicular** neighbors must be empty (prevents side-by-side words). The cell **before the start** and **after the end** along `dir` must be empty (prevents run-ons like `CATS` abutting `HER`). Require `touched` (every word after the base crosses ≥ 1 existing letter). **(Critique fix — accidental-word guard):** after a tentative placement, run a **full-grid re-scan** that extracts every maximal horizontal/vertical run of length ≥ 2 and asserts each is exactly one placed target — no unintended sequence anywhere (catches parallel-adjacent merges that local neighbor checks miss). Reject the placement if any extra run appears.

**6. POST-PLACEMENT VALIDATION.** Compute bounds; `width ≤ pack.gridMax` **and** `height ≤ pack.gridMax`. Flood-fill over occupied cells → assert a **single** connected component. No duplicate target strings. Every target uses only base letters (multiset). **(Critique fix — layout quality):** require `total_intersections ≥ ceil(targetCount / 2) + 1` so boards aren't sparse plus-signs. On failure, retry placement with reshuffled (seeded) candidate order up to `maxPlacementAttemptsPerLevel`; if still failing, reject the base → step 2 (up to `maxBaseTriesPerLevel`). **Invariant (critique fix):** assert the base word is present and was successfully placed; if not, reject and retry.

**7. NORMALIZE COORDS.** Shift placements so `minR/minC = 0`. Record per target `{ word, row, col, dir:"across"|"down" }`. Map `dir` "down"→`direction:"down"`, horizontal→`"across"` to match the `PlacedWord` schema.

**8. ENUMERATE BONUS SET.** Scan the (filtered, recognizable, US-locale) BROAD set for words of length `[3..baseLen]` with `subset(word, base)`. This is the complete frozen accept-set. Tag `isTarget=true` for any that are placed targets. **(Critique fix — no high-side rejection):** enforce only `count ≥ minBonusWordsPerLevel` (too few ⇒ base too sparse ⇒ reject); **do not reject for too many** — store the full set (120 vs 250 strings is negligible JSON, and vowel-rich familiar bases are exactly the best ones). Sort bonus words by length then alpha for stable output.

**9. BASE DISPLAY (corrected, bounded).** `baseDisplay` = a PRNG scramble of the **same multiset** of base letters. **(Critique fix — bounded loop):** re-scramble at most `maxScrambleTries` (50) times to satisfy the **weak, always-satisfiable** constraint: `baseDisplay ≠ base word` and does not start with a full target in order. If unsatisfied after the cap, accept the least-bad scramble. (Mid-scramble target spellings are cosmetic and not forbidden.)

**10. EMIT LEVEL.** Map to the `Level` schema: `{ id, letters: sortedMultiset, rows: height, cols: width, words: PlacedWord[], bonusWords: sortedUppercase, difficulty, pack:{ id, name, indexInPack } }`. Keep `baseDisplay` as the initial wheel order client-side (the client may re-shuffle freely; `letters` stays the canonical sorted multiset).

**11. ASSEMBLE & SELF-VALIDATE.** Build `{ seed, version: "<hardcoded string>", packs:[{ id, theme, levels:[...] }] }`. **(Critique fix — determinism):** emit **no wall-clock field** — there is no `generatedAt`; the output is byte-identical across runs given the same seed (stable sort, stable key order, seeded PRNG). Write deterministic JSON. Run the self-validation suite (§5.4) independently over the emitted file; **fail-fast** on any violation. **(Critique fix — no silent skips):** if any pack produced fewer than its target level count, **fail the build** (hard error) rather than shipping a short pack. **Output mechanism (critique fix):** the script `fs.writeFileSync`s directly to `src/data/levels.json`; all human-readable summary stats and the validation report go to **stderr** (`console.error`), keeping the file uncorrupted. The npm script `gen:levels` runs `node scripts/generate-levels.mjs` with **no stdout redirect**.

### 5.4 Validation rules (self-check, fail-fast)

1. **Connectivity:** union of all target cells = exactly one connected component (flood-fill reaches every occupied cell).
2. **Consistent intersections:** any cell shared by two words holds the same letter in both.
3. **No bad adjacencies / no accidental words:** the full-grid maximal-run extraction yields runs that are each exactly one placed target — no extra horizontal/vertical sequence anywhere (re-asserted here, not just in `canPlace`).
4. **Letter legality:** every target is a multiset subset of the base letter set.
5. **Base solvable from its own letters:** the base word is present among targets and was placed; union of target letters never exceeds the base multiset.
6. **No duplicate target strings** within a level.
7. **Grid size:** `width ≤ pack.gridMax` and `height ≤ pack.gridMax`.
8. **Target count** in `[pack.targetMin, pack.targetMax]`.
9. **Layout quality:** `total_intersections ≥ ceil(targetCount/2) + 1`.
10. **Bonus completeness + correctness:** `bonusWords` contains every (filtered, recognizable, US-locale) BROAD word of length `[3..baseLen]` that is a subset of the base, and no word that isn't; every target also appears with `isTarget=true`; `count ≥ minBonusWordsPerLevel`.
11. **No profanity/slurs:** **fail the build** if any emitted target or bonus word is in the blocklist.
12. **Locale consistency:** all targets and bonus words are US-spelling.
13. **Per-pack level count:** each pack emitted exactly its target count — under-generation is a hard failure.
14. **Determinism:** re-running with the same seed produces a byte-identical `levels.json` (no non-deterministic field exists).
15. **Global/per-pack base uniqueness:** no two bases in a pack share a letter set or share ≥ 4 letters.

### 5.5 Edge cases (handled)

- **Sparse base** (few subset words, often consonant-heavy/vowel-poor): rejected on `< minBonusWordsPerLevel`; `vowelMin ≥ 2` guard up front; capped retries via `maxBaseTriesPerLevel`.
- **Placement deadlock:** reshuffle (seeded) candidate order, retry up to `maxPlacementAttemptsPerLevel`; else swap candidate or reject base.
- **Oversized grid:** placing longest-first and preferring bound-tightening intersections; hard-reject on `gridMax` and retry. (`gridMax` already loosened where geometry demanded — see §5.2.)
- **Duplicate/near-duplicate base across levels:** letter-set uniqueness + ≥ 4-letter-distance rule (§5.3 step 2).
- **Repeated letters (Pack 6):** `subset()` compares histograms; base is emitted as the full multiset; the wheel offers exactly those tiles including repeats.
- **Profanity/slurs:** mandatory blocklist subtracted from both lists at load; build fails if any leaks.
- **Proper nouns / abbreviations / single-letter junk:** a lowercase list cannot self-identify proper nouns, so an **external gazetteer/abbreviation blocklist is required** and applied to **both** targets and the bonus enumeration; drop length < 3.
- **British vs American:** single canonical **US** locale for both targets and bonus (British-only variants subtracted from BROAD).
- **`baseDisplay` accidentally spelling a target:** bounded 50-try re-scramble against the weak always-satisfiable constraint.
- **Pluralization spam:** acceptable (valid, recognizable words); not rejected — full accept-set is stored.
- **Reproducibility across machines:** the BROAD and COMMON source files are **vendored/committed** and pinned; runtime source swapping is forbidden; the BROAD source is frozen for the lifetime of the shipped `levels.json`.

---

## 6. Word-List Sourcing

Two tiers, sourced separately, both lowercased and filtered to `/^[a-z]+$/`, deduped, profanity-stripped, US-locale.

### 6.1 TIER 1 — COMMON (base + target selection → familiar puzzles)

- **Primary (vendored):** `google-10000-english` — `google-10000-english-usa-no-swears.txt` (~9,884 words, frequency-ranked, swears pre-removed). Length distribution is ample for ~200 bases (len5 ≈ 1,367; len6 ≈ 1,488; len7 ≈ 1,447). Sample 6-letter entries: `search, online, people, health, system, school, review, travel` — the desired familiarity.
- **Larger alternative if early packs starve:** Norvig `count_1w.txt` (333k words with counts) — take the top N (30–50k) by count.
- **Vendor the chosen file into the repo** (e.g. `data/common.txt`) so builds are reproducible and offline. (Avoid `most-common-words-by-language` — it requires an unbundled `lodash` at runtime.)

### 6.2 TIER 2 — BROAD (bonus-word acceptance only)

- **Primary (already a project dependency):** `an-array-of-english-words@^2.0.0` — `require()` returns a plain JS array (`isArray=true`, ~274,937 entries). Zero-parse, ideal. **Pin to an exact version** (drop the `^`) so the accept-set is frozen for the shipped `levels.json`.
- **Recognizability intersection (critique fix — mandatory):** the raw 274k Scrabble list pollutes bonus sets with player-hostile garbage (`agen, ager, areg, dae, ared`). Intersect BROAD with a **mid-frequency recognizability list** (Norvig top ~50–80k) so only recognizable words are accepted. Drop obscure 2–3-letter Scrabble-isms.
- **Profanity (critique fix — mandatory):** the BROAD list contains slurs and crude words (`fuck, shit, ass, sex, nazi`, etc.). Subtract a committed blocklist (LDNOOBW + slur list) from BROAD **before** enumeration. Filtering COMMON alone is insufficient.
- **Proper nouns/abbreviations:** subtract an external gazetteer/abbreviation blocklist (a lowercase list cannot self-identify proper nouns).
- **Avoid `word-list@4.x`:** ESM-only, and its default export is a **file path**, not the words — easy to crash on. The plain-array dependency sidesteps this.

**Net:** COMMON = vendored google-10000 (or Norvig top-N); BROAD-accept = `pinned an-array-of-english-words ∩ recognizability` minus profanity/proper-noun blocklists, US-locale. Targets (COMMON-derived) are always a subset of the bonus set, so they're flagged `isTarget`, never stored twice.

---

## 7. Build & Deploy Notes

### 7.1 Toolchain

- **React 19 + TypeScript + Vite 8.** `@vitejs/plugin-react`.
- **Tailwind v4** via `@tailwindcss/vite` (no `tailwind.config.js`; tokens via `@theme` — §2.9).
- **Zustand 5** with `persist` middleware.
- **Framer Motion 12** for spring/orchestrated FX.
- **Static SPA** — no SSR, no server functions. The only runtime fetch is the app's own static assets.

### 7.2 Level generation in the build

- `scripts/generate-levels.mjs` (single Node ESM script) **writes `src/data/levels.json` directly** via `fs.writeFileSync`; logs/stats/validation go to **stderr**. Run once with `npm run gen:levels` (no redirect). The output is **committed** to the repo.
- `src/data/levels.json` is imported by `src/data/levels.ts` and bundled by Vite (or `fetch`ed from `public/` if you prefer to keep it out of the JS bundle — choose one; the committed-and-imported path matches the current `gen:levels` script and Vite import expectations).
- Regeneration is deterministic (seed `1337`, no timestamp field) → re-running yields a byte-identical file → clean git diffs. CI may re-run `gen:levels` and `git diff --exit-code src/data/levels.json` to assert determinism.

### 7.3 Build commands (from `package.json`)

```
npm run dev         # vite dev server
npm run gen:levels  # node scripts/generate-levels.mjs  (writes src/data/levels.json)
npm run typecheck   # tsc --noEmit
npm run build       # vite build  → static assets in dist/
npm run preview     # vite preview
npm run deploy      # npm run build && wrangler deploy
```

### 7.4 Cloudflare deployment

- Deploys as a **static SPA**. `npm run deploy` runs `vite build` then `wrangler deploy`.
- Configure Wrangler for a static assets project (Cloudflare Pages-style assets or Workers Static Assets) serving `dist/`. **SPA fallback:** route unknown paths to `index.html` (single-route app, but guards against deep-link refresh). No D1, no Workers logic, no auth, no environment secrets required for v1.
- **Caching:** Vite emits content-hashed asset filenames → long-lived immutable cache for `/assets/*`; `index.html` served with a short/no-cache TTL so deploys roll out immediately. `levels.json`, if served from `public/`, gets a content-hash or a short TTL so regenerated levels propagate.
- **Fonts:** Google Fonts via `<link>` with `preconnect` (§2.3). Optionally self-host the two families under `public/fonts` for offline resilience and to drop the third-party connection.

### 7.5 Performance & quality gates

- Tile/connector/grid animations are GPU-friendly (`transform`/`opacity` only; avoid layout-thrashing properties).
- `backdrop-filter` is used liberally — verify on lower-end Android; provide a solid-fill fallback for browsers without support (`@supports not (backdrop-filter: blur())`).
- Bundle target: keep the JS bundle lean (no router, no UI kit). `levels.json` for 200 levels is small (ids + short string arrays).
- Every commit must `npm run typecheck` clean and `npm run build` successfully; the level generator's self-validation must pass.

---

## 8. Build Order & Milestones

Each layer is independently testable and looks finished on its own.

1. **Tokens + fonts** — `index.css` (`@theme`), `tokens.css` (`:root` + 6 `.theme-*`), font links.
2. **Types + level loader** — `types/`, `data/levels.ts`, a tiny hand-authored `levels.json` stub to unblock UI before the generator lands.
3. **Store + persistence** — `gameStore.ts`, `selectors.ts`, `migrate.ts`; hydration gate in `App`; resume-on-open; multi-tab `storage` sync; idempotent actions.
4. **Board plate + grid cells** — debossed/raised states, responsive `--cell`, void cells, resume rendering of partially-solved levels.
5. **Wheel hub + tiles + connector** — trig layout, pointer capture, gradient stroke + shimmer, hit-testing.
6. **Word ticket** — material-changing preview classification.
7. **Word→grid fly + stamp** — `FlyingLetters`, `cellPop`, store-first/animation-second contract; reduced-motion instant path.
8. **Generator** — `scripts/generate-levels.mjs` with all §5 corrections + self-validation; commit `src/data/levels.json`.
9. **Themes + ambient** — per-pack `.theme-*` application, `Floaters`, theme cross-fade.
10. **Economy + hints + bonus** — coin counter, bonus jar fill, hint bar, daily bonus.
11. **Celebration/feedback polish** — level-complete overlay, wax-seal stamp, stars, confetti/calm variants, invalid/dupe feedback, settings sheet, reset.