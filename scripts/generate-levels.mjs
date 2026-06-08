// Build-time level generator for Word-Mix.
//
// Produces an interlocking crossword for each level from a base letter set, plus the full set
// of valid "bonus words" formable from those letters, so the runtime needs no dictionary.
//
// Run: npm run gen:levels   ->   writes src/data/levels.json
//
// Word sources:
//  - an-array-of-english-words : ~275k curated English words = the authoritative valid-word set
//    (used to validate every word, and to enumerate BONUS words).
//  - google 20k common words   : a frequency-ordered whitelist of genuinely common words. A word
//    must be on this list to be a TARGET (so puzzles use familiar words, not obscure Scrabble
//    fragments or web acronyms). Cached to scripts/.cache so re-runs are offline.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const enWords = JSON.parse(readFileSync(require.resolve('an-array-of-english-words'), 'utf8'))

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(__dirname, 'data') // vendored (committed) inputs — reproducible builds
const OUT = join(ROOT, 'src', 'data', 'levels.json')

// Frequency-ordered common-word list (~20k recognizable words). It defines the universe of words
// the game will ever show (targets AND bonus), so even bonus words stay real/recognizable English.
// Swears in this list are stripped separately by isProfane() at dictionary build.
const COMMON_URLS = [
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/20k.txt',
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt',
]

// Target/base words must be at least this familiar (rank in the common list). Bonus words may be
// any recognizable word in the full list, so bonus stays plentiful but never obscure.
const TARGET_MAX_RANK = 10000

// ----------------------------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------------------------

const PACKS = [
  { name: 'Meadow', theme: 'meadow', baseMin: 4, baseMax: 4, targetsMin: 3, targetsMax: 5, gridCap: 7, count: 30 },
  { name: 'Canyon', theme: 'canyon', baseMin: 4, baseMax: 5, targetsMin: 4, targetsMax: 6, gridCap: 8, count: 35 },
  { name: 'Tide', theme: 'tide', baseMin: 5, baseMax: 5, targetsMin: 5, targetsMax: 7, gridCap: 9, count: 35 },
  { name: 'Forest', theme: 'forest', baseMin: 5, baseMax: 6, targetsMin: 5, targetsMax: 8, gridCap: 10, count: 35 },
  { name: 'Aurora', theme: 'aurora', baseMin: 6, baseMax: 6, targetsMin: 6, targetsMax: 9, gridCap: 11, count: 35 },
  { name: 'Summit', theme: 'summit', baseMin: 6, baseMax: 7, targetsMin: 7, targetsMax: 10, gridCap: 12, count: 35 },
]

// Curated, genuinely recognizable 3-letter words. A 3-letter word may only be a TARGET (or part
// of a wheel base) if it is here — this surgically removes the fragment/abbreviation noise (las,
// als, sal, lis, pos, ops, ...) that pollutes web-frequency lists at short lengths.
const THREE_LETTER = new Set(
  ('ace act add ado age ago aid ail aim air ale all amp and ant any ape apt arc are ark arm art ash ' +
    'ask ate awe axe aye bad bag ban bar bat bay bed bee beg bet bib bid big bin bit boa bob bog boo ' +
    'bow box boy bra bud bug bum bun bus but buy bye cab cam can cap car cat cob cod cog con coo cop ' +
    'cot cow coy cry cub cue cup cur cut dab dad dam day den dew did die dig dim din dip doe dog don ' +
    'dot dry dub dud due dug duo dye ear eat ebb eel egg ego elf elk elm end era eve ewe eye fad fan ' +
    'far fat fax fed fee few fib fig fin fir fit fix fly foe fog fox fry fun fur gag gap gas gay gel ' +
    'gem get gig gin god got gum gun gut guy gym had hag ham has hat hay hem hen her hew hex hey hid ' +
    'him hip his hit hoe hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion ire irk ivy ' +
    'jab jam jar jaw jay jet jig job jog jot joy jug jut keg key kid kin kit lab lad lag lap law lax ' +
    'lay led leg let lid lie lip lit lob log lot low mad man map mar mat may men met mid mix mob mom ' +
    'mop mud mug mum nab nag nap nay net new nib nil nip nod nor not now nun nut oak oar oat odd ode ' +
    'off oil old one opt orb ore our out owe owl own pad pal pan pat paw pay pea peg pen pet pew pie ' +
    'pig pin pit ply pod pop pot pro pry pub pug pun pup pus put rad rag ram ran rap rat raw ray red ' +
    'ref rev rib rid rig rim rip rob rod roe rot row rub rue rug rum run rut rye sac sad sag sap sat ' +
    'saw sax say sea see set sew she shy sin sip sir sit six ski sky sly sob sod son sow soy spa spy ' +
    'sub sue sum sun sup tab tad tag tan tap tar tax tea ten the thy tic tie tin tip toe ton too top ' +
    'tot tow toy try tub tug two ump urn use van vat vet via vie vim vow wad wag war was wax way web ' +
    'wed wee wet who why wig win wit woe wok won woo wow yak yam yap yea yen yes yet yew you zap zip zoo').split(
    ' ',
  ),
)

