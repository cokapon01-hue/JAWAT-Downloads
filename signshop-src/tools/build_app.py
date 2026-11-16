"""Build the installable offline app (PWA) from the artifact page."""
import os, re, shutil, sys, json

SP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root
SRC = os.path.join(SP, 'src', 'sign-quote.html')
VEND = os.path.join(SP, 'vend')
OUT = sys.argv[1]
VERSION = sys.argv[2]

os.makedirs(os.path.join(OUT, 'fonts'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'vendor'), exist_ok=True)
os.makedirs(os.path.join(OUT, 'icons'), exist_ok=True)

# ---------- vendor + fonts ----------
shutil.copy(os.path.join(VEND, 'html2canvas-1.4.1/package/dist/html2canvas.min.js'), os.path.join(OUT, 'vendor/html2canvas.min.js'))
font_files, css = [], []
for fam, pkg, weights in [('sarabun', 'fontsource-sarabun-5.3.0', [400, 500, 600, 700]), ('kanit', 'fontsource-kanit-5.3.0', [500, 600])]:
    base = os.path.join(VEND, pkg, 'package')
    for sub in ['thai', 'latin']:
        for w in weights:
            c = open(os.path.join(base, f'{sub}-{w}.css'), encoding='utf8').read()
            c = re.sub(r"url\(\./files/([^)]+?\.woff2)\) format\('woff2'\),\s*url\([^)]+\) format\('woff'\)", r"url(\1) format('woff2')", c)
            css.append(c)
            fn = f'{fam}-{sub}-{w}-normal.woff2'
            shutil.copy(os.path.join(base, 'files', fn), os.path.join(OUT, 'fonts', fn))
            font_files.append('fonts/' + fn)
open(os.path.join(OUT, 'fonts/fonts.css'), 'w', encoding='utf8').write('\n'.join(css))
for lic, name in [('fontsource-sarabun-5.3.0', 'OFL-Sarabun.txt'), ('fontsource-kanit-5.3.0', 'OFL-Kanit.txt')]:
    shutil.copy(os.path.join(VEND, lic, 'package/LICENSE'), os.path.join(OUT, 'fonts', name))
shutil.copy(os.path.join(VEND, 'html2canvas-1.4.1/package/LICENSE'), os.path.join(OUT, 'vendor/LICENSE-html2canvas.txt'))

# ---------- page ----------
s = open(SRC, encoding='utf8').read()

def rep(a, b, count=1):
    global s
    n = s.count(a)
    assert n == count, (a[:90], n)
    s = s.replace(a, b)

head_old = s[:s.index('<style>')]
s = s[len(head_old):]
HEAD = f'''<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Total ad Sign · คิดราคาป้าย</title>
<meta name="description" content="คิดราคาป้าย ออกใบเสนอราคา ใบสั่งงานช่าง ติดตามมัดจำ สำหรับร้านป้าย">
<meta name="theme-color" content="#0a74b8">
<meta name="app-version" content="{VERSION}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Total ad Sign">
<link rel="stylesheet" href="fonts/fonts.css">
<script src="vendor/html2canvas.min.js"></script>
'''
s = HEAD + s

# base reset the artifact viewer used to provide
rep("* { box-sizing: border-box; }", """* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
:root { padding-top: env(safe-area-inset-top, 0px); padding-bottom: env(safe-area-inset-bottom, 0px); }
body { margin: 0; }
img { max-width: 100%; }""")

# extra CSS: update bar, install button, print, backup
rep("/* overlay & toast */", """/* app bar: update / install */
.updbar { background: var(--accent); color: var(--accent-ink); }
.updbar .wrap { padding-block: 10px; display: flex; gap: 12px; align-items: center; flex-wrap: wrap; justify-content: space-between; }
.updbar .btn { background: var(--accent-ink); color: var(--accent); border-color: var(--accent-ink); }
.ver { font-size: .75rem; color: var(--muted); }
.whatsnew ul { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.whatsnew h3 { margin-top: 6px; }
.backup-state { padding: 10px 12px; border-radius: 8px; background: var(--surface-2); border: 1px solid var(--line); font-size: .92rem; }
.backup-state.old { border-color: var(--warn); color: var(--warn); }
#printRoot { display: none; }
@media print {
  @page { size: A4 portrait; margin: 0; }
  :root { padding: 0 !important; }
  html, body { background: #fff !important; margin: 0 !important; }
  body > *:not(#printRoot):not(.measure-host) { display: none !important; }
  #printRoot { display: block !important; }
  #printRoot .paper { width: 210mm !important; height: 296.8mm !important; min-height: 0 !important; overflow: hidden; padding: 10.5mm 11.6mm !important; transform: none !important; box-shadow: none !important; border-radius: 0 !important; break-after: page; page-break-after: always; }
  #printRoot .paper:last-child { break-after: auto; page-break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
/* overlay & toast */""")

