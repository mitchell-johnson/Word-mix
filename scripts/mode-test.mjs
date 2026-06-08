// Verify the 4/5/6 letter-mode selector: switching changes wheel size + resets level number,
// and the choice persists across reload.
import { chromium } from 'playwright'

const URL = process.env.URL || 'http://localhost:4178/'
const results = []
const ok = (name, cond, extra = '') => {
  results.push(!!cond)
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
const page = await ctx.newPage()
const errs = []
page.on('console', (m) => m.type() === 'error' && errs.push(m.text()))
page.on('pageerror', (e) => errs.push('ERR:' + e.message))

await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForSelector('.wheel-hub')
await page.waitForTimeout(400)

ok('default mode shows 4 tiles', (await page.locator('.wheel-tile').count()) === 4)

async function pickMode(n) {
  await page.locator('button[aria-label="Settings"]').click()
  await page.waitForTimeout(300)
  await page.locator(`button[aria-pressed]:has-text("${n}")`).first().click()
  await page.waitForTimeout(500)
}

await pickMode(5)
ok('5-letter mode shows 5 tiles', (await page.locator('.wheel-tile').count()) === 5)
ok('level number resets to 1 in new mode', (await page.locator('text=Level 1').count()) > 0)
await page.screenshot({ path: 'scripts/.cache/shots/mode-5.png' })

await pickMode(6)
ok('6-letter mode shows 6 tiles', (await page.locator('.wheel-tile').count()) === 6)
await page.screenshot({ path: 'scripts/.cache/shots/mode-6.png' })

await pickMode(4)
ok('back to 4-letter mode shows 4 tiles', (await page.locator('.wheel-tile').count()) === 4)

// persistence of the chosen mode
await pickMode(6)
await page.reload({ waitUntil: 'networkidle' })
await page.waitForSelector('.wheel-hub')
await page.waitForTimeout(400)
ok('chosen mode persists across reload', (await page.locator('.wheel-tile').count()) === 6)

ok('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))

await browser.close()
const failed = results.filter((r) => !r).length
console.log(`\n${results.length - failed}/${results.length} checks passed.`)
process.exit(failed ? 1 : 0)
