const CACHE_NAME = 'gl-cache-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
];

// Cache-first for static assets ON INSTALL
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Clean up old caches ON ACTIVATE
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// Network-first for everything to enable sane development and updates
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // API calls: always network-first
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(event.request)
                .catch(() => new Response(
                    JSON.stringify({ error: 'Offline' }),
                    { status: 503, headers: { 'Content-Type': 'application/json' } }
                ))
        );
        return;
    }

    // Static assets: NETWORK-FIRST, fallback to cache
    event.respondWith(
        fetch(event.request).then((response) => {
            // Cache successful responses
            if (response.ok && event.request.method === 'GET') {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, clone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
