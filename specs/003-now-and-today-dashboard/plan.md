# Implementation Plan: Now and Today Dashboard

**Branch**: `003-now-and-today-dashboard` | **Date**: 2026-11-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-now-and-today-dashboard/spec.md`

## Summary

Replace the stacked desktop dashboard with a mobile-first shell: a user header with an account panel and an admin-only menu panel, a bottom tab bar (Now, History, Locations/All locations), and a light/dark theme. The Now tab gets a "right now" card, a 24-hour price timeline with best hours and one tabbed usage chart. A new All-locations page compares a user's locations.

All data comes from the existing API except one gap found in research: hourly prices are only returned for hours that have consumption, so the full-day price timeline needs a new read-only prices endpoint in the API repo (`no.sanddata.ams.api`). It is a small addition because the API already stores prices per zone and hour. The work therefore ships as two PRs, API first.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Vite, Node 22+

**Primary Dependencies**: React Router 7, TanStack Query 5, Recharts via `components/ui/chart.tsx`, Tailwind CSS 4, shadcn/ui (Radix), lucide-react. No new runtime dependency.

**Storage**: Browser `localStorage` for selected location, chart period/unit and theme preference (per device). Refresh token handling is unchanged.

**Testing**: Vitest + React Testing Library + user-event + MSW, per the constitution. Pure helpers (price level, best hours, period ranges, series building) get unit tests.

**Target Platform**: Mobile browsers first (360 px and up), desktop browsers second. Installable PWA is out of scope.

**Project Type**: Web application (frontend repo) plus one small endpoint in the separate API repo.

**Performance Goals**: Now tab content visible within 2 s on a mid-range phone on 4G. Chart interactions respond within 100 ms.

**Constraints**: Europe/Oslo time via `features/dashboard/format.ts`. Server remains the authority for roles. Charts use the shared chart wrapper. UI uses shadcn primitives and Tailwind utilities, not ad-hoc CSS.

**Scale/Scope**: 1 to about 5 locations per user. Three tabs, two panels, about 15 new components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Feature-sliced structure | Pass | New slice `features/overview`; shell pieces (tab bar, header, panels, theme) live in `src/components/`. Overview reads dashboard data only through `features/dashboard/index.ts`, not its internals. |
| II. One gateway to the API | Pass | New calls are added to the slices' `api.ts` and use `api.get`. |
| III. Server state via TanStack Query | Pass | Hierarchical keys, explicit `refetchInterval`, `enabled` on selection. The overview uses `useQueries`. Theme and tab state stay in component state or `localStorage`, not in the query cache. |
| IV. Validated forms | Pass | No new forms. |
| V. Session and access safety | Pass | Menu visibility is UX only; `AdminRoute` and the API still enforce access. No tokens or emails are logged or put in URLs. |
| VI. Typed, lint-clean, verified | Pass | `any` is not used; build, lint and tests run before merge. |
| VII. Tests with Vitest/RTL/MSW | Pass | Behaviour-level tests with MSW; no mocking of `apiClient` or hooks. |
| Stack constraint: shadcn/Tailwind, no ad-hoc CSS | Pass with note | Colours become theme tokens in `index.css` (the existing `:root` / `.dark` blocks), not component-level CSS. Semantic price colours (cheap, normal, expensive) are added as tokens. |
| Stack constraint: new runtime dependency needs justification | Pass | None added. |

**Post-design re-check**: Pass. One justified deviation is recorded under Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/003-now-and-today-dashboard/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── prices-endpoint.md
└── tasks.md              # created by /speckit-tasks
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── routes.tsx                     # tabs become routes: /, /history, /locations
│   └── ThemeProvider.tsx              # follow-device / light / dark, persisted
├── components/
│   ├── AppLayout.tsx                  # mobile shell: header, outlet, tab bar
│   ├── Header.tsx                     # user chip, menu button (admin), location switcher
│   ├── TabBar.tsx
│   ├── SidePanel.tsx                  # accessible drawer (Escape, focus trap, return focus)
│   ├── AccountPanel.tsx
│   ├── MenuPanel.tsx
│   └── ui/                            # existing shadcn primitives (+ sheet if added via shadcn)
├── features/
│   ├── dashboard/
│   │   ├── NowCard.tsx                # replaces CurrentHourCard
│   │   ├── PriceTimeline.tsx
│   │   ├── UsageChart.tsx             # replaces PowerChart / HourlyCostChart / DailyCostChart
│   │   ├── HistoryPage.tsx
│   │   ├── priceLevel.ts              # thirds, best hours, trend (pure)
│   │   ├── periods.ts                 # Day/Week/Month/Year ranges and previous period (pure)
│   │   ├── series.ts                  # builds chart rows from API data (pure)
│   │   ├── api.ts / hooks.ts / types.ts   # extended
│   │   └── index.ts                   # public exports for other slices
│   └── overview/
│       ├── OverviewPage.tsx
│       ├── LocationSummaryCard.tsx
│       ├── hooks.ts                   # useQueries per location
│       └── summary.ts                 # totals and shares (pure)
└── index.css                          # semantic tokens for both themes

tests/ are colocated as *.test.ts(x), with MSW handlers in src/test/.
```

**Structure Decision**: Keep the existing feature-sliced layout. The shell (header, tab bar, panels, theme) is shared UI, so it lives in `src/components/` and `src/app/`. Dashboard logic stays in `features/dashboard`. The multi-location page is its own slice, `features/overview`, which only consumes the dashboard slice's public exports.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Work spans two repos (frontend plus one API endpoint) | The price timeline, best hours and price pill need prices for hours without consumption, which the existing endpoints cannot return | Frontend-only would leave out upcoming best hours and weaken the price pill, which is the main reason for the feature |