// 4+ letter web-list junk we never want as a target/base.
const SHORT_STOPLIST = new Set(['libs', 'mans', 'vids', 'apps', 'urls', 'dems', 'mems', 'recs', 'pix'])

// Proper nouns, brands, and foreign words from the web-frequency list that read as non-English.
// (The vendored proper-nouns.txt catches many automatically; this covers the ones it misses —
// names/places with an obscure lowercase dictionary entry, or words absent from the system dict.)
const NON_ENGLISH = new Set(
  (
    // names / surnames that read as proper nouns
    'eric lewis nelson madden yates howe lowe vera mona marc neal bach ames ariel cain alec peter ' +
    'peters ruth tara vail carl carr bates tate tori davies fowler maria pedro noel kane kent kern ' +
    'lang ming troy josh sith alan barry cher colin cole dino logan drake dans dyer eddy logan ' +
    'barbie mary tony travis wang alma beth norma regina roma shaw siemens luke bailey latina ' +
    // places / brands
    'vegas niger hong yale brit intel mets boston brazil spain mali soho costa rio peru cuba ohio ' +
    'utah iowa nokia sony cisco ibm asus dell sega tyne york berg ' +
    // foreign words
    'frau eine nach tres dolce bien sich sind und der die das ist nous anglo ' +
    // acronyms / abbreviations / netspeak
    'sars nato faq dept blvd inc ltd gmbh html http www jpeg mpeg usb api sql cpu gpu seo cond conn ' +
    'recon keno roms macs huns vols mips logon sims mods ciao ' +
    // anatomical / suggestive (keep it family-friendly)
    'nipple nipples pantie panties nude'
  )
    .split(/\s+/)
    .filter(Boolean),
)

// Profanity filter. Applied at dictionary build so offensive words never become a base, a target,
// OR a bonus word. Two layers: (1) substring ROOTS catch every inflection (piss→pissed, rape→raped)
// and slurs; (2) a WHITELIST rescues benign words that merely contain a root (grape, scrape, spice,
// cumin, sexton…). Plus an EXACT set for mild/standalone words and short slurs with no safe root.
const PROFANE_ROOTS = [
  'fuck', 'shit', 'piss', 'cunt', 'cock', 'dick', 'twat', 'wank', 'slut', 'whore', 'rape', 'porn',
  'turd', 'nigg', 'spic', 'kike', 'chink', 'gook', 'dyke', 'dago', 'jizz', 'bitch', 'bastard',
  'dildo', 'penis', 'vagina', 'scrotum', 'semen', 'molest', 'pedo', 'felch', 'smegma',
  'negro', 'clit', 'tranny', 'orgasm',
]
const PROFANE_WHITELIST = new Set([
  // -rape- collisions
  'grape', 'grapes', 'grapey', 'drape', 'drapes', 'draped', 'draper', 'drapery', 'scrape', 'scraped',
  'scraper', 'scrapes', 'scraping', 'crape', 'crapes', 'trapes', 'parapet',
  // -cock- collisions
  'cockle', 'cockles', 'cocky', 'cockpit', 'peacock', 'cockade', 'cockerel', 'shuttlecock', 'cockney',
  // -dick- collisions
  'dickens', 'dickey', 'dickeys', 'dickie',
  // -spic- collisions
  'spice', 'spices', 'spiced', 'spicy', 'spicer', 'spicier', 'auspice', 'auspices', 'suspicion',
  // -semen- / -piss- have no common benign collisions; -gook-/-coon- none short
])
const PROFANE_EXACT = new Set([
  'ass', 'asses', 'arse', 'arses', 'arsed', 'crap', 'craps', 'crappy', 'crapped', 'damn', 'damns',
  'damned', 'damning', 'tit', 'tits', 'titty', 'titties', 'fart', 'farts', 'farted', 'fag', 'fags',
  'faggot', 'faggots', 'sex', 'sexy', 'sexed', 'sexes', 'sexier', 'sexting', 'sext', 'sexts', 'coon',
  'coons', 'wog', 'wogs', 'queef', 'rapey', 'boob', 'boobs', 'booby', 'knobend', 'prick', 'pricks',
  'homo', 'homos', 'queer', 'queers', 'boner', 'boners', 'horny', 'condom', 'condoms', 'retard',
  'retards', 'retarded', 'spaz', 'spastic', 'midget', 'midgets', 'pube', 'pubes', 'asshole', 'assholes',
  'butthole', 'dumbass', 'jackass', 'badass', 'smartass', 'jap', 'japs', 'wop', 'wops', 'honky',
  'gimp', 'redneck', 'mongoloid', 'raghead', 'dykes', 'erotic', 'naked', 'nudist',
])
const PROFANE_EXACT_WHITELIST = new Set([
  // benign words that would be caught by an EXACT entry's intent but are fine
  'sexton', 'unisex', 'sextet', 'sextant', 'essex', 'sussex',
])

