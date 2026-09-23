/* サッと食レポ サービスワーカー：アプリ本体をキャッシュしてオフライン起動可能に */
var CACHE = "satto-v1";
var ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
      .catch(function () {})
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (x) { return; }
  /* 同一オリジン（アプリ本体）はキャッシュ優先でオフライン起動。外部（地図・EXIF・フォント）は素通し */
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cc) { cc.put(req, copy); }).catch(function () {});
          return res;
        }).catch(function () { return caches.match("./index.html"); });
      })
    );
  }
});