# header: version + install button; update bar under header
rep("""        <div class="status" id="status"><span class="dot"></span><span id="statusText">กำลังเชื่อมต่อ…</span></div>""",
    """        <div class="status" id="status"><span class="dot"></span><span id="statusText">เก็บข้อมูลในเครื่องนี้</span> <span class="ver" id="appVer"></span></div>
        <button class="btn small primary" id="installBtn" type="button" hidden>ติดตั้งแอป</button>""")
rep("""</header>""", """</header>
<div class="updbar" id="updBar" hidden role="status"><div class="wrap"><span><b>มีเวอร์ชันใหม่แล้ว</b> · ข้อมูลร้านและใบเสนอราคาเดิมไม่หาย</span><button class="btn small" id="updBtn" type="button">อัปเดตเลย</button></div></div>""")

# print button
rep("""            <button class="btn" id="copyText" type="button">คัดลอกข้อความส่ง LINE</button>""",
    """            <button class="btn" id="copyText" type="button">คัดลอกข้อความส่ง LINE</button>
            <button class="btn" id="printBtn" type="button">พิมพ์ / PDF</button>""")

# backup + update card in prices tab (before save bar)
rep("""      <div class="savebar">""", """      <div class="card" style="margin-top:20px">
        <h2>สำรองข้อมูล และอัปเดตโปรแกรม</h2>
        <p class="muted" style="margin:0">ข้อมูลทั้งหมดเก็บอยู่ในเครื่องนี้ สำรองเป็นไฟล์ไว้ทุกสัปดาห์ ถ้าเครื่องเสียหรือเปลี่ยนเครื่อง เอาไฟล์นั้นมากู้คืนได้</p>
        <div class="backup-state" id="backupState"></div>
        <div class="actions">
          <button class="btn primary" id="exportBtn" type="button">สำรองข้อมูลเป็นไฟล์</button>
          <label class="btn" for="importFile">กู้คืนจากไฟล์</label><input type="file" id="importFile" accept=".json,application/json" hidden>
          <button class="btn" id="checkUpd" type="button">ตรวจหาอัปเดต</button>
          <button class="btn" id="showNews" type="button">ดูว่ามีอะไรใหม่</button>
        </div>
      </div>
      <div class="savebar">""")

# image: share on phones (all pages at once), download elsewhere
i = s.index("async function deliverImages(files) {")
j = s.index("/* end deliverImages */", i)
s = s[:i] + """async function deliverImages(files) {
  const fs = files.map(f => new File([f.blob], f.name, { type: 'image/png' }));
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: fs })) {
    try { await navigator.share({ files: fs, title: files[0].name }); return true; } catch (err) { if (err && err.name === 'AbortError') return true; }
  }
  files.forEach((f, i) => setTimeout(() => downloadBlob(f.blob, f.name), i * 400));
  toast(files.length > 1 ? `บันทึกรูป A4 ${files.length} หน้าแล้ว` : 'บันทึกรูป A4 แล้ว'); return true;
}
""" + s[j:]

