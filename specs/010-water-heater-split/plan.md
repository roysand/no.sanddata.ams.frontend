# Implementation Plan: Show Water Heating Apart from the Rest

**Branch**: `010-water-heater-split` | **Date**: 2026-11-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/010-water-heater-split/spec.md`; API contract in
`no.sanddata.ams.api/specs/012-water-heater-energy/contracts/endpoints.md`

## Summary

The API's hourly items, daily items and monthly bill gain an optional `waterHeater` part. The frontend reads it and
shows it in four places. It adds no new endpoints, and the chart, the bill and the export make no new requests.

1. **Types and normalisation**:
   - `types.ts` gains `WaterHeaterPart` and `WaterHeaterBillPart`.
   - `api.ts` turns an absent field into `null`, so code never has to tell `undefined` from `null`, and an older API
     behaves as today (FR-001).
2. **One pure module, `waterHeater.ts`**, does all the rules, so every place agrees and it is tested once
   ([research R1–R3](research.md)):
   - "everything else" = total − water heating, never negative
   - the cost is `null` when it is unknown
   - the sums for the year view's months
   - "partly measured" against a slot's expected minutes, with a tolerance for the API's rounding
3. **Usage chart (US1)**:
   - `UsageRow` gains the heater kWh, kr and minutes, and `UsagePoint` gains `heater` and `partly`.
   - In the week, month and year views, the current bar is drawn as two stacked segments, water heating at the bottom
     and the rest on top. The total label and the previous-period bar are unchanged.
   - In the day view, a filled heater area is drawn under the existing total area.
   - The legend and the detail line gain water heating only when the period has any (FR-005, research R4).
4. **Bill (US2)**: a `WaterHeaterBillNote` in `BillView.tsx` shows the line below the total, in both the History bill
   (`BillInvoice`) and the expected bill on Now (`ExpectedBillCard`). No bill sum changes (research R5).
5. **Heater tab (US3)**: a new `WaterHeaterEnergyCard` under `WaterHeaterCard` on `WaterHeaterPage`. It reads today
   from `useTodayHourlyCost` and the month from `useMonthlyBill`. These are the same query keys as on Now, so the
   cache is shared (FR-011, research R6).
6. **CSV (US4)**: `hourlyCsv` and `dailyCsv` get five columns at the end, empty when there's no heater part
   (research R7).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**:

- Already in use: TanStack Query 5, Recharts through `components/ui/chart.tsx`, shadcn/ui, Tailwind 4, lucide-react.
- **No new dependencies.**

**Storage**: none. Server state lives in the TanStack Query cache. The chart's unit and period stay in `localStorage`,
as today.

**Testing**: Vitest + Testing Library + MSW:

- Pure tests for `waterHeater.ts`, `series.ts` and `exportCsv.ts`.
- Component tests for `UsageChart`, `BillCard`, `ExpectedBillCard` and `WaterHeaterPage`, with MSW fixtures with and
  without `waterHeater`.

**Target Platform**: Mobile-first browser SPA. It must read well at 375 px and in dark mode (SC-006).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**:

- No new requests for the chart, the bill or the export (SC-005).
- The year view adds one sum per day in memory, which costs nothing noticeable.

**Constraints**:

- Without heater data, everything looks and behaves as today. Existing tests pass unchanged (SC-002).
- "Unknown" is never shown as 0 (FR-009).
- Everything else is never negative (FR-010).
- Time is handled through the shared Oslo helpers.

**Scale/Scope**:

- New: 1 pure module, 1 card, 1 bill note, and the heater colour tokens.
- Changed: `types.ts`, `api.ts`, `series.ts`, `UsageChart.tsx`, `BillView.tsx`, `ExpectedBillCard.tsx`,
  `exportCsv.ts` and `WaterHeaterPage.tsx`.
- Tests and the MSW fixtures for these.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                  | How the plan meets it                                                                                                                                                                                                                            | Status |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| I. Feature slices          | Everything is in `features/dashboard`. The Heater page already lives there (spec 009). No other slice's internals are imported.                                                                                                                  | ✅     |
| II. One gateway            | No new calls. `api.ts` keeps using `apiClient` and normalises the absent field to `null` (the "API gap" rule).                                                                                                                                   | ✅     |
| III. TanStack Query        | No server data is copied into state. The Heater tab reuses the hooks `useTodayHourlyCost` and `useMonthlyBill` with their existing keys and intervals. The year view's month sums are computed from cached data in the query function, as today. | ✅     |
| IV. Forms                  | No forms.                                                                                                                                                                                                                                        | ✅ n/a |
| V. Session safety          | Nothing new is stored or logged.                                                                                                                                                                                                                 | ✅     |
| VI. Typed, lint-clean      | Strict types with no `any`. Tailwind tokens for the new colour, the chart through the shared wrapper, and no new libraries.                                                                                                                      | ✅     |
| VII. Tests                 | The pure module, the series, the CSV and the components each get tests with MSW fixtures. There is a regression test that fixtures without `waterHeater` render as before.                                                                       | ✅     |
| Oslo time                  | The expected minutes of a day come from `dayStart`/`addDays`, so a 23- or 25-hour day is right.                                                                                                                                                  | ✅     |
| Charts through `chart.tsx` | The stacked bar and the heater area are inside the existing `ChartContainer`.                                                                                                                                                                    | ✅     |

**Re-check after Phase 1**: unchanged, all pass, with no deviations.

## Project Structure

### Documentation (this feature)

```text
specs/010-water-heater-split/
├── plan.md              # This file
├── research.md          # Phase 0: R1–R8
├── data-model.md        # Phase 1: types and derived values
├── quickstart.md        # Phase 1: how to check it
├── contracts/
│   ├── api.md           # Phase 1: the fields read from API spec 012
│   └── ui.md            # Phase 1: what each place shows, texts and CSV columns
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── index.css                                  # + --water-heater token (light, dark), --color-water-heater
├── features/dashboard/
│   ├── types.ts                               # + WaterHeaterPart, WaterHeaterBillPart; waterHeater on items and bill
│   ├── api.ts                                 # normalise waterHeater ?? null (hourly, hourly page, daily, range, bill)
│   ├── waterHeater.ts / .test.ts              # new: rest, sums, partly measured, share
│   ├── series.ts / .test.ts                   # UsageRow + heater fields; UsagePoint + heater, partly; month sums
│   ├── UsageChart.tsx / .test.tsx             # stacked bar, heater area, legend, detail line
│   ├── BillView.tsx                           # + WaterHeaterBillNote; used in BillInvoice
│   ├── ExpectedBillCard.tsx / .test.tsx       # renders WaterHeaterBillNote below the total
│   ├── BillCard.test.tsx                      # + the note in a past month
│   ├── WaterHeaterEnergyCard.tsx / .test.tsx  # new: today and this month
│   ├── WaterHeaterPage.tsx / .test.tsx        # renders the energy card under the live card
│   ├── exportCsv.ts / .test.ts                # five columns in hourlyCsv and dailyCsv
│   └── format.ts                              # (reuse formatNok, formatOsloDate; nothing new expected)
└── test/
    └── bills.ts, server.ts                    # fixtures: a bill and hourly/daily items with waterHeater
```

**Structure Decision**: One new pure module and one new card in the dashboard slice. The rest are additions to the
components that already show these figures.

## Complexity Tracking

None. No principle is broken.
