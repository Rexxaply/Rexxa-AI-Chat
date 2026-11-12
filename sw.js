// REXXA AI service worker – bisa dibuka offline, permintaan ke API AI tidak pernah di-cache.
const VERSION = 'rexxa-v14-unduh-link';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png', './icons/badge-96.png'];
const CDN = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // chat API (POST) langsung ke internet
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CDN.includes(url.hostname)) return; // /models dll. tidak di-cache

  if (req.mode === 'navigate') {                           // halaman: utamakan versi terbaru
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {            // aset: cache dulu, perbarui di belakang
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

// ---- Notifikasi push (chapter manga baru, dll.) ----
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'REXXA AI', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'REXXA AI', {
    body: d.body || '', icon: d.icon || './icons/icon-192.png', badge: './icons/badge-96.png',
    tag: d.tag || undefined, renotify: !!d.tag, vibrate: [200, 100, 200],
    data: { url: d.url || './#manga' },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || './#manga', self.location.href).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    if (url.startsWith(self.location.origin)) {
      for (const c of list) if (c.url.startsWith(self.location.origin) && 'focus' in c) { c.navigate && c.navigate(url); return c.focus(); }
    }
    return self.clients.openWindow(url);
  }));
});
