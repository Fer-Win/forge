/* Forge service worker: offline shell. Bump VERSION to invalidate caches. */
const VERSION = 'forge-v3';
const SHELL = ['/', '/today/', '/plan/', '/run/', '/progress/', '/library/', '/settings/', '/onboarding/', '/workout/', '/run/active/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Network first, fall back to cache, then to the Today shell.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/today/') || caches.match('/'))),
    );
    return;
  }

  // Static assets: cache first, then network (and remember it).
  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => {
      for (const c of list) if ('focus' in c) return c.focus();
      return self.clients.openWindow('/today/');
    }),
  );
});

/* ---- Reminders with the app closed (best effort: Chrome decides if and when this runs) ---- */
function idbOpen() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('forge');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function idbAll(db, store) {
  return new Promise((resolve) => {
    try {
      const q = db.transaction(store).objectStore(store).getAll();
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => resolve([]);
    } catch (e) {
      resolve([]);
    }
  });
}
function idbPut(db, store, value) {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}
const pad2 = (n) => String(n).padStart(2, '0');
const toMin = (t) => { const p = String(t || '18:00').split(':'); return Number(p[0]) * 60 + Number(p[1] || 0); };

async function checkReminders() {
  const db = await idbOpen();
  try {
    const settings = (await idbAll(db, 'settings'))[0];
    if (!settings || !settings.reminders) return;
    const now = new Date();
    const today = now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [days, overrides, sessions, runs, checks] = await Promise.all(
      ['planDays', 'planOverrides', 'sessions', 'runs', 'exerciseChecks'].map((s) => idbAll(db, s)),
    );
    const ov = overrides.find((o) => o.date === today);
    const wd = (now.getDay() + 6) % 7;
    const planned = ov ? ov.assignment : (days.find((d) => d.weekday === wd) || {}).assignment;
    if (!planned || planned.type === 'rest') return;
    const logged =
      sessions.some((s) => s.date === today) || runs.some((r) => r.date === today) ||
      checks.some((c) => c.date === today && c.status === 'done');
    if (logged) return;
    const daily = toMin(settings.reminderTime);
    const evening = daily >= 19 * 60 ? 21 * 60 : 20 * 60;
    let kind = null;
    if (nowMin >= evening) { if (settings.lastEveningNudge !== today) kind = 'evening'; }
    else if (nowMin >= daily && settings.lastDailyNudge !== today) kind = 'daily';
    if (!kind) return;
    if (kind === 'daily') settings.lastDailyNudge = today; else settings.lastEveningNudge = today;
    await idbPut(db, 'settings', settings);
    await self.registration.showNotification(
      kind === 'daily' ? 'Time to train' : 'Not logged yet',
      {
        body: kind === 'daily' ? "Today's session is ready. One tap to start." : 'A short session still counts. Keep your week moving.',
        tag: 'forge-' + kind,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      },
    );
  } finally {
    db.close();
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'forge-reminders') event.waitUntil(checkReminders().catch(() => {}));
});