# replace the cloud-database boot block with the app runtime
i = s.index("(async () => {\n  let d = null;")
j = s.index("})();\n</script>")
APP = r"""/* ---------- app: version, updates, backup ---------- */
const APP_VERSION = '__VERSION__';
const CHANGELOG = __CHANGELOG__;
function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const vcmp = (a, b) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); } return 0; };
function showWhatsNew(since) {
  const list = CHANGELOG.filter(c => !since || vcmp(c.v, since) > 0);
  if (!list.length) return;
  showOverlay(`<div class="whatsnew"><h2>มีอะไรใหม่ในเวอร์ชัน ${esc(APP_VERSION)}</h2>${list.map(c => `<h3>เวอร์ชัน ${esc(c.v)} · ${thDate(c.date)}</h3><ul>${c.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}</div>`);
}
$('#appVer').textContent = 'v' + APP_VERSION;
setMode('local', 'เก็บข้อมูลในเครื่องนี้');
(() => { const last = store.get('lastVersion'); if (last && last !== APP_VERSION) showWhatsNew(last); store.set('lastVersion', APP_VERSION); })();
$('#showNews').addEventListener('click', () => showWhatsNew(null));
function fillPrint() {
  let root = document.getElementById('printRoot');
  if (!root) { root = document.createElement('div'); root.id = 'printRoot'; document.body.appendChild(root); }
  const { host, pages } = paginateSheet($('#paper'));
  root.replaceChildren(...pages); host.remove();
}
window.addEventListener('beforeprint', fillPrint);
$('#printBtn').addEventListener('click', () => { fillPrint(); window.print(); });
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch {}

/* backup */
function renderBackup() {
  const t = store.get('lastBackup'), el = $('#backupState');
  const days = t ? Math.floor((Date.now() - t) / 864e5) : null;
  el.className = 'backup-state' + (days === null || days > 7 ? ' old' : '');
  el.textContent = t ? `สำรองล่าสุด ${new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}${days > 7 ? ` (ผ่านมา ${days} วันแล้ว ควรสำรองใหม่)` : ''} · มีใบเสนอราคา ${quotes.length} ใบ`
    : `ยังไม่เคยสำรองข้อมูล · มีใบเสนอราคา ${quotes.length} ใบ`;
}
$('#exportBtn').addEventListener('click', () => {
  const data = { app: 'signshop', version: APP_VERSION, exportedAt: new Date().toISOString(), config, quotes, draft: quote };
  downloadBlob(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), `สำรองข้อมูลร้านป้าย-${todayISO()}.json`);
  store.set('lastBackup', Date.now()); renderBackup(); toast('สำรองข้อมูลแล้ว เก็บไฟล์ไว้ในที่ปลอดภัย');
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
  let data; try { data = JSON.parse(await f.text()); } catch { toast('ไฟล์นี้อ่านไม่ได้ ใช้ไฟล์ที่ได้จากปุ่มสำรองข้อมูล'); return; }
  if (!data || data.app !== 'signshop' || !Array.isArray(data.quotes)) { toast('ไฟล์นี้ไม่ใช่ไฟล์สำรองของโปรแกรมนี้'); return; }
  showOverlay(`<h2>กู้คืนข้อมูล</h2><p style="margin:0">ไฟล์สำรองวันที่ ${thDate(String(data.exportedAt).slice(0, 10))} มีใบเสนอราคา ${data.quotes.length} ใบ และราคาของร้าน “${esc(data.config?.shop?.name || '')}”</p><p class="muted" style="margin:0">ราคาและข้อมูลร้านจะถูกแทนด้วยของในไฟล์ ใบเสนอราคาจะรวมกับที่มีอยู่ ใบเดียวกันจะเก็บฉบับที่แก้ล่าสุด</p><div class="actions"><button class="btn primary" type="button" id="doImport">กู้คืน</button></div>`);
  $('#doImport').addEventListener('click', () => {
    const byId = new Map(quotes.map(q => [q.id, q]));
    for (const q of data.quotes) { const cur = byId.get(q.id); if (!cur || num(q.updatedAt) >= num(cur.updatedAt)) byId.set(q.id, q); }
    quotes = Array.from(byId.values()); store.set('quotes', quotes);
    if (data.config) { config = normalizeCfg(data.config); store.set('config', config); cfgDirty = false; }
    document.querySelector('.overlay')?.remove();
    applyConfig(); renderHistory(); renderBackup(); toast('กู้คืนข้อมูลแล้ว');
  });
});
renderBackup();

/* install */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#installBtn').hidden = false; });
$('#installBtn').addEventListener('click', async () => { if (!deferredInstall) return; deferredInstall.prompt(); try { await deferredInstall.userChoice; } catch {} deferredInstall = null; $('#installBtn').hidden = true; });
window.addEventListener('appinstalled', () => { $('#installBtn').hidden = true; toast('ติดตั้งแล้ว เปิดได้จากหน้าจอหลัก'); });

/* updates (service worker) */
let swReg = null, waitingWorker = null;
function offerUpdate(w) { waitingWorker = w; $('#updBar').hidden = false; }
$('#updBtn').addEventListener('click', () => { if (waitingWorker) waitingWorker.postMessage('SKIP_WAITING'); else location.reload(); });
$('#checkUpd').addEventListener('click', async () => {
  if (!swReg) { toast(location.protocol === 'file:' ? 'เปิดจากไฟล์ในเครื่อง ตรวจอัปเดตอัตโนมัติไม่ได้' : 'ยังตรวจอัปเดตไม่ได้ ลองใหม่อีกครั้ง'); return; }
  try { await swReg.update(); } catch {}
  setTimeout(() => { if (swReg.waiting || swReg.installing) offerUpdate(swReg.waiting || waitingWorker); else toast(`ใช้เวอร์ชันล่าสุดอยู่แล้ว (v${APP_VERSION})`); }, 1500);
});
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    swReg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(w); });
    });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloading) return; reloading = true; location.reload(); });
}
"""
CHANGELOG = json.load(open(os.path.join(SP, 'changelog.json'), encoding='utf8'))
APP = APP.replace('__VERSION__', VERSION).replace('__CHANGELOG__', json.dumps(CHANGELOG, ensure_ascii=False))
s = s[:i] + APP + s[j:]
rep("const store = {\n  get(k) { try { const v = localStorage.getItem('signq:' + k)", "const store = {\n  get(k) { try { const v = localStorage.getItem('signq:' + k)")
# Chromium drops non-ASCII download names, so files are named by number/date only
s, n = re.subn(r"\$\{quote\.customer\.name \? '-' \+ quote\.customer\.name\.replace\(.*?\.slice\(0, 40\) : ''\}", "", s)
assert n == 1, n
rep("`สำรองข้อมูลร้านป้าย-${todayISO()}.json`", "`signshop-backup-${todayISO()}.json`")
s = s.replace("toast('ตัวสร้างรูปยังโหลดไม่เสร็จ ลองใหม่อีกครั้ง')", "toast('ตัวสร้างรูปโหลดไม่สำเร็จ ลองเปิดโปรแกรมใหม่')")
s = s.rstrip() + '\n</html>\n'
# close body is implicit; make the document well-formed
s = s.replace('<header class="top">', '</head>\n<body>\n<header class="top">', 1)
s = s.replace('\n</html>\n', '\n</body>\n</html>\n')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(s)

