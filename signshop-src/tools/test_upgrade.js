// Upgrade check: serve the currently published build, create data, swap in the new build,
// confirm the update banner, data survival, and the receipt + company settings features.
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
  await p.fill('#cW', '300'); await p.fill('#cH', '100'); await p.fill('#cQty', '2'); await p.click('#addToQuote');
  await p.goto(URL + '#quote'); await p.waitForTimeout(300);
  await p.fill('#qName', 'ร้านกาแฟทดสอบ'); await p.click('#addPay'); await p.waitForTimeout(400);
  // swap in the new release
  copyDir(NEWBUILD, SERVED);
  await p.goto(URL + '#prices'); await p.waitForTimeout(300); await p.click('#checkUpd'); await p.waitForTimeout(3000);
  console.log('update bar:', await p.isVisible('#updBar'));
  await p.click('#updBtn'); await p.waitForTimeout(2500);
  console.log('new version:', await p.textContent('#appVer'), '| whats-new:', (await p.textContent('.whatsnew h2').catch(() => 'none')));
  await p.click('[data-close]').catch(() => {});
  const kept = await p.evaluate(() => JSON.parse(localStorage.getItem('signq:quotes') || '[]').map(q => `${q.no} ${q.customer.name} paid=${(q.payments || []).length}`));
  console.log('data kept:', kept);
  // company settings + logo
  await p.goto(URL + '#prices'); await p.waitForTimeout(300);
  await p.fill('#sCompany', 'บริษัท ป้ายดี จำกัด'); await p.fill('#sBranch', 'สำนักงานใหญ่');
  await p.fill('#sTax', '0405560001234'); await p.fill('#sReceiver', 'นางสาวสมใจ ใจดี');
  await p.check('#sVatReg');
  const logo = path.join(SHOTS, 'logo-test.png');
  await p.setInputFiles('#sLogo', logo); await p.waitForTimeout(500);
  await p.click('#saveCfg'); await p.waitForTimeout(300);
  console.log('company saved:', await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('signq:config')); return [c.shop.company, c.shop.branch, c.shop.taxId, !!c.shop.logo, c.shop.logo.length]; }));
  // open the saved quote, add the balance payment, view receipts
  await p.goto(URL + '#history'); await p.waitForTimeout(300);
  await p.click('[data-open]'); await p.waitForTimeout(400);
  await p.fill('#qTax', '0105551234567'); await p.check('#qVat');
  await p.click('#saveQuote'); await p.waitForTimeout(300);
  console.log('pay list:', await p.textContent('#payList'));
  await p.click('[data-rcpt="0"]'); await p.waitForTimeout(400);
  await p.locator('#paper').screenshot({ path: path.join(SHOTS, 'receipt-deposit.png') });
  await p.selectOption('#pMethod', 'เงินสด'); await p.click('#addPay'); await p.waitForTimeout(500);
  await p.locator('#paper').screenshot({ path: path.join(SHOTS, 'receipt-final.png') });
  console.log('receipt picker options:', await p.$$eval('#rcptPick option', os => os.map(o => o.textContent)));
  const dlP = p.waitForEvent('download'); await p.click('#saveImg'); const dl = await dlP;
  await dl.saveAs(path.join(SHOTS, 'receipt-export.png')); console.log('receipt image:', dl.suggestedFilename());
  await p.click('#paperSeg [data-mode="quote"]'); await p.waitForTimeout(200);
  await p.locator('#paper').screenshot({ path: path.join(SHOTS, 'quote-company.png') });
  const m = await b.newPage({ viewport: { width: 390, height: 900 } });
  await m.goto(URL + '#quote'); await m.waitForTimeout(600);
  console.log('mobile overflow:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await m.screenshot({ path: path.join(SHOTS, 'mobile-quote.png'), fullPage: false });
  console.log('errors:', errs);
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