// Comprehensive vendored bad-words list (LDNOOBW), plus a few medical/slang terms it omits.
const BADWORDS = (() => {
  const s = new Set(['herpes', 'dong', 'dongs', 'milf', 'milfs'])
  try {
    for (const line of readFileSync(join(DATA_DIR, 'badwords.txt'), 'utf8').split('\n')) {
      const w = line.trim()
      if (/^[a-z]+$/.test(w)) s.add(w)
    }
  } catch {
    /* optional */
  }
  return s
})()

function isProfane(w) {
  if (PROFANE_EXACT_WHITELIST.has(w) || PROFANE_WHITELIST.has(w)) return false
  if (PROFANE_EXACT.has(w) || BADWORDS.has(w)) return true
  for (const root of PROFANE_ROOTS) if (w.includes(root)) return true
  return false
}

// ----------------------------------------------------------------------------------------------
// Seeded RNG (deterministic, reproducible level sets)
// ----------------------------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(arr, rng) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ----------------------------------------------------------------------------------------------
// Word data
// ----------------------------------------------------------------------------------------------

const A = 'a'.charCodeAt(0)

function letterCounts(word) {
  const c = new Uint8Array(26)
  for (let i = 0; i < word.length; i++) c[word.charCodeAt(i) - A]++
  return c
}

function letterMask(word) {
  let m = 0
  for (let i = 0; i < word.length; i++) m |= 1 << (word.charCodeAt(i) - A)
  return m
}

// A word fit to be a wheel base or a grid target: common, not junk, and (if 3 letters) on the
// curated whitelist. Bonus words are NOT held to this bar — obscure finds are part of the fun.
// Eligible to be a wheel base or a grid target: familiar enough (rank-capped). The dictionary is
// already pre-filtered for recognizability, the 3-letter whitelist, profanity, and junk.
function goodWord(e) {
  return e.rank <= TARGET_MAX_RANK
}

// True if `wc` (word counts) fits inside `bc` (base counts).
function fitsInside(wc, bc) {
  for (let i = 0; i < 26; i++) if (wc[i] > bc[i]) return false
  return true
}

// Returns a Map word -> rank (0 = most common). The list is already frequency-ordered, so the
// line index IS the commonness rank. Membership in this map == "a genuinely common word".
async function loadCommonRanks() {
  mkdirSync(DATA_DIR, { recursive: true })
  const vendored = join(DATA_DIR, 'common.txt')
  let words
  if (existsSync(vendored)) {
    // Reproducible: read the committed list, no network needed.
    words = readFileSync(vendored, 'utf8').split('\n').filter(Boolean)
  } else {
    for (const url of COMMON_URLS) {
      try {
        process.stdout.write(`Fetching common-words list from ${url} ...\n`)
        const res = await fetch(url)
        if (!res.ok) continue
        const text = await res.text()
        words = text
          .split(/\s+/)
          .map((w) => w.toLowerCase())
          .filter((w) => /^[a-z]+$/.test(w))
        writeFileSync(vendored, words.join('\n')) // vendor for future reproducible runs
        break
      } catch {
        /* try next url */
      }
    }
  }
  if (!words || words.length === 0) throw new Error('Could not load a common-words list')
  const rank = new Map()
  words.forEach((w, i) => {
    if (!rank.has(w)) rank.set(w, i)
  })
  return rank
}