# ---------- manifest ----------
manifest = {
    "name": "Total ad Sign · คิดราคาป้าย", "short_name": "Total ad Sign", "lang": "th",
    "description": "คิดราคาป้าย ออกใบเสนอราคา ใบสั่งงานช่าง ติดตามมัดจำ",
    "start_url": "./", "scope": "./", "display": "standalone",
    "background_color": "#ffffff", "theme_color": "#0a74b8",
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
    ]
}
json.dump(manifest, open(os.path.join(OUT, 'manifest.webmanifest'), 'w', encoding='utf8'), ensure_ascii=False, indent=2)

# ---------- service worker ----------
assets = ['./', 'index.html', 'manifest.webmanifest', 'fonts/fonts.css', 'vendor/html2canvas.min.js',
          'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'] + font_files
SW = f"""// คิดราคาป้าย service worker: keeps the app working offline and installs new versions.
// To release an update, change VERSION (build_app.py does this). Shop data lives in localStorage and is never touched here.
const VERSION = '{VERSION}';
const CACHE = 'signshop-' + VERSION;
const ASSETS = {json.dumps(assets, ensure_ascii=False)};

self.addEventListener('install', e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {{ cache: 'reload' }})))));
}});
self.addEventListener('message', e => {{ if (e.data === 'SKIP_WAITING') self.skipWaiting(); }});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('signshop-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
}});
self.addEventListener('fetch', e => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {{
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }}
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
}});
"""
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf8').write(SW)
print('built', OUT, VERSION, len(s), 'bytes')

# ---------- icons ----------
import subprocess
subprocess.run([sys.executable, '-I', os.path.join(SP, 'tools', 'make_icons.py'), os.path.join(OUT, 'icons')], check=True)
