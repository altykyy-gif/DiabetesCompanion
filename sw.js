const cacheName = "rafiq-v51";
const shell = [
  "./", "index.html", "app.js", "manifest.webmanifest",
  "nutrition.js", "glucose-lab.js", "glucose-study.json", "supervisor.js",
  "icons/icon-192.png", "icons/icon-512.png",
  "vendor/firebase-app-compat.js", "vendor/firebase-auth-compat.js",
  "vendor/firebase-firestore-compat.js"
];

self.addEventListener("install", event => {
  const assets = shell.map(path => new Request(new URL(path,self.registration.scope),{cache:"reload"}));
  event.waitUntil(caches.open(cacheName).then(cache => cache.addAll(assets)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => /^rafiq-v\d+$/.test(key) && key !== cacheName).map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const {request} = event;
  if (request.method !== "GET" || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    try {
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone()).catch(() => {});
      return response;
    } catch {
      return await cache.match(request, {ignoreSearch: true})
        || (request.mode === "navigate" ? await cache.match("index.html") : null)
        || Response.error();
    }
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type !== "clearProfileNotifications") return;
  event.waitUntil(self.registration.getNotifications().then(notifications => {
    for (const notification of notifications) notification.close();
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL("index.html#meds", self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: "window"});
    const client = windows.find(window => window.url.startsWith(self.registration.scope));
    if (!client) return self.clients.openWindow(target);
    await client.navigate(target);
    return client.focus();
  })());
});
