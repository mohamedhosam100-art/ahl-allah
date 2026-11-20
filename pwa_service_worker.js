'use strict';

const workerVersion = new URL(self.location.href).searchParams.get('v') || 'dev';
const cacheName = `ahl-allah-pwa-${workerVersion}`;
const shellAssets = [
  './',
  'index.html',
  'flutter_bootstrap.js',
  'flutter.js',
  'main.dart.js',
  'version.json',
  'manifest.json',
  'favicon.png',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
  'assets/AssetManifest.bin',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/assets/fonts/NotoNaskhArabic.ttf',
  'assets/assets/images/app_icon.png',
  'assets/fonts/MaterialIcons-Regular.otf',
  'assets/packages/cupertino_icons/assets/CupertinoIcons.ttf',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'canvaskit/chromium/canvaskit.js',
  'canvaskit/chromium/canvaskit.wasm',
  'canvaskit/webparagraph/canvaskit.js',
  'canvaskit/webparagraph/canvaskit.wasm',
  'canvaskit/skwasm.js',
  'canvaskit/skwasm.wasm',
  'canvaskit/skwasm_heavy.js',
  'canvaskit/skwasm_heavy.wasm',
  'canvaskit/wimp.js',
  'canvaskit/wimp.wasm',
];

const appScope = self.registration.scope;
const shellUrls = shellAssets.map((path) => new URL(path, appScope).href);
const isCacheableAsset = (request, url) =>
  request.mode === 'navigate' ||
  /\.(?:bin|css|frag|ico|js|json|otf|png|svg|ttf|wasm|webmanifest|woff2?)$/i.test(
    url.pathname,
  );

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => cache.addAll(shellUrls))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (name) =>
                (name.startsWith('ahl-allah-pwa-') && name !== cacheName) ||
                name.startsWith('flutter-app-cache') ||
                name.startsWith('flutter-temp-cache') ||
                name.startsWith('flutter-app-manifest'),
            )
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !isCacheableAsset(request, url)) {
    return;
  }

  const updatePromise = caches.open(cacheName).then(async (cache) => {
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      await cache.put(request, response.clone());
    }
    return response;
  });
  event.waitUntil(updatePromise.then(() => undefined, () => undefined));

  event.respondWith(
    caches.open(cacheName).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      try {
        return await updatePromise;
      } catch (_) {
        // Fall through to the cached app shell when offline.
      }

      if (request.mode === 'navigate') {
        const appShell = await cache.match(new URL('index.html', appScope).href);
        if (appShell) return appShell;
      }
      return Response.error();
    }),
  );
});
