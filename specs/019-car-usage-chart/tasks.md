# Tasks: A Usage Chart for the Car, on the Car Tab

**Input**: Design documents from `/specs/019-car-usage-chart/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R4),
[data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md), [quickstart.md](quickstart.md)

**Tests**: Included (constitution VII): Vitest, Testing Library and MSW.

## Facts from the code that the tasks rely on

- `src/features/dashboard/series.ts`: `UsageRow` with `carKwh` (only when `included`, via `carKwhOf`);
  `rowsFromHourly`, `rowsFromDaily` (sums days into months for the year); `buildUsageSeries`.
- `src/features/dashboard/UsageChart.tsx`: `readPrefs()` from `localStorage` `ams.chart`; the unit `Segmented`;
  `var(--usage)` / `bg-usage` for the current period; empty texts "Nothing to chart yet" / "No readings for …".
- `src/features/dashboard/hooks.ts`: `usePeriodData(locationId, period, offset)`; `useEvChargerSessions`.
- `src/features/dashboard/EvChargerPage.tsx`: `ChargingCard` (note "Finished charges show here about 15 minutes after
  they end. …") and `SessionsCard`.

## Phase 1: Setup

None.

## Phase 2: Foundational

- [x] T001 Add `carOwnKwh` (the car part's kWh, counted or not; null without a part) to `UsageRow`, `rowsFromHourly` and `rowsFromDaily` (summed into months for the year), and `carUsageRows(rows)` (`kwh = carOwnKwh ?? 0`, `nok: null`, no parts; `[]` when no row has car kWh) in src/features/dashboard/series.ts
- [x] T002 [P] Test T001 in src/features/dashboard/series.test.ts: counted and not counted, an hour without a part is 0 in a period with charging, a period without charging gives `[]`, months summed for the year

## Phase 3: User Story 1 – the car's chart (P1) 🎯 MVP

- [x] T003 [US1] Add `measure: 'house' | 'car'` (default `'house'`) to `UsageChart` in src/features/dashboard/UsageChart.tsx per research R1 and contracts/ui.md: car rows via `carUsageRows`, unit fixed to kWh and its switch hidden, title "Car usage", main colour `--ev-charger`, no split, details and group name and empty texts for the car, prefs under `ams.car-chart`
- [x] T004 [US1] Tests in src/features/dashboard/UsageChart.test.tsx: the car chart's title and total (car kWh only, counted or not), no Unit switch, "No charging yet", "No charging in {title}" for an earlier period, its period stored apart from Now's; Now's chart unchanged

## Phase 4: User Story 2 – the tab without the list (P1)

- [x] T005 [US2] In src/features/dashboard/EvChargerPage.tsx render `<UsageChart locationId={selected.id} measure="car" />` in place of `SessionsCard`, remove `SessionsCard`, and reword the note to "A finished charge shows here and in the chart below about 15 minutes after it ends. The charger's state right now is at the top."
- [x] T006 [US2] Remove the list's code: `useEvChargerSessions` (hooks.ts), `getEvChargerSessions` (api.ts), `EvChargerSession` (types.ts), `sessionTimes` and `formatDuration` (evCharger.ts) and their tests, in src/features/dashboard/
- [x] T007 [US2] Tests in src/features/dashboard/EvChargerPage.test.tsx: "Car usage" shown below "Charging", no "Sessions, last 30 days" and no sessions request, the new note, today's chart total equals "Today"

## Phase 5: Polish

- [x] T008 `npm run lint`, `npm test`, `npm run build` pass; `prettier --check` on the changed files only
- [x] T009 Look at the Car tab's chart at 375 px in light and dark mode, day and month (headless screenshot; harness not committed) (SC-003)
- [ ] T010 Run quickstart.md's checks by hand against production (Roy)

## Dependencies

T001 → T003 → T005; T002 beside T003; T006 after T005.

## Implementation strategy

One PR for both stories.
