/* Offline cache for the one-file web version of Sardinia Skipper.
   The game page is NETWORK-FIRST: online you always get the newest version,
   offline (or on a very slow connection) the saved copy starts instead. */
const VERSION = 'skipper-web-v33';
const FILES = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const isPage = req => req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  if (isPage(req)) {
    const net = fetch(req, { cache: 'no-store' }).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); } return res; });
    const slow = new Promise(r => setTimeout(r, 5000)).then(() => caches.match('./index.html'));   // no answer in 5 s → play the saved copy
    e.respondWith(Promise.race([net.catch(() => caches.match('./index.html')), slow.then(hit => hit || net)]));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res; })));
});
