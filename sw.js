/* Мои финансы: работа без интернета. Лежит рядом с index.html. */
const VER = 'mf-v1';
const CORE = ['./', 'index.html', 'icon.png', 'apple-touch-icon.png', 'moi-finansy-header-art.png','moi-finansy-neon-background.png'];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VER).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function withTimeout(p, ms) {
  return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout')), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
}

async function pageRequest(req) {
  const cache = await caches.open(VER);
  try {
    const net = await withTimeout(fetch(req), 4000);
    if (net && net.ok) cache.put('index.html', net.clone());
    return net;
  } catch (err) {
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VER);
  const hit = await cache.match(req, { ignoreSearch: true });
  const fresh = fetch(req).then(net => { if (net && (net.ok || net.type === 'opaque')) cache.put(req, net.clone()); return net; }).catch(() => null);
  return hit || (await fresh) || Response.error();
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) { e.respondWith(pageRequest(req)); return; }
    if (url.pathname.endsWith('sw.js')) return;
    e.respondWith(staleWhileRevalidate(req));
    return;
  }
  if (FONT_HOSTS.includes(url.hostname)) e.respondWith(staleWhileRevalidate(req));
});