function buildDictionary(rank, exclude) {
  // Recognizable words only: a word must be BOTH a real dictionary word (an-array-of-english-words)
  // AND on the common-words list (rank) — this keeps obscure Scrabble/archaic fragments (eas, sae,
  // spae, yus, arew, …) out of bonus words. 3-letter words come only from the curated whitelist.
  // Proper nouns / brands / foreign words are excluded via `exclude`.
  const dict = new Map() // word -> { word, len, mask, counts, rank }
  for (const raw of enWords) {
    const w = raw.toLowerCase()
    if (w.length < 3 || w.length > 15) continue
    if (!/^[a-z]+$/.test(w)) continue
    if (isProfane(w)) continue
    if (SHORT_STOPLIST.has(w)) continue
    if (NON_ENGLISH.has(w) || exclude.has(w)) continue // proper nouns / brands / foreign
    if (!rank.has(w)) continue // must be a recognizable, common-list word
    if (w.length === 3 && !THREE_LETTER.has(w)) continue // only curated 3-letter words
    dict.set(w, {
      word: w,
      len: w.length,
      mask: letterMask(w),
      counts: letterCounts(w),
      rank: rank.get(w),
      common: true,
    })
  }
  return dict
}

// ----------------------------------------------------------------------------------------------
// Crossword construction
// ----------------------------------------------------------------------------------------------

const key = (r, c) => `${r},${c}`
const ACROSS_BIT = 1
const DOWN_BIT = 2
const dirBit = (dir) => (dir === 'across' ? ACROSS_BIT : DOWN_BIT)

// Find every valid placement of `word` that crosses the existing grid exactly once-or-more on
// matching letters, never extends an existing run, and never creates a parallel adjacency.
function findPlacements(word, cells, dirCells, gridCap, bounds) {
  const placements = []
  const len = word.length

  // Index existing cells by letter for quick crossing lookup.
  for (const [k, letter] of cells) {
    const [cr, cc] = k.split(',').map(Number)
    for (let i = 0; i < len; i++) {
      if (word[i] !== letter) continue
      for (const dir of ['across', 'down']) {
        const sr = dir === 'across' ? cr : cr - i
        const sc = dir === 'across' ? cc - i : cc
        const p = tryPlacement(word, sr, sc, dir, cells, dirCells, gridCap, bounds)
        if (p) placements.push(p)
      }
    }
  }
  return placements
}

function tryPlacement(word, sr, sc, dir, cells, dirCells, gridCap, bounds) {
  const len = word.length
  const dr = dir === 'down' ? 1 : 0
  const dc = dir === 'across' ? 1 : 0
  const bit = dirBit(dir)

  // Cell immediately before the start and after the end must be empty (no run extension).
  if (cells.has(key(sr - dr, sc - dc))) return null
  if (cells.has(key(sr + dr * len, sc + dc * len))) return null

  let intersections = 0
  let newCells = 0
  const path = []

  for (let i = 0; i < len; i++) {
    const r = sr + dr * i
    const c = sc + dc * i
    const existing = cells.get(key(r, c))
    if (existing !== undefined) {
      if (existing !== word[i]) return null // mismatch
      // A crossing must be perpendicular: if a word already runs through this cell in the SAME
      // direction, placing here would overlap it collinearly and subsume one word into the other.
      if ((dirCells.get(key(r, c)) || 0) & bit) return null
      intersections++
    } else {
      newCells++
      // New cells must have empty perpendicular neighbours (no parallel adjacency).
      const pr1 = r + dc // perpendicular to travel direction
      const pc1 = c + dr
      const pr2 = r - dc
      const pc2 = c - dr
      if (cells.has(key(pr1, pc1))) return null
      if (cells.has(key(pr2, pc2))) return null
    }
    path.push({ r, c })
  }

  if (intersections < 1 || newCells < 1) return null

  // Respect the grid-size cap.
  const minR = Math.min(bounds.minR, sr)
  const maxR = Math.max(bounds.maxR, sr + dr * (len - 1))
  const minC = Math.min(bounds.minC, sc)
  const maxC = Math.max(bounds.maxC, sc + dc * (len - 1))
  const h = maxR - minR + 1
  const w = maxC - minC + 1
  if (h > gridCap || w > gridCap) return null

  return { word, row: sr, col: sc, dir, path, area: h * w, span: Math.max(h, w) }
}

