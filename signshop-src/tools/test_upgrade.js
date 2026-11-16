// Upgrade check: serve the currently published build, create data, swap in the new build,
// confirm the update banner, data survival, and the locked company name and logo.
// usage: node test_upgrade.js <served_dir> <new_build_dir> <shots_dir>
// The caller serves <served_dir> on 127.0.0.1:8765 and fills it with the OLD build first.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [SERVED, NEWBUILD, SHOTS] = process.argv.slice(2);
const URL = 'http://127.0.0.1:8765/';
const copyDir = (a, b) => { fs.rmSync(b, { recursive: true, force: true }); fs.cpSync(a, b, { recursive: true }); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(500);
  console.log('old version:', await p.textContent('#appVer'));
  // old build: user had typed another shop name and saved a quote with a payment
  await p.goto(URL + '#prices'); await p.waitForTimeout(200);
  if (await p.$('#sName')) await p.fill('#sName', 'ชื่อเก่าที่พิมพ์ไว้');
  if (await p.$('#sAddr')) await p.fill('#sAddr', 'ที่อยู่เก่าที่พิมพ์ไว้');
  await p.fill('#sTax', '0405560001234'); await p.click('#saveCfg'); await p.waitForTimeout(200);
  await p.goto(URL + '#calc'); await p.fill('#cW', '300'); await p.fill('#cH', '100'); await p.fill('#cQty', '2'); await p.click('#addToQuote');
  await p.goto(URL + '#quote'); await p.waitForTimeout(300);
  await p.fill('#qName', 'ร้านกาแฟทดสอบ'); await p.click('#addPay'); await p.waitForTimeout(400);
  copyDir(NEWBUILD, SERVED);
  await p.goto(URL + '#prices'); await p.waitForTimeout(300); await p.click('#checkUpd'); await p.waitForTimeout(3000);
  console.log('update bar:', await p.isVisible('#updBar'));
  await p.click('#updBtn'); await p.waitForTimeout(2500);
  console.log('new version:', await p.textContent('#appVer'), '| whats-new:', await p.textContent('.whatsnew h2').catch(() => 'none'));
  await p.click('[data-close]').catch(() => {});
  console.log('data kept:', await p.evaluate(() => JSON.parse(localStorage.getItem('signq:quotes') || '[]').map(q => `${q.no} ${q.customer.name} paid=${(q.payments || []).length}`)));
  console.log('header:', await p.textContent('#hdrShop'), '| header logo:', await p.evaluate(() => document.getElementById('hdrLogo').naturalWidth));
  console.log('tax id kept:', await p.inputValue('#sTax'), '| name inputs left:', await p.$$eval('#sName, #sCompany, #sLogo', x => x.length));
  // try to override the name through saved settings: must stay locked
  await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('signq:config')); c.shop.name = 'ชื่ออื่น'; c.shop.logo = ''; c.shop.address = 'ที่อยู่อื่น'; localStorage.setItem('signq:config', JSON.stringify(c)); });
  await p.reload(); await p.waitForTimeout(800);
  console.log('after tamper header:', await p.textContent('#hdrShop'), '| locked address:', await p.textContent('#lockedAddr').catch(() => 'n/a'));
  await p.goto(URL + '#history'); await p.waitForTimeout(300); await p.click('[data-open]'); await p.waitForTimeout(400);
  await p.locator('#paper').screenshot({ path: path.join(SHOTS, 'quote-brand.png') });
  await p.click('[data-rcpt="0"]'); await p.waitForTimeout(300);
  const dlP = p.waitForEvent('download'); await p.click('#saveImg'); const dl = await dlP;
  await dl.saveAs(path.join(SHOTS, 'receipt-brand.png')); console.log('receipt image:', dl.suggestedFilename());
  await p.goto(URL + '#prices'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(SHOTS, 'settings-brand.png'), clip: { x: 640, y: 0, width: 640, height: 700 } });
  const m = await b.newPage({ viewport: { width: 390, height: 700 } });
  await m.goto(URL); await m.waitForTimeout(700);
  console.log('mobile overflow:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await m.screenshot({ path: path.join(SHOTS, 'mobile-brand.png') });
  console.log('errors:', errs);
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
