# Implementation Plan: Hot Water Used, on the Heater Tab

**Branch**: `018-hot-water-chart` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/018-hot-water-chart/spec.md`

## Summary

API spec 020 answers `GET /api/locations/{id}/water-heater/hot-water?period&date` with the litres of 40 °C water per
part of a period, the total and the sampled minutes. The app reads it in `getHotWater` and `useHotWater(locationId,
period, date)` (research R1, R2). A pure module `hotWater.ts` works out, for a period and an offset from now, the
`date` to ask for, the title, and whether the back arrow may step further (R3); and turns an answer into one row per
part of the whole period, with gaps and the partly recorded mark (R4). A new `HotWaterCard` on the Heater tab draws
the bars with the shared chart wrapper and the `Segmented` switch of the usage chart (R5).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, Recharts through `components/ui/chart.tsx`, shadcn/ui (`Segmented`,
`Button`, `Card`), lucide-react. **No new dependencies.**

**Storage**: the chosen period lives in component state only; nothing is stored.

**Testing**: Vitest + Testing Library + MSW.

- `hotWater.test.ts`: the date, title and back limit per period and offset (ISO week across a year end, a month
  across a year end, the history start); the rows for a day (24, 23 and 25 hours), a week, a month and a year; gaps,
  0 L and the partly recorded mark.
- `api.test.ts`: the request's query.
- `HotWaterCard.test.tsx`: the total, the switch and the arrows (the requests made), the empty and failed states,
  the note, the text summary.
- `WaterHeaterPage.test.tsx`: the card is on the tab, between the two cards.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-004).

**Project Type**: web (frontend SPA against the existing API)

**Performance Goals**: one request per period shown; the current period every 5 minutes (FR-007).

**Constraints**: API spec 020 deployed; gaps never drawn as 0 (FR-003).

**Scale/Scope**: `types.ts`, `api.ts`, `hooks.ts`, a new `hotWater.ts`, a new `HotWaterCard.tsx`,
`WaterHeaterPage.tsx`, and their tests; `src/test/hotWater.ts` fixtures.

## Constitution Check

| Principle             | How the plan meets it                                                                         | Status |
| --------------------- | --------------------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | All in `features/dashboard`, beside the other water heater cards.                             | ✅     |
| II. One gateway       | `getHotWater` through `api.get`, typed.                                                       | ✅     |
| III. TanStack Query   | `['water-heater', 'hot-water', id, period, date]`, `enabled`, 5-minute interval for now only. | ✅     |
| IV. Forms             | No forms.                                                                                     | ✅ n/a |
| V. Session safety     | Nothing stored or logged.                                                                     | ✅     |
| VI. Typed, lint-clean | Pure functions typed; shared `Segmented`, `Button`, chart wrapper; Tailwind only.             | ✅     |
| VII. Tests            | Date and row rules at exact times, the card's behaviour through MSW.                          | ✅     |
| Oslo time             | All dates through `format.ts` and `periods.ts` helpers.                                       | ✅     |
| Charts                | Through `components/ui/chart.tsx`.                                                            | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

```text
specs/018-hot-water-chart/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui.md          # the card's texts, titles and states
├── checklists/requirements.md
└── tasks.md

src/
├── test/hotWater.ts                         # hotWaterDay(), hotWaterAnswer() fixtures
└── features/dashboard/
    ├── types.ts, api.ts, hooks.ts           # HotWater, getHotWater, useHotWater
    ├── hotWater.ts (+ test)                 # hotWaterView(), hotWaterRows()
    ├── HotWaterCard.tsx (+ test)            # the card
    └── WaterHeaterPage.tsx (+ test)         # the card between the live card and the energy card
```

**Structure Decision**: the existing `features/dashboard` slice, as the other water heater cards.

## Complexity Tracking

None.
