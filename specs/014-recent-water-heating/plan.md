# Implementation Plan: Water Heating in the "Last 3 Hours" Chart

**Branch**: `014-recent-water-heating` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-recent-water-heating/spec.md`

## Summary

The "Last 3 hours" card gets the heater's power per 5 minutes from the API (its spec 017) and draws it under the
house's line. It is one new request, two changes to how the card builds its steps, and an extra area in the chart.

1. **Steps on the clock (R1, US2)**:
   - A pure `recentWindow(now)` puts the window's 36 steps on whole 5 minutes, ending with the step going on now.
   - `useRecentUsage` uses it.
   - The totals still compare the same elapsed time today and yesterday.
2. **A fair house power (R2)**: `bucketKw` averages over the minutes that have a reading. The step going on now then
   reads at its real power, as the heater's step does, instead of dipping.
3. **The heater steps (R3)**:
   - `getWaterHeaterPower` and `useRecentWaterHeater(id, startMs, enabled)` make a separate query, refreshed every
     minute.
   - It is enabled only for a location with a heater, with the same `startMs` as the house's query.
   - A failure there never holds back the house's power.
4. **Drawing (R4, US1)**:
   - `buildRecentUsage` takes the steps and gives each point `heater`, `heaterDrawn` (capped at the house), `rest` and
     `partly`.
   - `RecentUsage` draws `heaterDrawn` as an orange area under the blue line, with a "Water heating" legend entry and
     the split in the detail line.
5. **The share (R5, US3)**: `heaterKwh` and `heaterShare` in the result give the line "Water heating: 3,1 kWh of 21,17
   kWh (15 %)".

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**:

- Already in use: TanStack Query 5, Recharts (through `components/ui/chart.tsx`), Tailwind 4.
- **No new dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- **`series.test.ts`:**
  - `recentWindow`
  - `bucketKw` over the minutes with readings (one existing case changes, R2)
  - heater matching, capping at the house, `partly`, `heaterKwh` and `heaterShare`.
- **`RecentUsage.test.tsx`:**
  - the legend and the detail line with heater steps
  - none without a heater (and no request)
  - the error note
  - the share line.
- **`api.test.ts`:** `getWaterHeaterPower` sends `from` and `to`.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode.

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**:

- One extra request a minute, and only for locations with a heater.
- The house's figures render without waiting for it (SC-003, FR-009).

**Constraints**:

- No API change.
- Oslo time through `formatClock`.
- 5-minute steps on whole 5 minutes are the same in UTC and Oslo time.

**Scale/Scope**:

- **Changed:**
  - `series.ts`
  - `RecentUsage.tsx`
  - `hooks.ts` and `api.ts`
  - `types.ts`
  - `DashboardPage.tsx` (passes `hasWaterHeater`)
  - their tests.
- **New:** no files apart from the spec.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | How the plan meets it                                                                                                                                                               | Status |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | Everything is in `features/dashboard`.                                                                                                                                              | ✅     |
| II. One gateway       | `getWaterHeaterPower` is in `dashboard/api.ts` through `apiClient`.                                                                                                                 | ✅     |
| III. TanStack Query   | A new hook with a hierarchical key (`['water-heater','power',id,startMs]`), a 1-minute `refetchInterval`, and `enabled` on the heater flag and the window. No server data in state. | ✅     |
| IV. Forms             | No forms.                                                                                                                                                                           | ✅ n/a |
| V. Session safety     | Nothing new is stored or logged.                                                                                                                                                    | ✅     |
| VI. Typed, lint-clean | Strict types and the existing `--water-heater` token. No new library.                                                                                                               | ✅     |
| VII. Tests            | Pure tests for the window, the steps and the kWh, and MSW component tests for the card. R2's behaviour change comes with its updated test.                                          | ✅     |
| Oslo time / charts    | Labels via `formatClock`. The chart stays in `components/ui/chart.tsx`.                                                                                                             | ✅     |

**Re-check after Phase 1**: all pass, with no deviations. One spec example was corrected while planning: at 20:37 the
36 steps start at 17:40, not 17:35 (US2's independent test).

## Project Structure

### Documentation (this feature)

```text
specs/014-recent-water-heating/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── api.md           # what is sent and read
│   └── ui.md            # the texts and where they go
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/features/dashboard/
├── types.ts                      # + WaterHeaterPowerStep, WaterHeaterPower
├── api.ts / api.test.ts          # + getWaterHeaterPower(id, fromUtc, toUtc)
├── hooks.ts                      # useRecentUsage uses recentWindow; + useRecentWaterHeater
├── series.ts / series.test.ts    # + recentWindow; bucketKw over minutes with readings; heater fields; heaterKwh/share
├── RecentUsage.tsx / .test.tsx   # + hasWaterHeater prop, area, legend, detail, share line, error note
└── DashboardPage.tsx             # passes hasWaterHeater
```

**Structure Decision**: The card and its data are in the dashboard slice already, so the feature stays there.

## Complexity Tracking

None. No principle is broken.
