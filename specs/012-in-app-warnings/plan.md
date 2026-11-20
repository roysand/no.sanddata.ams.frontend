# Implementation Plan: Warnings Inside the App

**Branch**: `012-in-app-warnings` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/012-in-app-warnings/spec.md`

## Summary

Both warnings are worked out in the dashboard slice, from queries the app already has. The new code is two pure rule
modules and one banner.

1. **The capacity rule (US1)** is the pure `capacityWarning(input)` in `features/dashboard/warnings.ts`. Its inputs:
   - this month's capacity figures (`useCapacityCharge`): the three top daily peaks, and the step with `upperKw`, which
     is the next step's lower limit
   - today's completed hours (`useTodayHourlyCost`), for today's peak so far
   - the current hour so far (`useCurrentHourCost`): `consumptionKwhSoFar` and `hourStart`
   - the clock.

   It projects the hour (`soFar × 60 / minutesPassed`) once more than 10 minutes have passed. It works out the highest
   kWh the hour may reach before the three-peak average reaches the next step (research R1). It warns when the
   projection reaches that limit, and gives the kW to stay under for the rest of the hour.

2. **The usage rule (US2)** is the pure `usageWarning(input)` in the same module. Its inputs:
   - the last hour of per-minute readings (`useLastHourPower`), from which the average power of the last 15 minutes is
     worked out
   - the four weeks of hourly use the heatmap already loads.

   The heatmap's query gets a `select`, so the same cached request serves both the heatmap and a new
   `useUsualPower(locationId)`. That hook gives the median for this Oslo hour and weekday over the last four weeks, and
   the number of weeks it has (research R2). The rule warns at ≥ 2× and ≥ 1 kW above the usual, with at least 3 weeks
   of readings and a reading no older than 6 minutes.

3. **The Norgespris rule (US3)** is the pure `norgesPrisWarning(bill)` in the same module, from the current month's
   expected bill (`useMonthlyBill(id, month, true)`, already read by Now).
   - It looks at the `SpotEnergy` line (all the month's kWh, so far + projected) and the `NorgesPrisCredit` line (the
     kWh within the limit).
   - It warns when the credit has more than 0,5 kWh fewer than the energy line. The limit is then the credit's kWh.
   - "So far" is the energy line's kWh minus `projection.kwh`. When that is already above the limit, the warning says
     the limit has been passed (research R7).
   - There is no warning for a spot-price location (no credit line), for a Final month, or without a projection.
4. **The banner (US4)** is a new `WarningBanner({ location })` in `features/dashboard`, exported through its
   `index.ts`.
   - **Where:** `AppLayout` renders it for the selected location, above the existing `KeyReminderBanner`, in the same
     area.
   - **Order:** capacity, then usage, then Norgespris. Each line is a link to `/` (Now).
   - **On an error:** a warning whose figures are missing or failed is left out, with no error shown (FR-008).
   - **Who:** everyone with access to the location (FR-005). It renders nothing without a selected location.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**:

- Already in use: TanStack Query 5, React Router 7, shadcn/ui, Tailwind 4, lucide-react.
- **No new dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- **`warnings.test.ts`, pure, for the capacity rule:**
  - the limit formula when today is in the top three and when it isn't, and with fewer than three days
  - the 10-minute rule
  - the top step, and no steps
  - the case where the hour has already passed the limit
- **`warnings.test.ts`, pure, for the usage rule:**
  - the 2× and 1 kW limits
  - 3 of 4 weeks
  - a stale reading
- **`usual.test.ts`:** the median per Oslo hour and weekday, including the clock-change hour.
- **`warnings.test.ts`, Norgespris:** projected over (the limit read from the credit), already passed, within the
  limit, spot price (no credit line), a Final month, and no projection.
- **`WarningBanner.test.tsx`:**
  - both lines, in order, as links to `/`
  - nothing when nothing is due
  - nothing on errors
  - inside `AppLayout`: the location switch, and the warnings shown before the key reminders.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-005).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**:

- **On Now, nothing is fetched twice (SC-004):** the banner shares the current hour, the capacity figures and the
  expected bill with Now's cards (tested).
  - **Corrected while implementing:** Now doesn't read today's hours, the per-minute readings or the four weeks. So the
    banner adds those three requests on Now too, at their intervals, as FR-009 allows.
- On the other pages, the same queries as Now, at their existing intervals. The per-minute readings refresh every
  minute, the current hour every minute, today's hours every 5 minutes, the capacity figures every 15 minutes, and the
  four weeks every hour.

**Constraints**:

- No API change.
- The warnings use the same Oslo-time helpers as the rest of the dashboard.
- The thresholds are fixed constants with names, not settings.

**Scale/Scope**:

- New: 2 pure modules (`warnings.ts` with three rules, `usual.ts`), 1 hook (`useUsualPower`), 1 banner, and tests.
- Changed:
  - `useHeatmap`, which shares the raw items through `select`
  - `AppLayout`
  - `features/dashboard/index.ts`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | How the plan meets it                                                                                                                                                                                                         | Status |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | The rules, the hook and the banner are in `features/dashboard`. `AppLayout` imports `WarningBanner` through `features/dashboard/index.ts`.                                                                                    | ✅     |
| II. One gateway       | No new calls; the existing `getCapacityCharge`, `getHourlyCost`, `getMinuteConsumption` and `getHourlyCostPage` are reused.                                                                                                   | ✅     |
| III. TanStack Query   | The existing hooks and keys are reused, so the banner and the Now page share their cache. The heatmap and the usual power share one query key through `select`, so there is one request. No server data is copied into state. | ✅     |
| IV. Forms             | No forms.                                                                                                                                                                                                                     | ✅ n/a |
| V. Session safety     | Nothing new is stored or logged.                                                                                                                                                                                              | ✅     |
| VI. Typed, lint-clean | Strict types, Tailwind tokens and shadcn primitives. There are no new libraries.                                                                                                                                              | ✅     |
| VII. Tests            | Pure tests for both rules and the median, and component tests with MSW for the banner.                                                                                                                                        | ✅     |
| Oslo time             | The hour and the weekday come from the shared Oslo helpers (`osloDayStartUtc`, and the heatmap's `osloParts`).                                                                                                                | ✅     |

**Re-check after Phase 1**: unchanged, all pass, with no deviations.

## Project Structure

### Documentation (this feature)

```text
specs/012-in-app-warnings/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R7
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── ui.md            # Phase 1: the texts and where they go
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/AppLayout.tsx                  # + <WarningBanner location={selected} /> before <KeyReminderBanner />
└── features/dashboard/
    ├── warnings.ts / .test.ts                # new: capacityWarning, usageWarning, norgesPrisWarning (pure), the constants
    ├── usual.ts / .test.ts                   # new: usualPower(items, now): median per Oslo hour and weekday, and weeks
    ├── hooks.ts                              # useHeatmap shares its items through select; + useUsualPower
    ├── WarningBanner.tsx / .test.tsx         # new: the banner for one location
    └── index.ts                              # + export WarningBanner
```

**Structure Decision**: The warnings are about a location's use and cost, which is the dashboard slice's job, so the
rules and the banner live there. The banner is placed in the layout, next to the key reminders.

## Complexity Tracking

None. No principle is broken.
