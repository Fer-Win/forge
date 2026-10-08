# Forge: SPEC (source of truth)

Personal home-workout and running tracker. Single user, no login, no backend. Android-first PWA that feels like Strava / Nike Run Club / Strong and installs and runs smoothly in Chrome on Android.

## Working rules
1. Build one phase at a time (see Phases). Each phase: implement, typecheck + lint + tests, verify visually, commit, summarize, then STOP until the user says "next".
2. Visual verification: Playwright (Chromium) with "Pixel 7" emulation; walk main flows, take screenshots, look at them and fix layout issues before declaring a phase done.
3. Unit-test the logic that is easy to get wrong: timer engine, interval/run-plan engine, progressive overload, streak and PR calculation, plan scheduling rules.
4. No features outside this spec without asking. Prefer simple, reliable solutions. If ambiguous and it affects architecture, ask one concise question.

## Tech
- Next.js (App Router) + TypeScript (strict) + Tailwind CSS + Framer Motion.
- Installable PWA: web manifest, service worker, offline support, maskable icons, standalone display, theme-color matching background.
- All data in IndexedDB (Dexie) behind a repository interface so Firebase sync can be added later.
- Android/Chrome APIs: Screen Wake Lock (re-acquire on visible), Vibration, Web Audio beeps, Speech Synthesis for run cues, service-worker Notifications for reminders, Geolocation for optional run tracking, Web Share for images.
- Timers are timestamp-based (store start time, compute remaining), never setInterval counting.
- Charts: Recharts or lightweight SVG themed to match.

## User and equipment
- No gym. Two 5 kg dumbbells and one 10 kg dumbbell (2x5, 1x10, or 1x5), plus bodyweight and floor/wall.
- Every exercise must work with only this equipment. Progress via tempo, pauses, higher reps, single-arm/single-leg, unilateral work with the 10 kg, shorter rests.
- Goal: muscle/strength, fat loss, general fitness/stamina.
- 4-5 training days/week, ~45 min per session, including 1-2 runs. Can already run 30+ minutes nonstop.

## Design system (Strava-inspired, dark-first)
- Background #0B0B0F, cards #16161D, 16-20px radius, hairline borders (white at 6-8%). Single accent orange #FC4C02 (primary actions, rings, active states). Green = completed, amber = partial, muted grey = rest.
- Inter or Geist. Large bold tabular numerals for stats/timers. One hero number per screen.
- Pill buttons, segmented controls, circular progress rings, sticky bottom action bar, bottom sheets instead of modals, skeleton loaders, smooth transitions.
- Motion: subtle springs, press-scale 0.97, ring-fill/confetti on workout completion, haptic tick on every logged set. Respect prefers-reduced-motion.
- Single column, safe-area aware, 48px min tap targets, primary actions in thumb reach. Bottom tabs: Today, Plan, Run, Progress, Library. Each screen has exactly one primary action.

## UX principles
- Today answers "what do I do now?" in under 2 seconds; starting a workout is one tap.
- No typing mid-workout: steppers and values prefilled from last session.
- In a workout, timer and current set are the largest elements.
- Forgiving: undo for every check-off, easy rescheduling of missed days, no guilt-trip copy.
- One-handed, sweaty, high-contrast, big text.

## Default weekly plan (editable)
- Mon Push (chest, shoulders, triceps)
- Tue Pull (back, biceps, rear delts)
- Wed Run A (intervals or tempo, 35-45 min)
- Thu Legs + Core
- Fri Upper mix (chest + back supersets) + abs finisher
- Sat Run B (long or easy; optional, can swap for metabolic full-body circuit)
- Sun Rest / mobility
Strength sessions: 5 min warm-up, ~35 min work, 5 min cooldown, supersets, 45-75 s rests, metabolic finisher (5-min AMRAP or 40s/20s circuit). Rotate rep ranges across the week (6-10 slow/heavy-feeling, 12-20 endurance).

## Screens and features

### Onboarding (first run only, 3 steps)
Confirm equipment; training days and reminder time; running level (pre-selected 30+ min). Start date: today.

### Today
Date header, streak flame, weekly progress ring. Hero card for today's session (name, muscle groups, est. duration, exercise count) with big orange "Start workout". Exercise checklist with Completed / Skipped / Not done (day status derived). Quick actions: "Short on time (20 min)", swap workout, mark rest day, Easy/Normal/Hard toggle. Optional 1-5 energy/soreness check-in that suggests a lighter day when low.

