/* サッと食レポ サービスワーカー
   ページ本体はネットワーク優先（更新を確実に反映）＋オフライン時キャッシュ。
   アイコン等の静的資産はキャッシュ優先。 */
var CACHE = "satto-v2";
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
  if (url.origin !== location.origin) return; /* 外部（地図・EXIF・フォント）は素通し */

  var isDoc = req.mode === "navigate" || url.pathname.endsWith("/") || url.pathname.endsWith("index.html");
  if (isDoc) {
    /* ページ：ネットワーク優先。成功したらキャッシュ更新、失敗（オフライン）ならキャッシュ */
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put("./index.html", copy); }).catch(function () {});
        return res;
      }).catch(function () {
        return caches.match("./index.html").then(function (c) { return c || caches.match("./"); });
      })
    );
  } else {
    /* 静的資産：キャッシュ優先＋裏で取得 */
    e.respondWith(
      caches.match(req).then(function (cached) {
        return cached || fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); }).catch(function () {});
          return res;
        }).catch(function () { return cached; });
      })
    );
  }
});
