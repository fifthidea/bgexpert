// bgexpert PWA service worker.
// IMPORTANT: for every published app update, change BOTH CACHE_NAME and APP_VERSION.
const CACHE_PREFIX = "bgexpert-pwa-";
const CACHE_NAME = "bgexpert-pwa-v1";
const APP_VERSION = "1.0.1";
const META_CACHE_NAME = "bgexpert-meta";
const ACTIVE_INFO_URL = new URL("__bgexpert_active_cache_info__", self.registration.scope).href;
const CACHE_READY_URL = new URL("__bgexpert_cache_ready__", self.registration.scope).href;

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./dist/app.bundle.js",
  "./images/favicon/favicon.ico",
  "./images/abg-icon.png",
  "./images/about.png",
  "./images/back-icon.png",
  "./images/breathing.png",
  "./images/cell.png",
  "./images/donut-chart.png",
  "./images/logo.png",
  "./images/lungs.png",
  "./images/medmate.png",
  "./images/menu.png",
  "./images/pedicalc.png",
  "./images/ph.png",
  "./images/research.png",
  "./images/user.png",
  "./images/vbg-icon.png",
  "./manifest.json",
  "./icon256.png"
];

async function readActiveInfo() {
  const metaCache = await caches.open(META_CACHE_NAME);
  const response = await metaCache.match(ACTIVE_INFO_URL);
  if (!response) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function writeActiveInfo(info) {
  const metaCache = await caches.open(META_CACHE_NAME);
  await metaCache.put(
    ACTIVE_INFO_URL,
    new Response(JSON.stringify(info), {
      headers: { "Content-Type": "application/json" }
    })
  );
}

async function cacheIsReady(cacheName, version) {
  if (!cacheName || !(await caches.has(cacheName))) return false;
  const cache = await caches.open(cacheName);
  const marker = await cache.match(CACHE_READY_URL);
  if (!marker) return false;
  try {
    const details = await marker.json();
    return details.version === version;
  } catch {
    return false;
  }
}

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      // Fetch each asset with a version query to avoid reusing an old browser HTTP-cache
      // entry, then store it under its normal URL so the app can load normally offline.
      await Promise.all(FILES.map(async filePath => {
        const assetUrl = new URL(filePath, self.registration.scope);
        const downloadUrl = new URL(assetUrl.href);
        downloadUrl.searchParams.set("__bgexpert_version", APP_VERSION);
        const response = await fetch(downloadUrl.href, { cache: "reload" });
        if (!response.ok) {
          throw new Error(`Failed to cache ${filePath}: HTTP ${response.status}`);
        }
        await cache.put(assetUrl.href, response);
      }));
      // This marker tells the page that the entire candidate cache finished downloading.
      await cache.put(
        CACHE_READY_URL,
        new Response(JSON.stringify({ version: APP_VERSION }), {
          headers: { "Content-Type": "application/json" }
        })
      );

      // Keep the currently selected version and this new candidate. Remove older,
      // unselected candidates only when an active-version pointer already exists.
      const activeInfo = await readActiveInfo();
      if (activeInfo && activeInfo.cacheName) {
        const keys = await caches.keys();
        await Promise.all(keys
          .filter(key => key.startsWith(CACHE_PREFIX) &&
            key !== CACHE_NAME && key !== activeInfo.cacheName)
          .map(key => caches.delete(key)));
      }
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // Deliberately do NOT call skipWaiting(): choosing an app version is handled by the cache pointer.
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Keep the previously selected cache. A new worker activating must not silently
    // switch the user's app version or delete their previously selected version.
    const activeInfo = await readActiveInfo();
    if (!activeInfo || !(await caches.has(activeInfo.cacheName))) {
      await writeActiveInfo({ cacheName: CACHE_NAME, version: APP_VERSION });
    }
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (!event.data || event.data.type !== "BGEXPERT_SET_ACTIVE_CACHE") return;

  event.waitUntil((async () => {
    const cacheName = String(event.data.cacheName || "");
    const version = String(event.data.version || "");
    let result = { ok: false };

    // Accept only a completely downloaded bgexpert version cache.
    if (
      cacheName.startsWith(CACHE_PREFIX) &&
      cacheName !== META_CACHE_NAME &&
      version &&
      await cacheIsReady(cacheName, version)
    ) {
      await writeActiveInfo({ cacheName, version });
      // The user explicitly accepted this version, so older bgexpert caches are no
      // longer needed. A later declined candidate remains separate until accepted.
      const keys = await caches.keys();
      await Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== cacheName)
        .map(key => caches.delete(key)));
      result = { ok: true, cacheName, version };
    }

    if (event.ports && event.ports[0]) event.ports[0].postMessage(result);
  })());
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never answer version checks from cache. If offline, the page ignores this failure
  // and continues running the selected cached app.
  if (url.pathname.endsWith("/version.json")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" }).catch(() =>
        new Response("", { status: 503 })
      )
    );
    return;
  }

  event.respondWith((async () => {
    const info = await readActiveInfo();
    let activeCacheName = info && info.cacheName;
    if (!activeCacheName || !(await caches.has(activeCacheName))) {
      activeCacheName = CACHE_NAME;
    }
    const activeCache = await caches.open(activeCacheName);
    const cached = await activeCache.match(event.request);
    if (cached) return cached;

    try {
      const response = await fetch(event.request);
      if (response.ok) {
        await activeCache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (event.request.mode === "navigate") {
        const offlinePage = await activeCache.match(
          new URL("index.html", self.registration.scope).href
        );
        return offlinePage || new Response("Offline", { status: 503 });
      }
      return new Response("", { status: 503 });
    }
  })());
});