### Plan
Editable week view, drag to move sessions. Avoid hard sessions for the same muscle group on consecutive days; avoid hard intervals the day before leg day.

### Guided workout (full screen)
- One exercise at a time: name, set X of Y, target reps, weight (e.g. "2x5 kg"), 2-3 form cues, easier/harder variation in a bottom sheet.
- Log reps and weight per set with big steppers, prefilled from last time.
- Rest timer auto-starts after each set (circular countdown, +/-15 s, skip). Countdown for timed holds with 3-2-1 beeps. Work/rest interval mode (e.g. 40s/20s). Superset support with shared rest timer.
- Auto-added warm-up and cooldown (toggleable), session progress bar, pause/resume, "End early" saves partial progress.
- Completion screen: duration, total volume, PRs, shareable summary card.

### Run module
- Types: Easy (30-45 min conversational); Tempo (10 min warm-up, 15-20 min comfortably hard, 5-10 min cooldown); Intervals (e.g. 10 min warm-up, 6-8x(2 min hard / 2 min easy), 10 min cooldown, plus variants); Long run (start 45 min, +~5 min/week up to 75).
- 8-week progression with a lighter week every 4th week; alternate Run A between intervals and tempo; optional 5K/10K goal.
- Run screen: giant segment countdown, next-segment preview, segment progress bar, total elapsed, beeps/vibration at every change, optional spoken cues.
- Optional GPS (wake lock on): distance, live pace, SVG route polyline, toggle to disable; manual entry after a run. Note: Chrome must stay in foreground for accurate tracking.
- Log each run: type, duration, distance, avg pace, effort (1-10), notes.

### Progress
Calendar heatmap (completed, partial, missed, rest, run), streaks, weekly completion %. Per-exercise charts (weight, reps, volume) with automatic PR detection. Running charts: weekly distance, pace trend, longest run. Optional bodyweight log with weekly-average trend. Weekly summary card with one insight.

### Library
Pre-seed 40+ exercises (name, muscle group, equipment, default sets/reps or duration, rest, form cues, easier/harder variation). Categories: Push, Pull, Chest, Back, Shoulders, Arms, Legs, Glutes, Abs/Core, Mobility, Warm-up, Cooldown, Finishers. Add/edit/delete custom exercises and workouts.

### Smart extras
- Progressive overload suggestions after hitting the top of the rep range on all sets for 2 sessions (more reps, slower tempo, single-arm, shorter rest, or the 10 kg).
- Daily reminder at chosen time plus an evening "not logged yet" nudge.
- Share a 1080x1920 dark/orange image of a finished workout or run via Web Share or download.
- Settings: units, sound, haptics, accent colour, JSON export/import of all data.

## Deliverables for running on Android
1. Fully working offline after first load.
2. `npm run dev -- -H 0.0.0.0` for previewing on phone over Wi-Fi.
3. DEPLOY.md with exact steps to deploy free to Firebase Hosting (preferred) or Vercel (HTTPS needed for install, wake lock, GPS).
4. Install steps on Android (open HTTPS URL in Chrome, menu > Install app, grant notification and location permissions).
5. Android tips: disable battery optimization for Chrome so reminders fire, keep screen on during runs, how the app mitigates background throttling.
6. Optional later: instructions only (do not build) for wrapping as APK with Capacitor or Bubblewrap.

## Phases (stop after each; user says "next")
1. Scaffold, design tokens, PWA shell, data layer, seed data, test setup, Playwright mobile harness.
2. Onboarding, Today screen, Plan, check-off logic.
3. Guided workout mode: timer engine, supersets, logging, completion screen.
4. Run module: interval engine, audio/speech cues, optional GPS.
5. Progress, Library, smart extras.
6. Polish (animations, empty states, accessibility, performance, Lighthouse PWA score) and DEPLOY.md.

## Definition of done (per phase)
Typecheck, lint and tests pass; Playwright Pixel 7 screenshots reviewed with no layout shift or horizontal scroll (360-430 px wide); tap targets >= 48 px; works offline; committed.

## Decisions (approved plan)
- Lives in `forge/` inside the Vegapunk repo; own package.json. Only commit files under `forge/`.
- Static export (`output: 'export'`), hand-written service worker, Dexie behind repo interfaces, pure-TS engines in `src/engine`, small Zustand store for in-flight session persisted to IndexedDB.
