// End-to-end smoke test: render, swipe-to-solve, bonus word, level completion, persistence.
import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'node:fs'

// Data-driven so it survives level regeneration: use level 1's real words.
const { levels } = JSON.parse(readFileSync('src/data/levels.json', 'utf8'))
const L1 = levels[0]
const L1_TARGETS = L1.words.map((w) => w.word.toUpperCase())
const L1_FIRST = L1_TARGETS[0] // a grid word to solve first
const L1_BONUS = (L1.bonusWords[0] || '').toUpperCase() // a bonus word

const URL = process.env.URL || 'http://localhost:4178/'
const SHOTS = 'scripts/.cache/shots'
mkdirSync(SHOTS, { recursive: true })

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, pass: !!cond, extra })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text()))
page.on('pageerror', (e) => consoleErrors.push('PAGEERROR: ' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.wheel-hub', { timeout: 8000 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${SHOTS}/01-initial.png` })

ok('grid renders cells', (await page.locator('.cell').count()) > 0)
ok('wheel renders all tiles', (await page.locator('.wheel-tile').count()) === L1.letters.length)
ok('top bar shows Level 1', (await page.locator('text=Level 1').count()) > 0)

// Read tile letter → viewport center.
async function tileCenters() {
  return page.$$eval('.wheel-tile', (els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect()
      return { letter: el.textContent.trim(), x: r.left + r.width / 2, y: r.top + r.height / 2 }
    }),
  )
}

async function swipe(word) {
  const tiles = await tileCenters()
  const used = new Set() // a repeated letter must use a different tile each time
  const path = [...word].map((ch) => {
    const t = tiles.find((t) => t.letter === ch && !used.has(t))
    if (t) used.add(t)
    return t
  })
  if (path.some((p) => !p)) throw new Error('missing tile for ' + word)
  await page.mouse.move(path[0].x, path[0].y)
  await page.mouse.down()
  for (let i = 1; i < path.length; i++) await page.mouse.move(path[i].x, path[i].y, { steps: 6 })
  await page.mouse.up()
  await page.waitForTimeout(700)
}

// Solve the first grid word.
await swipe(L1_FIRST)
await page.screenshot({ path: `${SHOTS}/02-after-solve.png` })
const filledAfter = await page.locator('.cell--filled').count()
ok(`first word (${L1_FIRST}) filled grid cells`, filledAfter >= L1_FIRST.length, `${filledAfter} filled`)
ok('progress shows a solve', (await page.locator(`text=/[1-9] \\/ ${L1_TARGETS.length}/`).count()) > 0)

// Bonus word → +5 coins. The coin counter is the only top-bar pill with a coin disc.
const coinsLoc = page.locator('.glass-pill:has(.coin-disc) .tabnum').first()
const readCoins = async () => parseInt((await coinsLoc.textContent()) || '0', 10)
const coinsBefore = await readCoins()
if (L1_BONUS) {
  await swipe(L1_BONUS)
  await page.screenshot({ path: `${SHOTS}/03-after-bonus.png` })
  const coinsAfter = await readCoins()
  ok(`bonus word (${L1_BONUS}) awarded coins`, coinsAfter === coinsBefore + 5, `${coinsBefore} → ${coinsAfter}`)
} else {
  console.log('SKIP  bonus-coin check — level 1 has no bonus words')
}

// Finish the level — solve every remaining target.
for (const w of L1_TARGETS) if (w !== L1_FIRST) await swipe(w)
await page.waitForTimeout(900)
await page.screenshot({ path: `${SHOTS}/04-complete.png` })
const completeShown = (await page.locator('text=LEVEL COMPLETE').count()) > 0
ok('level complete overlay appears', completeShown)

// Advance and verify persistence across reload.
if (completeShown) {
  await page.locator('button:has-text("Next Level")').click({ force: true })
  await page.waitForTimeout(500)
}
ok('advanced to Level 2', (await page.locator('text=Level 2').count()) > 0)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.wheel-hub')
await page.waitForTimeout(400)
ok('resumes Level 2 after reload (persistence)', (await page.locator('text=Level 2').count()) > 0)
await page.screenshot({ path: `${SHOTS}/05-after-reload.png` })

ok('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

await browser.close()

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`)
process.exit(failed.length ? 1 : 0)
