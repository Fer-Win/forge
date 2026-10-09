# Deploying Forge

Forge is a static site: `npm run build` writes plain files to `out/`. There is no server, no database and no account. All data lives in the browser on your phone, so hosting is only about getting those files onto an HTTPS address.

HTTPS matters. Service workers (offline), GPS, notifications and install-to-home-screen all refuse to work on plain `http://` (except `localhost`).

## 1. Check it locally first

```
npm run typecheck && npm run lint && npm test
npm run build
npx serve out -l 3100
```

Open `http://localhost:3100/today/`. `npm run shots` runs the Playwright suite against the same build.

To try it on your phone before deploying: `npm run dev -- -H 0.0.0.0`, then open `http://<your-PC-IP>:3000` on the same Wi-Fi. The service worker and install prompt only work on the real HTTPS deploy, so use this just for layout checks.

## 2. Firebase Hosting (preferred)

One-time setup:

```
npm install -g firebase-tools
firebase login
firebase init hosting     # choose an existing/new project, public dir: out, single-page app: NO
```

`firebase.json` is already in the repo (it sets `public: out`, trailing slashes, and the cache headers below). If `firebase init` offers to overwrite it, say no.

Every release:

```
npm run build
firebase deploy --only hosting
```

Your app is then at `https://<project-id>.web.app`.

Why the headers matter:

| File | Cache | Reason |
| --- | --- | --- |
| `/sw.js` | `no-cache` | Phones must notice a new service worker straight away. |
| `*.html`, `manifest.webmanifest` | `no-cache` | New builds show up on next open. |
| `/_next/static/**` | 1 year, immutable | Hashed file names never change. |

## 3. Vercel (alternative)

Import the repo in Vercel (or run `npx vercel`). `vercel.json` sets the build command, `out` as the output directory and the same headers. Framework preset: Next.js is fine; the static export is picked up from `next.config.mjs`.

## 4. Install on Android

1. Open the deployed URL in **Chrome** on the phone and use the app once so it caches itself.
2. Chrome menu (three dots) > **Add to Home screen** > **Install**. It opens full screen with the Forge icon.
3. Long-press the icon for shortcuts: Today's workout, Start a run, Progress.

Updates: open the app while online. The new version installs in the background and takes over the next time you open it. If something looks stale, close the app fully and reopen it. To force an update for everyone, bump `VERSION` in `public/sw.js` before building.

## 5. Your data and backups

Everything is stored in the browser's IndexedDB on that phone. That means:

- Clearing Chrome's site data, uninstalling Chrome, or "Clear storage" for Forge **deletes your history**.
- Different URLs are different data. `forge.web.app` and `localhost` do not share anything.
- **Export a backup now and then**: Settings > Export backup saves `forge-backup-YYYY-MM-DD.json`. Settings > Import backup restores it on any device (it replaces what is there).
- Moving to a new phone or a new web address: export on the old one, import on the new one.

## 6. Things Chrome will not promise (and what to do)

**Reminders.** A web app cannot schedule an exact notification. Forge sends the daily and evening nudges when it can run: while the app is open in the background, and, if Chrome allows it, through a periodic background check for installed apps (roughly hourly at best, and only for sites you use often). Expect reminders to arrive late, sometimes not at all. For dependable timing, also set a phone alarm. Tips:

- Install the app (step 4) and allow notifications for it.
- Android Settings > Apps > Chrome (or Forge) > Battery > **Unrestricted** (not "Optimised").
- Turn off battery saver around your usual training time.

**GPS runs.** GPS only records while Chrome is in the foreground with the screen on. Forge keeps the screen awake during a run, so leave the app open and do not switch away. Distance can be slightly off in the first seconds and under tree cover. If tracking fails, finish the run and enter distance by hand, or use "Log a run" afterwards.

**Timers and screen.** Timers use the clock, not ticks, so they stay correct if the screen locks or the app is backgrounded; the sounds and vibration need the app to be open. Wake lock keeps the screen on during workouts and runs.

**Voice cues and sound.** Phones can block audio until you tap something. Tapping Start counts, so cues work once a workout or run has begun.

## 7. Lighthouse and quality checks

```
npm run build
npx serve out -l 3100 --no-clipboard     # in one terminal
npm run lighthouse                       # in another; writes lighthouse.html
```

Lighthouse 12 reports Performance, Accessibility, Best Practices and SEO. (Its old "PWA" score was removed. To check installability, open Chrome DevTools > Application > Manifest and Service workers.) Run `npm audit --omit=dev` before a release and review anything marked high.

## 8. Turning it into a store app later (notes only, nothing is set up)

Forge is a standard installable PWA, so there are two common routes if you ever want a Play Store listing. Neither is needed for personal use.

- **Trusted Web Activity (Bubblewrap / PWABuilder):** wraps the hosted site in a thin Android app. Needs the HTTPS URL, the manifest and icons already here, and a Digital Asset Links file served from `/.well-known/assetlinks.json`. Data stays in Chrome's storage for that origin.
- **Capacitor:** packages `out/` inside a native shell. This is the route if you later want true background GPS, exact scheduled notifications or Health Connect, because those need native plugins. Storage then lives in the app's own WebView, so export from the web version and import into the app.

## 9. Cost and privacy

Static hosting on Firebase or Vercel's free tier is enough for one user. Forge sends no analytics and makes no network calls of its own; the only outbound link is the optional "Watch how" button, which opens a YouTube search in a new tab.
