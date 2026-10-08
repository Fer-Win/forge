# Forge: project rules

Personal workout + running PWA. **Read SPEC.md before each phase.** Work one phase at a time; stop after each and wait for "next".

## Stack
Next.js App Router (static export) + TypeScript strict + Tailwind + Framer Motion + Dexie (IndexedDB) + Zustand + Vitest + Playwright (Pixel 7).

## Commands
- `npm run dev -- -H 0.0.0.0` dev server reachable from phone
- `npm run typecheck` / `npm run lint` / `npm test`
- `npm run build` static export to `out/`
- `npm run shots` Playwright Pixel 7 screenshots to `shots/`

## Conventions
- UI talks to data only through repo interfaces in `src/data/repos`; never import Dexie in components.
- Engines in `src/engine` are pure TS (no React/DOM) with co-located `*.test.ts`.
- Timers are timestamp-based; never count setInterval ticks.
- Design tokens live in `src/styles/tokens.css`; no hard-coded colors in components.
- 48px minimum tap targets; safe-area aware; respect prefers-reduced-motion.
- No features outside SPEC.md without asking.

## Definition of done (per phase)
typecheck + lint + tests pass; Pixel 7 screenshots reviewed (no horizontal scroll, 360-430px); tap targets >= 48px; works offline; committed with `git add forge` only (the parent repo has unrelated changes; never stage them).
