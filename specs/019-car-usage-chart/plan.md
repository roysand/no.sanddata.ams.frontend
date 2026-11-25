# Implementation Plan: A Usage Chart for the Car, on the Car Tab

**Branch**: `019-car-usage-chart` | **Date**: 2026-11-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-car-usage-chart/spec.md`

## Summary

`UsageChart` (the Now page's "Usage" tile) gets a `measure` prop: `'house'` (today's behaviour, the default) or
`'car'`. With `'car'` it reads the same period data (the same query and cache as Now), but charts the car charger's own
kWh per slot, in kWh only, in the car's colour, under the title "Car usage", with its period choice stored under its
own key (research R1–R3). The usage rows gain the car's own kWh whether or not it is counted with the house (R2). The
Car tab shows the chart in place of the session list, whose code goes (R4).

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, Recharts through `components/ui/chart.tsx`, shadcn/ui. **No new
dependencies.**

**Storage**: `localStorage` key `ams.car-chart` for the car chart's period (as `ams.chart` for Now's).

**Testing**: Vitest + Testing Library + MSW.

- `series.test.ts`: `carOwnKwh` on hourly and daily rows, counted with the house or not; `carUsageRows`.
- `UsageChart.test.tsx`: the car chart's title, total, no unit switch, empty texts, its own stored period; Now's chart
  unchanged.
- `EvChargerPage.test.tsx`: the tile replaces the sessions, no sessions request, the reworded note, totals agree with
  "Today".

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-003).

**Project Type**: web (frontend SPA against the existing API)

**Constraints**: no API change; the car's kWh are never priced in the chart (FR-003).

**Scale/Scope**: `series.ts`, `UsageChart.tsx`, `EvChargerPage.tsx`, and removing the session list's code from
`types.ts`, `api.ts`, `hooks.ts`, `evCharger.ts`; their tests.

## Constitution Check

| Principle             | How the plan meets it                                                             | Status |
| --------------------- | --------------------------------------------------------------------------------- | ------ |
| I. Feature slices     | All in `features/dashboard`.                                                      | ✅     |
| II. One gateway       | No new requests: the existing period query; the sessions call is removed.         | ✅     |
| III. TanStack Query   | The same `['usage', …]` query as Now, shared cache; nothing copied into state.    | ✅     |
| IV. Forms             | No forms.                                                                         | ✅ n/a |
| V. Session safety     | Only the period choice is stored, as Now's chart does.                            | ✅     |
| VI. Typed, lint-clean | One component with a typed `measure` prop instead of a copy; unused code removed. | ✅     |
| VII. Tests            | Row rules and both chart modes tested; Now's tests keep passing unchanged.        | ✅     |
| Charts                | Through `components/ui/chart.tsx`, as today.                                      | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

```text
specs/019-car-usage-chart/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui.md
├── checklists/requirements.md
└── tasks.md

src/features/dashboard/
├── series.ts (+ test)          # carOwnKwh on rows; carUsageRows()
├── UsageChart.tsx (+ test)     # measure: 'house' | 'car'
├── EvChargerPage.tsx (+ test)  # chart in place of SessionsCard; note reworded
├── evCharger.ts (+ test)       # sessionTimes, formatDuration removed
├── hooks.ts, api.ts, types.ts  # useEvChargerSessions, getEvChargerSessions, EvChargerSession removed
```

**Structure Decision**: the existing slice; one chart component in two modes rather than a copy.

## Complexity Tracking

None.
