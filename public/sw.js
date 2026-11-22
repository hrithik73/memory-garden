// Offline support: pages come from the network when it's quick, otherwise from the cache;
// everything else is served from the cache and refreshed in the background.
const CACHE = 'garden-v6';
// './' only, not './index.html': hosts with clean URLs redirect that, and browsers refuse
// to open a page from a redirected response.
// canvaskit.wasm is what draws the garden on the web, so it's needed offline from the first visit
const CORE = ['./', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './canvaskit.wasm'];
const PAGE_TIMEOUT = 3000;
const MAX_BUNDLES = 20; // old hashed JS/CSS from earlier deploys are dropped beyond this

// a redirected response can't be used to answer a page load, so store a plain copy
const plain = (res) =>
  res.redirected ? res.blob().then((b) => new Response(b, { status: res.status, statusText: res.statusText, headers: res.headers })) : Promise.resolve(res);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(CORE.map((url) => fetch(url, { cache: 'reload' }).then((r) => (r.ok ? plain(r).then((p) => c.put(url, p)) : null)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimBundles(cache) {
  const keys = (await cache.keys()).filter((r) => new URL(r.url).pathname.startsWith('/_expo/static/'));
  // keys come back oldest first
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_BUNDLES)).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const network = fetch(e.request).then(async (res) => {
          if (res.ok) await cache.put('./', await plain(res.clone()));
          return plain(res);
        });
        e.waitUntil(network.catch(() => {})); // keep refreshing the cache even if the cached copy wins
        const cached = await cache.match('./');
        if (!cached) return network;
        // on a slow connection, don't keep the person waiting: show the cached copy
        const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), PAGE_TIMEOUT));
        return Promise.race([network.catch(() => cached), timeout]);
      })()
    );
    return;
  }

  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      const fresh = fetch(e.request)
        .then(async (res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            await cache.put(e.request, res.clone());
            if (new URL(e.request.url).pathname.startsWith('/_expo/static/')) trimBundles(cache);
          }
          return res;
        })
        .catch(() => cached || Response.error());
      if (cached) {
        e.waitUntil(fresh.catch(() => {}));
        return cached;
      }
      return fresh;
    })
  );
});