function buildCrossword(base, candidates, pack, rng) {
  const cells = new Map()
  const dirCells = new Map() // "r,c" -> bitmask of word directions through the cell
  const placed = []
  const bounds = { minR: 0, maxR: 0, minC: 0, maxC: 0 }

  // Place the base/pangram horizontally.
  for (let i = 0; i < base.length; i++) {
    cells.set(key(0, i), base[i])
    dirCells.set(key(0, i), ACROSS_BIT)
  }
  placed.push({
    word: base,
    row: 0,
    col: 0,
    dir: 'across',
    path: Array.from({ length: base.length }, (_, i) => ({ r: 0, c: i })),
  })
  bounds.maxC = base.length - 1
  const used = new Set([base])

  // `candidates` arrives pre-ordered by preference (common, slightly longer first); keep it.
  const pool = candidates.filter((w) => w !== base)

  let changed = true
  while (placed.length < pack.targetsMax && changed) {
    changed = false
    for (const w of pool) {
      if (used.has(w)) continue
      const options = findPlacements(w, cells, dirCells, pack.gridCap, bounds)
      if (options.length === 0) continue
      // Keep the grid compact: smallest resulting span, then area.
      options.sort((a, b) => a.span - b.span || a.area - b.area)
      const pick = options[0]
      const bit = dirBit(pick.dir)
      pick.path.forEach((cell, i) => {
        const k = key(cell.r, cell.c)
        cells.set(k, w[i])
        dirCells.set(k, (dirCells.get(k) || 0) | bit)
      })
      bounds.minR = Math.min(bounds.minR, pick.row)
      bounds.maxR = Math.max(bounds.maxR, pick.row + (pick.dir === 'down' ? w.length - 1 : 0))
      bounds.minC = Math.min(bounds.minC, pick.col)
      bounds.maxC = Math.max(bounds.maxC, pick.col + (pick.dir === 'across' ? w.length - 1 : 0))
      placed.push({ word: w, row: pick.row, col: pick.col, dir: pick.dir, path: pick.path })
      used.add(w)
      changed = true
      if (placed.length >= pack.targetsMax) break
    }
  }

  if (placed.length < pack.targetsMin) return null
  // Safety net: every placed word must be its own maximal run, i.e. a distinct slot the player
  // can actually fill. (Prevents the "completed but won't advance" bug from a subsumed word.)
  const runs = maximalRuns(cells)
  for (const p of placed) if (!runs.has(p.word)) return null
  return { placed, bounds }
}

// The set of maximal horizontal/vertical runs (length >= 2) currently in the grid.
function maximalRuns(cells) {
  const runs = new Set()
  for (const [k] of cells) {
    const [r, c] = k.split(',').map(Number)
    if (!cells.has(key(r, c - 1)) && cells.has(key(r, c + 1))) {
      let s = ''
      let cc = c
      while (cells.has(key(r, cc))) s += cells.get(key(r, cc++))
      runs.add(s)
    }
    if (!cells.has(key(r - 1, c)) && cells.has(key(r + 1, c))) {
      let s = ''
      let rr = r
      while (cells.has(key(rr, c))) s += cells.get(key(rr++, c))
      runs.add(s)
    }
  }
  return runs
}

// ----------------------------------------------------------------------------------------------
// Level assembly
// ----------------------------------------------------------------------------------------------

function subWords(baseEntry, dict, minLen) {
  const out = []
  for (const e of dict.values()) {
    if (e.len < minLen || e.len > baseEntry.len) continue
    if ((e.mask & baseEntry.mask) !== e.mask) continue // quick reject by letter set
    if (!fitsInside(e.counts, baseEntry.counts)) continue
    out.push(e)
  }
  return out
}

function normalize(placed, bounds) {
  const offR = -bounds.minR
  const offC = -bounds.minC
  const words = placed.map((p) => ({
    word: p.word,
    row: p.row + offR,
    col: p.col + offC,
    dir: p.dir,
  }))
  return {
    width: bounds.maxC - bounds.minC + 1,
    height: bounds.maxR - bounds.minR + 1,
    words,
  }
}

