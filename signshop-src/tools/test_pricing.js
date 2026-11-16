// Custom pricing check (v1.3.0+): regular-customer discount / per-material rates and per-job overrides.
// usage: node test_pricing.js <shots_dir>   (serve the built app on 127.0.0.1:8765 first)
const { chromium } = require('playwright');
const path = require('path');
const SHOTS = process.argv[2];
const URL = 'http://127.0.0.1:8765/';
let fails = 0;
const expect = (label, got, want) => { const ok = String(got) === String(want); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${label}: ${got}${ok ? '' : ` (want ${want})`}`); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1100 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForTimeout(600);
  const per = () => p.evaluate(() => document.querySelector('#rSub').textContent);
  const total = () => p.evaluate(() => document.querySelector('#rTotal').firstChild.textContent.replace(/[^\d]/g, ''));
  // regular customers
  await p.goto(URL + '#prices'); await p.waitForTimeout(300);
  await p.click('[data-addrow="customers"]'); await p.fill('#cu0-name', 'ร้านประจำ A'); await p.fill('#cu0-phone', '081-111-1111'); await p.fill('#cu0-discount', '10');
  await p.click('[data-addrow="customers"]'); await p.fill('#cu1-name', 'ร้านประจำ B'); await p.fill('#cu1-taxId', '0105550000001'); await p.fill('#cu1-r-vinyl', '150');
  await p.click('#saveCfg'); await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(SHOTS, 'customers-settings.png'), fullPage: true });
  // reorder: drag the 3rd material to the top with the mouse, then move it back down with the keyboard
  const names = () => p.$$eval('#setMats [data-k="name"]', xs => xs.map(x => x.value).slice(0, 3).join(' | '));
  await p.$eval('#setMats', el => el.scrollIntoView({ block: 'center' })); await p.waitForTimeout(100);
  const g = await p.$('#setMats [data-grip][data-i="2"]'), top = await p.$('#setMats .set-row:not(.head)');
  const gb = await g.boundingBox(), tb = await top.boundingBox();
  await p.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2); await p.mouse.down();
  await p.mouse.move(gb.x + 5, tb.y + 4, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(200);
  expect('drag 3rd material to top', await names(), 'สติกเกอร์ PVC ขาว | ไวนิล พิมพ์อิงค์เจ็ท | ไวนิลหลังดำ (กันแสงทะลุ)');
  await p.focus('#setMats [data-grip][data-i="0"]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  expect('arrow keys move it back', await names(), 'ไวนิล พิมพ์อิงค์เจ็ท | ไวนิลหลังดำ (กันแสงทะลุ) | สติกเกอร์ PVC ขาว');
  await p.click('#saveCfg'); await p.waitForTimeout(200);
  await p.goto(URL + '#calc'); await p.waitForTimeout(200);
  expect('eyelet shows as included', (await p.textContent('#addonList')).includes('รวมในราคาแล้ว'), true);
  // calculator: vinyl 300x100 x2 with eyelets -> normal 620/pc
  await p.goto(URL + '#calc'); await p.waitForTimeout(300);
  await p.click('.mat:has(input[value="vinyl"])');
  await p.fill('#cW', '300'); await p.fill('#cH', '100'); await p.fill('#cQty', '2');
  expect('normal total (eyelets free)', await total(), '1080');
  const ids = await p.$$eval('#cCust option', os => os.map(o => o.value));
  await p.selectOption('#cCust', ids[1]); await p.waitForTimeout(150);
  expect('customer A (10% off) total', await total(), '980');
  console.log('  special:', await p.textContent('#rSpecial'));
  expect('LINE text mentions special price', (await p.textContent('#lineMsg')).includes('ราคาพิเศษสำหรับลูกค้าประจำ'), true);
  await p.screenshot({ path: path.join(SHOTS, 'calc-customer.png') });
  await p.selectOption('#cCust', ids[2]); await p.waitForTimeout(150);
  expect('customer B (vinyl 150/sqm) total', await total(), '900');
  await p.selectOption('#cCust', ''); await p.waitForTimeout(100);
  await p.click('#ovSeg [data-ov="pct"]'); await p.fill('#cOv', '20');
  expect('job 20% off total', await total(), '880');
  await p.click('#ovSeg [data-ov="sqm"]'); await p.fill('#cOv', '120');
  expect('job 120/sqm total', await total(), '720');
  await p.click('#ovSeg [data-ov="piece"]'); await p.fill('#cOv', '399');
  expect('job flat 399/pc total', await total(), '798');
  console.log('  size table first row:', await p.textContent('#sizeTable tbody tr'));
  await p.click('#ovSeg [data-ov="none"]');
  expect('back to normal', await total(), '1080');
  // add to quote as customer A: fills the customer
  await p.selectOption('#cCust', ids[1]);
  await p.click('#addToQuote'); await p.waitForTimeout(200);
  await p.goto(URL + '#quote'); await p.waitForTimeout(300);
  expect('quote customer filled', await p.inputValue('#qName'), 'ร้านประจำ A');
  expect('quote item price', await p.inputValue('#ip0'), '490');
  // regression: document tabs must not touch the calculator size
  await p.click('#paperSeg [data-mode="receipt"]'); await p.click('#paperSeg [data-mode="job"]'); await p.click('#paperSeg [data-mode="quote"]');
  expect('calculator size after switching documents', await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('signq:calc')); return `${c.w}x${c.h} ${c.unit}`; }), '300x100 cm');
  // pick customer B in the quote form
  await p.selectOption('#qCustPick', ids[2]); await p.waitForTimeout(200);
  expect('picked B name', await p.inputValue('#qName'), 'ร้านประจำ B');
  expect('picked B tax id', await p.inputValue('#qTax'), '0105550000001');
  // save a new customer from the quote
  await p.fill('#qName', 'ลูกค้าใหม่ C'); await p.click('#saveAsCust'); await p.waitForTimeout(300);
  expect('saved new regular customer', await p.evaluate(() => JSON.parse(localStorage.getItem('signq:config')).customers.map(c => c.name).join(',')), 'ร้านประจำ A,ร้านประจำ B,ลูกค้าใหม่ C');
  const m = await b.newPage({ viewport: { width: 390, height: 900 } });
  await m.goto(URL); await m.waitForTimeout(600);
  console.log('mobile overflow:', await m.evaluate(() => document.documentElement.scrollWidth - innerWidth));
  await m.screenshot({ path: path.join(SHOTS, 'mobile-calc.png'), fullPage: true });
  console.log('errors:', errs, '| fails:', fails);
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('FAIL', e); process.exit(1); });
