// End-to-end check of the installable app: offline cache, data persistence, image export, update flow.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');
const SP = process.argv[2], APP = process.argv[3], URL = 'http://127.0.0.1:8765/';
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(URL); await p.waitForTimeout(800);
  await p.evaluate(() => navigator.serviceWorker.ready); await p.waitForTimeout(500);
  console.log('version label:', await p.textContent('#appVer'));
  console.log('fonts loaded:', await p.evaluate(() => document.fonts.check('16px Sarabun') && document.fonts.check('600 16px Kanit')));
  // make a quote and save it
  await p.fill('#cW', '300'); await p.fill('#cH', '100'); await p.fill('#cQty', '2');
  await p.click('#addToQuote');
  await p.goto(URL + '#quote'); await p.waitForTimeout(300);
  await p.fill('#qName', 'ลูกค้าทดสอบ');
  await p.click('#saveQuote'); await p.waitForTimeout(300);
  // image export (html2canvas, local)
  const dlP = p.waitForEvent('download', { timeout: 15000 });
  await p.click('#saveImg');
  const dl = await dlP; const imgPath = require('os').tmpdir() + '/signshop-export.png'; await dl.saveAs(imgPath);
  console.log('image saved:', dl.suggestedFilename(), fs.statSync(imgPath).size, 'bytes');
  // offline reload
  await ctx.setOffline(true);
  await p.reload(); await p.waitForTimeout(800);
  console.log('offline reload ok:', await p.textContent('#hdrShop'), '| quotes saved:', await p.evaluate(() => JSON.parse(localStorage.getItem('signq:quotes') || '[]').length));
  await ctx.setOffline(false);
  // release 1.0.1 and check the update banner
  const cl = JSON.parse(fs.readFileSync(SP + '/changelog.json', 'utf8'));
  fs.writeFileSync(SP + '/changelog.test.json', JSON.stringify([{ v: '1.0.1', date: '2026-11-17', items: ['ทดสอบการอัปเดต'] }, ...cl]));
  fs.copyFileSync(SP + '/changelog.json', SP + '/changelog.bak.json');
  fs.copyFileSync(SP + '/changelog.test.json', SP + '/changelog.json');
  execSync(`python3 -I ${SP}/tools/build_app.py ${APP} 1.0.1`);
  fs.copyFileSync(SP + '/changelog.bak.json', SP + '/changelog.json');
  await p.click('a[data-tab="prices"]'); await p.click('#checkUpd'); await p.waitForTimeout(3000);
  console.log('update bar visible:', await p.isVisible('#updBar'));
  await p.click('#updBtn'); await p.waitForTimeout(2500);
  console.log('after update version:', await p.textContent('#appVer'), '| whats-new shown:', await p.isVisible('.whatsnew'));
  console.log('quotes kept after update:', await p.evaluate(() => JSON.parse(localStorage.getItem('signq:quotes') || '[]').map(q => q.no + ' ' + q.customer.name)));
  console.log('errors:', errs);
  await b.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
