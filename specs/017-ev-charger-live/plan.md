# Implementation Plan: The Car Charger's State Right Now

**Branch**: `017-ev-charger-live` | **Date**: 2026-11-24 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/017-ev-charger-live/spec.md`

## Summary

API spec 021 answers `GET /api/locations/{id}/ev-charger/state`. The app reads it in `getEvChargerState`, which turns
a state it doesn't know into `unknown`, through one query, `useEvChargerState`, every 3 minutes, shared by the Car tab
and the Now page (research R1, R2). Pure helpers in `evCharger.ts` turn the answer into the tile's texts, the picture's
mode and the Now line (R3, R4). The Car tab gets a new top tile, `EvChargerStateCard`, with the drawing
`EvChargerPicture`, an SVG whose cable carries a green line while charging, animated in CSS as the water heater's glow
is (R5). `NowCard` shows the line while charging (R6).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, shadcn/ui, Tailwind 4. **No new dependencies.**

**Storage**: none. The state is only shown, never kept beyond the query cache.

**Testing**: Vitest + Testing Library + MSW.

- `evCharger.test.ts`: the tile's view and the Now line for every state, times today and on an earlier day, kWh
  missing or 0, the age.
- `api.test.ts`: an unknown `state` reads as `unknown`.
- `EvChargerPage.test.tsx`: the tile's texts, the picture's moving line only while charging, unavailable on 503, the
  rest of the tab shown, the reworded hint.
- `NowCard.test.tsx` or `DashboardPage.test.tsx`: the line while charging only; no request without a charger (MSW
  fails on an unhandled request).

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-005).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**: one request per 3 minutes per open page, shared between the two pages (SC-003).

**Constraints**: API spec 021 deployed; the live figures are never summed into anything (FR-008); no movement with
reduced motion (FR-012).

**Scale/Scope**: `types.ts`, `api.ts`, `hooks.ts`, `evCharger.ts`, `format.ts` (one helper), `EvChargerPage.tsx`, two
new components, `NowCard.tsx`, `DashboardPage.tsx`, `index.css`, and their tests; `src/test/evCharger.ts` fixtures.

## Constitution Check

| Principle             | How the plan meets it                                                                                               | Status |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | All in `features/dashboard`, beside the Car tab and the water heater.                                               | ✅     |
| II. One gateway       | `getEvChargerState` through `api.get`; the unknown-state normalising is in `api.ts`.                                | ✅     |
| III. TanStack Query   | One hook, stable key `['ev-charger', 'state', id]`, `enabled`, 3-minute interval.                                   | ✅     |
| IV. Forms             | No forms.                                                                                                           | ✅ n/a |
| V. Session safety     | Nothing stored or logged; no ids beyond the location's.                                                             | ✅     |
| VI. Typed, lint-clean | States typed as a union; Tailwind classes in the SVG; the one keyframe lives in `index.css` as `.heater-glow` does. | ✅     |
| VII. Tests            | Every state's texts, the picture's mode, the Now line, the polling rules.                                           | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

```text
specs/017-ev-charger-live/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui.md          # the tile's and the line's texts, the picture's modes
├── picture-preview.html     # the drawing agreed with Roy
├── checklists/requirements.md
└── tasks.md

src/
├── index.css                                  # .cable-flow keyframes, still with reduced motion
├── test/evCharger.ts                          # liveState() fixture
└── features/dashboard/
    ├── types.ts, api.ts, hooks.ts             # EvChargerLiveState, getEvChargerState, useEvChargerState
    ├── evCharger.ts (+ test)                  # liveView(), chargingNowLine()
    ├── format.ts (+ test)                     # formatOsloTimeOrDate()
    ├── EvChargerPicture.tsx                   # the drawing
    ├── EvChargerStateCard.tsx                 # the tile
    ├── EvChargerPage.tsx (+ test)             # tile on top, hint reworded
    ├── NowCard.tsx (+ test)                   # the line
    └── DashboardPage.tsx                      # passes hasEvCharger to NowCard
```

**Structure Decision**: the existing `features/dashboard` slice, as specs 013 and 016.

## Complexity Tracking

None.
