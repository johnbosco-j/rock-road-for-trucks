// Caches the app shell and OSM map tiles so ROCK keeps working offline.
const SHELL = 'rock-shell-v3', TILES = 'rock-tiles-v1';
const FILES = ['./', 'index.html', 'app.html', 'styles.css', 'app.js', 'art.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('rock-shell') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())));
// Leaflet and the downloader use the same URL form, so tiles match across a/b/c subdomains.
const tileKey = u => new Request(u.href.replace(/\/\/[abc]\.tile/, '//tile'));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (u.hostname.endsWith('tile.openstreetmap.org') || u.hostname === 'api.mapbox.com') {
    const key = tileKey(u);
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(key); if (hit) return hit;
      try { const r = await fetch(e.request); c.put(key, r.clone()); return r; } catch { return Response.error(); }
    }));
  } else if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(r => { const copy = r.clone(); caches.open(SHELL).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request)));
  } else if (u.hostname === 'unpkg.com' || u.hostname.startsWith('fonts.g')) {
    e.respondWith(caches.open(SHELL).then(async c => { const hit = await c.match(e.request); const net = fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }).catch(() => hit); return hit || net; }));
  }
});
