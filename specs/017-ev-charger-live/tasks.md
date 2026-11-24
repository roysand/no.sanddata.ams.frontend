# Tasks: The Car Charger's State Right Now

**Input**: Design documents from `/specs/017-ev-charger-live/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R7),
[data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md) (the exact texts), [quickstart.md](quickstart.md),
[picture-preview.html](picture-preview.html) (the drawing)

**Tests**: Included (constitution VII): Vitest, Testing Library and MSW.

## Format: `[ID] [P?] [Story] Description`

## Facts from the code that the tasks rely on

- `src/features/dashboard/hooks.ts`: `useWaterHeaterState` (`retry: false`, `refetchInterval` stopping on
  `isNotFound`), `useNow(intervalMs)`, `ONE_MINUTE`.
- `src/features/dashboard/format.ts`: `formatKw` ("4,4 kW"), `formatKwh` (one decimal), `formatClock` (Oslo HH:mm),
  `formatDay` ("23.11."), `formatAge(seconds)` ("updated 2 minutes ago"), `osloToday`.
- `src/index.css`: `.heater-glow` and its keyframes, held still under `prefers-reduced-motion`.
- `src/features/dashboard/WaterHeaterTank.tsx`: an inline SVG drawing, the pattern for `EvChargerPicture`.
- `src/features/dashboard/EvChargerPage.tsx`: `ChargingCard` and `SessionsCard` in a `space-y-4` div; hint text
  "A charge in progress shows here about 15 minutes after it ends."
- `src/features/dashboard/DashboardPage.tsx`: renders `<NowCard locationId={selected.id} />`.
- MSW `onUnhandledRequest: 'error'`: an unexpected state request fails a test.

---

## Phase 1: Setup

None.

## Phase 2: Foundational (blocks every story)

- [x] T001 Add `EvChargerLiveStatus` (`'charging' | 'connected' | 'finished' | 'noCar' | 'unknown' | 'offline' | 'noCharger'`) and `EvChargerLiveState` (fields per data-model.md, all nullable except `state`) in src/features/dashboard/types.ts
- [x] T002 Add `getEvChargerState(locationId)` to src/features/dashboard/api.ts: `GET /api/locations/{id}/ev-charger/state`; a `state` outside the seven becomes `'unknown'` (research R1)
- [x] T003 [P] Test the normalising in src/features/dashboard/api.test.ts: a known state passes through, `"paused"` reads as `unknown`
- [x] T004 Add `useEvChargerState(locationId, enabled)` to src/features/dashboard/hooks.ts: key `['ev-charger', 'state', locationId]`, `enabled: !!locationId && enabled`, `retry: false`, `refetchInterval` 3 minutes, `false` after a 404 (research R2)
- [x] T005 [P] Add `formatOsloTimeOrDate(iso, now)` to src/features/dashboard/format.ts ("16:37" on the Oslo day of `now`, else "23.11. 23:10"), with tests in src/features/dashboard/format.test.ts, including just after Oslo midnight
- [x] T006 [P] Add `liveState(overrides)` fixture (charging at Hjemme: 4.41 kW, 12.962 kWh, plugged 14:52Z, charging 15:37Z, reported 18:33Z, read 18:34Z on 2026-11-24) and an MSW handler helper in src/test/evCharger.ts

## Phase 3: User Story 1 – the state on the Car tab (P1) 🎯 MVP

**Independent test**: the Car tab shows every row of contracts/ui.md for the matching answer.

- [x] T007 [US1] Add `liveView(state, now)` to src/features/dashboard/evCharger.ts returning `{ heading, details, picture, label, age }` or null for `noCharger`, per contracts/ui.md (power only while charging; kWh when not null, 0 shown; "charging since" only while charging; "plugged in at" when set; "last reported" only offline; age from `readAt` via `formatAge`)
- [x] T008 [P] [US1] Test `liveView` for all seven states, kWh null and 0, times today and yesterday, age, in src/features/dashboard/evCharger.test.ts
- [x] T009 [US1] Create src/features/dashboard/EvChargerStateCard.tsx: region "Charger now", title "Charger now", skeleton while loading, nothing on 404 or `noCharger`, "The charger's state is unavailable right now." on any other error (even with cached data, research R3), else heading, details joined by " · " and the age; `useNow(30_000)`; a placeholder slot for the picture (filled in US3)
- [x] T010 [US1] Put `EvChargerStateCard` at the top of `EvChargerPage` and reword the hint to "Finished charges show here about 15 minutes after they end. The charger's state right now is at the top." in src/features/dashboard/EvChargerPage.tsx
- [x] T011 [US1] Tests in src/features/dashboard/EvChargerPage.test.tsx: charging texts; connected; noCar; offline with last reported; unknown; 503 → unavailable and the "Charging" card still shown; the new hint; existing tests get a state handler

## Phase 4: User Story 2 – the line on Now (P1)

**Independent test**: "Car charging now: 4,4 kW · 13,0 kWh this charge · since 16:37" in "Right now" only while charging.

- [x] T012 [US2] Add `chargingNowLine(state, now)` to src/features/dashboard/evCharger.ts (null unless `charging`; kWh left out with its separator when null), with tests in src/features/dashboard/evCharger.test.ts
- [x] T013 [US2] `NowCard` takes `hasEvCharger?: boolean`, calls `useEvChargerState(locationId, hasEvCharger)` and shows the line right below the house's figures with a green plug icon, hidden on error; pass `hasEvCharger={selected.hasEvCharger === true}` from src/features/dashboard/DashboardPage.tsx; in src/features/dashboard/NowCard.tsx
- [x] T014 [US2] Tests in src/features/dashboard/NowCard.test.tsx: the line while charging; none for connected, finished and 503; no state request without `hasEvCharger` (MSW unhandled-request error); the house figures unchanged

## Phase 5: User Story 3 – the picture (P2)

**Independent test**: while charging the green line moves from the charger to the car; still and faded per mode.

- [x] T015 [P] [US3] Add `.cable-flow` (stroke-dasharray 100 100, stroke-dashoffset 100 → 0, 1.5 s linear infinite, soft green glow) with a reduced-motion rule (no animation, dashoffset 0) in src/index.css
- [x] T016 [US3] Create src/features/dashboard/EvChargerPicture.tsx from picture-preview.html: viewBox 0 0 380 200, `role="img"` with the mode's text (contracts/ui.md), car, post, bolt (green only while charging), cable with a `pathLength="100"` overlay carrying `.cable-flow` only in `charging`; `plugged` cable still; `noCar` car at 25 % and no cable; `faded` all at 45 %; Tailwind fill/stroke classes with `dark:` variants, green from `price-cheap`
- [x] T017 [US3] Render the picture in `EvChargerStateCard` with the view's mode (faded on error) in src/features/dashboard/EvChargerStateCard.tsx
- [x] T018 [US3] Tests in src/features/dashboard/EvChargerPage.test.tsx: the image's accessible name per state; `.cable-flow` present only while charging; no cable for noCar

## Phase 6: Polish

- [x] T019 `npm run format`, `npm run lint`, `npm test`, `npm run build` all pass
- [x] T020 Look at the Car tab at 375 px in light and dark mode against a mocked charging state (headless screenshot) (SC-005)
- [x] T021 Run quickstart.md's checks by hand against production (Roy)

## Dependencies

- T001 → T002 → T004; T005, T006 parallel. Phase 2 → US1 → US3 (the picture sits in US1's tile). US2 needs only
  Phase 2 and T007's helpers file, so it can run beside US1.

## Parallel examples

- T003, T005, T006 together after T002.
- T008 beside T009; T015 beside T016.

## Implementation strategy

MVP is US1 (the state in text). US2 adds the Now line, US3 the picture. One PR for all three, as Roy asked.
