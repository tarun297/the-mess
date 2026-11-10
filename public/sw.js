// Minimal service worker so phones offer "Install app" / "Add to home screen".
// It doesn't cache anything: the app always shows live data from the server.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