async function main() {
  process.stdout.write('Loading common-word ranks...\n')
  const rank = await loadCommonRanks()
  process.stdout.write(`Common words: ${rank.size}.\n`)
  // Vendored proper-noun list (capitalized-only entries from the system dictionary).
  const properFile = join(DATA_DIR, 'proper-nouns.txt')
  const properNouns = existsSync(properFile)
    ? new Set(readFileSync(properFile, 'utf8').split('\n').filter(Boolean))
    : new Set()
  process.stdout.write(`Proper nouns excluded: ${properNouns.size}.\n`)
  process.stdout.write('Building dictionary...\n')
  const dict = buildDictionary(rank, properNouns)
  process.stdout.write(`Dictionary: ${dict.size} words.\n`)

  // Pre-bucket strong base words by length, ordered most-common-first.
  const basesByLen = new Map()
  for (const e of dict.values()) {
    if (!goodWord(e)) continue
    if (!basesByLen.has(e.len)) basesByLen.set(e.len, [])
    basesByLen.get(e.len).push(e)
  }
  for (const list of basesByLen.values()) list.sort((a, b) => a.rank - b.rank)
  process.stdout.write(
    'Common bases by length: ' +
      [4, 5, 6, 7].map((L) => `${L}:${(basesByLen.get(L) || []).length}`).join('  ') +
      '\n',
  )

  const rng = mulberry32(0x5eed1234)
  const usedBases = new Set()
  const levels = []
  let id = 0

  for (let p = 0; p < PACKS.length; p++) {
    const pack = PACKS[p]
    // Candidate bases for this pack: in length range, shuffled with a bias toward common.
    let pool = []
    for (let L = pack.baseMin; L <= pack.baseMax; L++) pool = pool.concat(basesByLen.get(L) || [])
    pool = shuffle(pool, rng)

    let made = 0
    let attempts = 0
    const maxAttempts = pool.length
    while (made < pack.count && attempts < maxAttempts) {
      const baseEntry = pool[attempts++]
      const base = baseEntry.word
      if (usedBases.has(base)) continue

      // Candidate target words: common sub-words, ordered by preference. Lower score = picked
      // first. We favour commonness (rank) but give longer words a mild boost so a level isn't
      // all 3-letter words.
      const subs = subWords(baseEntry, dict, 3)
      const score = (e) => e.rank - (e.len - 3) * 3000
      const targetCandidates = subs
        .filter(goodWord)
        .sort((a, b) => score(a) - score(b))
        .map((e) => e.word)
      // Require headroom so we skip threadbare bases in favour of richer letter sets.
      if (targetCandidates.length < pack.targetsMin + 1) continue

      const built = buildCrossword(base, targetCandidates, pack, rng)
      if (!built) continue

      const targetSet = new Set(built.placed.map((w) => w.word))
      // Bonus words: every valid sub-word (>=3) that is not a target.
      const bonus = subs.map((e) => e.word).filter((w) => !targetSet.has(w))

      const grid = normalize(built.placed, built.bounds)
      id++
      levels.push({
        id,
        pack: p + 1,
        packName: pack.name,
        theme: pack.theme,
        base,
        letters: base.toUpperCase().split(''),
        width: grid.width,
        height: grid.height,
        words: grid.words.map((w) => ({ word: w.word, row: w.row, col: w.col, dir: w.dir })),
        bonusWords: bonus.sort(),
      })
      usedBases.add(base)
      made++
    }
    process.stdout.write(`Pack ${pack.name}: ${made}/${pack.count} levels.\n`)
  }

  const packsMeta = PACKS.map((pk, i) => ({ id: i + 1, name: pk.name, theme: pk.theme }))
  const payload = { version: 1, generatedBy: 'generate-levels.mjs', packs: packsMeta, levels }

  mkdirSync(dirname(OUT), { recursive: true })
  writeFileSync(OUT, JSON.stringify(payload))
  const totalBonus = levels.reduce((n, l) => n + l.bonusWords.length, 0)
  process.stdout.write(
    `\nWrote ${levels.length} levels to ${OUT}\n` +
      `Avg targets/level: ${(levels.reduce((n, l) => n + l.words.length, 0) / levels.length).toFixed(1)}\n` +
      `Avg bonus/level: ${(totalBonus / levels.length).toFixed(1)}\n`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
