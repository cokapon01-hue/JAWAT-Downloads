// A4 lock check (v1.5.0+): on-screen sheet, exported image size, multi-page split, print PDF size.
// usage: node test_a4.js <shots_dir>   (serve the built app on 127.0.0.1:8765 first)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const SHOTS = process.argv[2], URL = 'http://127.0.0.1:8765/';
let fails = 0;
const expect = (label, got, want) => { const ok = String(got) === String(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${got}${ok ? '' : ` (want ${want})`}`); };
const pngSize = f => { const b = fs.readFileSync(f); return `${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`; };
async function exportImages(p) {
  const got = [], saving = [];
  p.on('download', d => { const f = path.join(SHOTS, 'a4-' + d.suggestedFilename()); got.push(f); saving.push(d.saveAs(f)); });
  await p.click('#saveImg'); await p.waitForTimeout(6000); await Promise.all(saving);
  p.removeAllListeners('download'); return got.sort();
}
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL + '#quote'); await p.waitForTimeout(800);
  const sheet = await p.evaluate(() => { const el = document.getElementById('paper'), box = document.getElementById('paperBox'); const r = el.getBoundingClientRect(); return { w: el.offsetWidth, h: el.offsetHeight, shownW: Math.round(r.width), boxH: box.offsetHeight, shownH: Math.round(r.height) }; });
  expect('sheet layout size', `${sheet.w}x${sheet.h}`, '794x1123');
  expect('box fits scaled sheet', Math.abs(sheet.boxH - sheet.shownH) <= 1, true);
  console.log('  shown at', sheet.shownW, 'x', sheet.shownH);
  await p.locator('#paperBox').screenshot({ path: path.join(SHOTS, 'a4-screen.png') });
  let files = await exportImages(p);
  expect('one-page image count', files.length, 1);
  expect('image is A4 at 2x', files[0] && pngSize(files[0]), '1588x2246');
  // print: A4 portrait, one page
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await p.emulateMedia({ media: 'print' });
  const pdf = await p.pdf({ preferCSSPageSize: true, printBackground: true }); fs.writeFileSync(path.join(SHOTS, 'a4-print.pdf'), pdf);
  const txt = pdf.toString('latin1');
  expect('print pages', (txt.match(/\/Type\s*\/Page[^s]/g) || []).length, 1);
  const mb = (txt.match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/) || []).slice(1).map(Number);
  expect('print page is A4 (pt)', mb.length && Math.abs(mb[0] - 595.3) < 2 && Math.abs(mb[1] - 841.9) < 2, true);
  await p.emulateMedia({ media: 'screen' });
  // long quote: 40 lines must split into A4 pages
  await p.fill('#qName', 'ลูกค้างานยาว'); await p.waitForTimeout(100);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('signq:draft')); d.example = false; d.items = Array.from({ length: 40 }, (_, i) => ({ id: 'x' + i, desc: 'ป้ายไวนิล รายการที่ ' + (i + 1), detail: 'ขนาด 100×200 ซม.', qty: 1, price: 400 })); localStorage.setItem('signq:draft', JSON.stringify(d)); });
  await p.reload(); await p.waitForTimeout(800);
  files = await exportImages(p);
  console.log('  long quote images:', files.map(f => path.basename(f)).join(', '));
  expect('long quote split into pages', files.length >= 2 && files.every((f, i) => f.endsWith(`-p${i + 1}.png`)), true);
  expect('every page is A4', files.every(f => pngSize(f) === '1588x2246'), true);
  await p.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await p.emulateMedia({ media: 'print' });
  const pdf2 = await p.pdf({ preferCSSPageSize: true, printBackground: true }); fs.writeFileSync(path.join(SHOTS, 'a4-print-long.pdf'), pdf2);
  expect('long print pages = image pages', (pdf2.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length, files.length);
  await p.emulateMedia({ media: 'screen' });
  // phone: tap to zoom
  const m = await b.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(URL + '#quote'); await m.waitForTimeout(700);
  const before = await m.evaluate(() => Math.round(document.getElementById('paper').getBoundingClientRect().width));
  await m.click('#paperBox'); await m.waitForTimeout(200);
  const after = await m.evaluate(() => Math.round(document.getElementById('paper').getBoundingClientRect().width));
  expect('phone sheet scaled then zoomed', `${before < 400}->${after}`, 'true->794');
  expect('phone page overflow', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await m.click('#paperBox'); await m.waitForTimeout(200);
  await m.screenshot({ path: path.join(SHOTS, 'a4-phone.png') });
  console.log('errors:', errs, '| fails:', fails);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
