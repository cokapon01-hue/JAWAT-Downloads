// Saved sizes check (v1.6.0+): save, reuse, block duplicates, remove, survive reload, show in the table.
// usage: node test_sizes.js <shots_dir>   (serve the built app on 127.0.0.1:8765 first)
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2], URL = 'http://127.0.0.1:8765/';
let fails = 0;
const expect = (label, got, want) => { const ok = String(got) === String(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${got}${ok ? '' : ` (want ${want})`}`); };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '#calc'); await p.waitForTimeout(600);
  const chips = () => p.$$eval('#sizeChips [data-w]', xs => xs.map(x => x.textContent).join(' | '));
  const n0 = (await p.$$('#sizeChips [data-w]')).length;
  expect('built-in sizes listed', n0, 10);
  await p.fill('#cW', '245'); await p.fill('#cH', '122');
  expect('save button ready', await p.textContent('#saveSize'), '+ บันทึกขนาดนี้');
  await p.click('#saveSize'); await p.waitForTimeout(250);
  expect('saved size first', (await chips()).split(' | ')[0], '245 × 122');
  expect('save button now says saved', await p.textContent('#saveSize'), '✓ บันทึกขนาดนี้ไว้แล้ว');
  expect('saved size in price table', (await p.textContent('#sizeTable tbody tr')).startsWith('245 × 122'), true);
  // reuse: type something else, then tap the saved chip
  await p.fill('#cW', '10'); await p.fill('#cH', '10');
  await p.click('#sizeChips [data-w="245"]'); await p.waitForTimeout(150);
  expect('chip fills width/height', `${await p.inputValue('#cW')}x${await p.inputValue('#cH')}`, '245x122');
  // metre mode shows the same saved size in metres and treats it as saved
  await p.click('#uM'); await p.waitForTimeout(150);
  expect('metre labels', (await chips()).split(' | ')[0], '2.45 × 1.22');
  expect('metre mode recognises saved size', await p.isDisabled('#saveSize'), true);
  await p.click('#uCm');
  await p.screenshot({ path: path.join(SHOTS, 'sizes-calc.png'), clip: { x: 0, y: 150, width: 660, height: 560 } });
  // survives reload
  await p.reload(); await p.waitForTimeout(600);
  expect('saved size after reload', (await chips()).split(' | ')[0], '245 × 122');
  // remove a built-in size: first tap arms, second removes
  await p.click('#sizeChips [data-rmsize="1"]');
  expect('first tap only arms', (await p.$$('#sizeChips [data-w]')).length, n0 + 1);
  await p.click('#sizeChips [data-rmsize="1"]'); await p.waitForTimeout(250);
  expect('second tap removes 29.7 × 42', (await chips()).includes('29.7 × 42'), false);
  expect('stored sizes', await p.evaluate(() => JSON.parse(localStorage.getItem('signq:config')).sizes.length), n0);
  // backup contains sizes
  expect('backup export has sizes', await p.evaluate(() => Array.isArray(JSON.parse(localStorage.getItem('signq:config')).sizes)), true);
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(URL + '#calc'); await m.waitForTimeout(600);
  expect('phone overflow', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  console.log('errors:', errs, '| fails:', fails);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
