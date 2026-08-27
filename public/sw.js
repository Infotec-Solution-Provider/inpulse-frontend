const LEGACY_CACHE_PREFIX = "inpulse-pwa-";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key.startsWith(LEGACY_CACHE_PREFIX)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() || {};
  const title = payload.title || "InPulse";
  const options = {
    body: payload.body || "Você recebeu uma nova notificação.",
    ...(payload.icon ? { icon: payload.icon } : {}),
    tag: payload.tag,
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === destination && "focus" in client) {
          return client.focus();
        }
      }

      return clients.openWindow(destination);
    }),
  );
});
