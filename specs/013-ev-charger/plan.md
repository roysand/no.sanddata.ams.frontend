# Implementation Plan: The EV Charger in the App

**Branch**: `013-ev-charger` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/013-ev-charger/spec.md`

## Summary

The API (its spec 016) already does the work. It adds the car to `totalKwh` when the location's setting is on, and
gives the car's part per hour, per day and on the bill. The frontend reads those figures and never adds the car itself.

1. **Normalise (R1)**: `api.ts` fills `totalKwh` and `evCharger` from an older API, so nothing else checks for
   missing fields. Locations gain `hasEvCharger` and `includeEvCharger`.
2. **The chart (R2/R3, US4)**:
   - `series.ts` builds rows from `totalKwh`, and adds a `carKwh` only when the part is `included`.
   - `UsagePoint` gains `car`. `rest` is the total minus heater and car.
   - `UsageChart` stacks a third part, "Car charging", on top, in kWh only.
   - With the checkbox off the API's `totalKwh` equals the house's kWh, so the chart is unchanged without a special
     case.
3. **The Car tab (R5/R7/R8, US2)**:
   - `EvChargerPage` at `/ev-charger`, shown in the tab bar when `hasEvCharger` is true.
   - "Today" and "This month" both come from one daily request for the month so far, so the month is never less
     than today.
   - The sessions of the last 30 days come from the sessions endpoint.
4. **The checkbox (R6, US3)**:
   - It is at the top of the Car tab. `useEvChargerInclude` sends the new setting.
   - While saving, the checkbox shows the value being sent. On success the location, usage and cost queries are
     refetched. On failure it goes back and shows the API's message.
   - Viewers see it read-only.
5. **Admin (R9, US1)**: `EvChargerSection`, with its own Connect/Replace dialog (a radio list of the server's Zaptec
   chargers) and a Remove dialog, in the admin location dialog below the water heater.
6. **Bill and CSV (R10)**: a car note under the water heating note, and two CSV columns after the water heater ones.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**:

- Already in use: TanStack Query 5, React Router 7, React Hook Form + Zod, shadcn/ui, Tailwind 4, Recharts (through
  `components/ui/chart.tsx`), lucide-react (`CarIcon`).
- **No new dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- **`evCharger.test.ts`:**
  - `carMonth`: month ≥ today, nulls, since, hours without a reading.
  - Session times over midnight, and durations.
- **`series.test.ts`:**
  - rows from `totalKwh`
  - `carKwh` only when included
  - `nok` unchanged
  - `car` null in kr
  - `rest` minus heater and car
  - the year view's sum.
- **`api.test.ts`:** normalisation without the fields.
- **`EvChargerPage.test.tsx`:**
  - the figures, the sessions and the empty states
  - the checkbox: owner saves, the save fails and the checkbox goes back, the viewer sees it disabled
  - no charger.
- **`UsageChart.test.tsx`:** the legend and the detail line with a car part. The chart is unchanged with
  `included: false`.
- **`EvChargerSection.test.tsx` / dialog tests:** connect, replace, remove, a 503 message, and a 409 message.
- **`TabBar` / `AppLayout`:** the Car tab with a charger, and five tabs.
- **`BillView.test.tsx`, `exportCsv.test.ts`:** the note, and the columns.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode.

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**:

- **The Car tab** makes two requests, the month's days and the sessions, each refreshed every 15 minutes.
- **The checkbox** refetches the visible charts within 5 s (SC-003).
- **No other page** makes new requests.

**Constraints**:

- No API change.
- Oslo time through the shared helpers.
- The car is never priced, and never added in the frontend (contracts/api.md "Never").

**Scale/Scope**:

- **New:**
  - `evCharger.ts`
  - `EvChargerPage` (with its two cards)
  - three admin components
  - one Zod schema
  - one CSS token
  - tests.
- **Changed:**
  - `types.ts` and `api.ts` (both slices)
  - `series.ts`
  - `UsageChart`
  - `BillView`
  - `exportCsv`
  - `hooks.ts` (both slices)
  - `TabBar`, `AppLayout` and `routes.tsx`
  - `AdminLocationDialog`
  - `index.css`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle             | How the plan meets it                                                                                                                                                                                     | Status |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | The Car tab, the checkbox and the chart are in `features/dashboard`. The admin connection is in `features/admin`. The layout imports through the slices' `index.ts`.                                      | ✅     |
| II. One gateway       | Every new call is in a slice's `api.ts` through `apiClient`. The normalisation of older API answers is there too (R1).                                                                                    | ✅     |
| III. TanStack Query   | New hooks with hierarchical keys (`['ev-charger', …]`, `['admin', 'ev-charger', id]`), and 15-minute `refetchInterval`s. Mutations invalidate. The checkbox shows `mutation.variables`, not copied state. | ✅     |
| IV. Forms             | The connect dialog uses React Hook Form with `evChargerSchema` in `admin/schema.ts`. The checkbox is a single control, not a form.                                                                        | ✅     |
| V. Session safety     | No secrets. The role checks (viewer, Admin) are UX only, and the API answers 403.                                                                                                                         | ✅     |
| VI. Typed, lint-clean | Strict types, shadcn primitives (Checkbox, Dialog, Badge, and a new `radio-group.tsx` from the existing `radix-ui` package) and a Tailwind token for the colour.                                          | ✅     |
| VII. Tests            | Pure tests for the rules, and MSW component tests for the page, the checkbox, the chart and the admin dialogs.                                                                                            | ✅     |
| Oslo time / charts    | Session times and month bounds use `format.ts` and `periods.ts`. The chart stays in `components/ui/chart.tsx`.                                                                                            | ✅     |

**Re-check after Phase 1**: all pass. One spec change was made while planning, research R4: the note about charging
without a house reading is on the Car tab, not in the chart's day view. FR-018 and US4 scenario 5 were updated to
match.

## Project Structure

### Documentation (this feature)

```text
specs/013-ev-charger/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R11
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── api.md           # what is read and sent, and where
│   └── ui.md            # the texts and where they go
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── index.css                                   # + --ev-charger (light/dark), bg-ev-charger utility
├── app/routes.tsx                              # + /ev-charger → EvChargerPage
├── components/
│   ├── TabBar.tsx / .test.tsx                  # + hasEvCharger, Car tab, 3–5 columns
│   └── AppLayout.tsx / .test.tsx               # passes selected.hasEvCharger
└── features/
    ├── locations/
    │   ├── types.ts                            # + hasEvCharger, includeEvCharger
    │   └── api.ts                              # normalise both to booleans
    ├── dashboard/
    │   ├── types.ts                            # + EvChargerPart/DayPart/BillPart, EvChargerSession, totalKwh fields
    │   ├── api.ts / api.test.ts                # normalise totalKwh/evCharger; + getEvChargerSessions, setEvChargerInclude
    │   ├── hooks.ts                            # + useCarMonth, useEvChargerSessions, useEvChargerInclude
    │   ├── evCharger.ts / .test.ts             # new: carMonth, sessionTimes, formatDuration
    │   ├── series.ts / .test.ts                # kwh from totalKwh, carKwh, point.car, rest, hasCar
    │   ├── UsageChart.tsx / .test.tsx          # car series, legend, detail line
    │   ├── EvChargerPage.tsx / .test.tsx       # new: the Car tab (checkbox + figures card, sessions card)
    │   ├── BillView.tsx / BillCard.test.tsx    # + EvChargerBillNote
    │   ├── exportCsv.ts / .test.ts             # + 2 columns
    │   └── index.ts                            # + export EvChargerPage
    └── admin/
        ├── types.ts / schema.ts                # + ZaptecCharger, EvChargerSettings, evChargerSchema
        ├── api.ts / hooks.ts                   # + list, get, connect, remove; useEvChargerSettings/Actions, useZaptecChargers
        ├── EvChargerSection.tsx / .test.tsx    # new
        ├── ConnectEvChargerDialog.tsx / .test.tsx   # new
        ├── RemoveEvChargerDialog.tsx           # new
        └── AdminLocationDialog.tsx             # + <EvChargerSection /> below the water heater
```

**Structure Decision**: The car's figures, the checkbox and the chart belong to the dashboard slice, like the Heater
tab. The admin connection belongs to the admin slice, like the water heater's. No new slice is needed.

## Complexity Tracking

None. No principle is broken.
