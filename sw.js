self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  return self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  // Pass-through fetch for minimal PWA behavior
});
