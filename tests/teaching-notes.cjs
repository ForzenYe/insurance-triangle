// Run: node tests/teaching-notes.cjs
// Requires Playwright and Chromium (available in the cloud environment).
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const html = fs.readFileSync(path.join(__dirname, '../保障金三角_依照公版_修正版.html'));
(async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    const fields = page.locator('input[data-key]');
    assert.equal(await fields.count(), 30);
    for (let i = 0; i < 30; i++) await fields.nth(i).fill(i ? String(1000 + i) : '驗收測試客戶');
    const values = () => fields.evaluateAll(xs => xs.map(x => x.value));
    const originalValues = await values();
    const storage = () => page.evaluate(() => localStorage.getItem('protection_triangle_reference_v6'));
    const originalStorage = await storage();
    const arrows = page.locator('.teaching-arrows > path');
    const geometry = () => arrows.evaluateAll(xs => xs.map(x => ({
      d: x.getAttribute('d'), stroke: x.getAttribute('stroke'),
      width: x.getAttribute('stroke-width'), marker: x.getAttribute('marker-end'),
      rect: x.getBoundingClientRect().toJSON(),
    })));
    assert.equal(await arrows.count(), 3);
    const originalGeometry = await geometry();
    assert.deepEqual(originalGeometry.map(x => x.d), [
      'M1035 536 L1102 536', 'M910 530 Q936 542 906 581', 'M609 718 Q614 747 651 747',
    ]);
    const toggle = page.getByRole('button', { name: '顯示／隱藏講解註解' });
    for (const mode of ['shown', 'hidden', 'restored']) {
      if (mode !== 'shown') await toggle.click();
      const visible = mode !== 'hidden';
      assert.equal(await page.locator('.teaching-note').count(), 13);
      for (const note of await page.locator('.teaching-note,.illness-cluster').all()) {
        assert.equal(await note.isVisible(), visible);
      }
      assert.equal(await page.locator('.teaching-arrows').isVisible(), true);
      assert.equal(await arrows.evaluateAll(xs => xs.every(x => x.getClientRects().length > 0 && getComputedStyle(x).visibility === 'visible')), true);
      assert.deepEqual(await geometry(), originalGeometry);
      assert.deepEqual(await values(), originalValues);
      assert.equal(await storage(), originalStorage);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.teaching-arrows').isVisible(), true);
      assert.equal(await arrows.evaluateAll(xs => xs.every(x => x.getClientRects().length > 0 && getComputedStyle(x).visibility === 'visible')), true);
      assert.equal(await page.locator('.teaching-notes').isVisible(), visible);
      assert.deepEqual(await values(), originalValues);
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      assert.equal([...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length, 1);
      await page.emulateMedia({ media: 'screen' });
      if (mode !== 'restored') {
        await page.screenshot({ path: path.join(__dirname, `../review-images/notes-${mode}.png`), fullPage: true });
      }
      console.log(`PASS ${mode}: arrows, notes, 30 fields, storage, single-page print`);
    }
    await page.reload();
    assert.deepEqual(await values(), originalValues);
    assert.deepEqual(errors, []);
    console.log('PASS reload preserves data; no JavaScript errors');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
