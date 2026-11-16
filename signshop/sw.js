// คิดราคาป้าย service worker: keeps the app working offline and installs new versions.
// To release an update, change VERSION (build_app.py does this). Shop data lives in localStorage and is never touched here.
const VERSION = '1.2.0';
const CACHE = 'signshop-' + VERSION;
const ASSETS = ["./", "index.html", "manifest.webmanifest", "fonts/fonts.css", "vendor/html2canvas.min.js", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "fonts/sarabun-thai-400-normal.woff2", "fonts/sarabun-thai-500-normal.woff2", "fonts/sarabun-thai-600-normal.woff2", "fonts/sarabun-thai-700-normal.woff2", "fonts/sarabun-latin-400-normal.woff2", "fonts/sarabun-latin-500-normal.woff2", "fonts/sarabun-latin-600-normal.woff2", "fonts/sarabun-latin-700-normal.woff2", "fonts/kanit-thai-500-normal.woff2", "fonts/kanit-thai-600-normal.woff2", "fonts/kanit-latin-500-normal.woff2", "fonts/kanit-latin-600-normal.woff2"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('signshop-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});
