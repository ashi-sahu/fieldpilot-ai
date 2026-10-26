// Minimal service worker: lets the app be installed and keeps static files available offline.
// Pages and API calls always go to the network, so personal data is never cached here.
const CACHE = 'fieldpilot-static-v1';
const CORE = ['/static/style.css', '/static/shared.js', '/static/icons/icon-192.png'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);
    if (req.method !== 'GET' || url.origin !== location.origin) return;
    if (url.pathname.startsWith('/static/')) {
        event.respondWith(caches.open(CACHE).then(cache => cache.match(req).then(hit => {
            const fresh = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
            return hit || fresh;
        })));
        return;
    }
    if (req.mode === 'navigate') {
        event.respondWith(fetch(req).catch(() => new Response(
            '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:system-ui;padding:2rem"><h2>You are offline</h2><p>FieldPilot needs an internet connection to load your farm data. Please reconnect and try again.</p>',
            { headers: { 'Content-Type': 'text/html' } })));
    }
});
