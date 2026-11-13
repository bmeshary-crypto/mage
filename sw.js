/* MAGE Sport — offline cache so the car screen opens instantly.
   - The page itself: network first (always the newest version), cached copy if the network is slow or gone.
   - Libraries and fonts (unpkg, Google Fonts, map fonts): cache first — they never change. */
const V = 'mage-v2';
const LIBS = /(^|\.)unpkg\.com$|fonts\.googleapis\.com$|fonts\.gstatic\.com$/;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);

  if (LIBS.test(u.hostname) || (u.hostname === 'tiles.openfreemap.org' && u.pathname.startsWith('/fonts/'))) {
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
    return;
  }

  if (u.origin === self.location.origin) {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; });
      try {
        return await Promise.race([net, new Promise((_, no) => setTimeout(no, 3500))]);
      } catch (x) {
        const hit = await c.match(req, { ignoreSearch: true });
        if (hit) return hit;
        return net;
      }
    })());
  }
});
