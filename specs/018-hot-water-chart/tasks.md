# Tasks: Hot Water Used, on the Heater Tab

**Input**: Design documents from `/specs/018-hot-water-chart/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R5),
[data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md) (the exact texts), [quickstart.md](quickstart.md)

**Tests**: Included (constitution VII): Vitest, Testing Library and MSW.

## Format: `[ID] [P?] [Story] Description`

## Facts from the code that the tasks rely on

- `src/components/ui/segmented.tsx`: `Segmented<T>({ label, value, onChange, options: { value, label }[] })`, buttons
  with `aria-pressed`, used by `UsageChart.tsx` for Day/Week/Month/Year.
- `src/features/dashboard/UsageChart.tsx`: the arrows are ghost icon `Button`s with `aria-label` "Previous {period}"
  / "Next {period}", `ChevronLeft` / `ChevronRight`, the title between them in `aria-live="polite"`.
- `src/features/dashboard/periods.ts`: `Period`, `addDays`, `dayStart`; private `dayName(date, thisYear)` ("Wed 18
  Nov", year added for another year) and `monthTitle(year, month, thisYear)` ("November").
- `src/features/dashboard/format.ts`: `osloToday`, `formatClock`, `osloDayStartUtc`.
- `src/features/dashboard/StandbyCard.tsx`: a `BarChart` in `ChartContainer` with `ChartTooltip` /
  `ChartTooltipContent`, `isAnimationActive={false}`.
- `src/index.css`: `--color-water-heater` (light and dark).
- `src/features/dashboard/WaterHeaterPage.tsx`: renders `WaterHeaterCard`, then `WaterHeaterEnergyCard` once
  `!state.isLoading`.

---

## Phase 1: Setup

None.

## Phase 2: Foundational (blocks every story)

- [x] T001 Add `HotWaterItem` (`start: string`, `litres: number | null`, `sampledMinutes: number`) and `HotWater` (`locationId`, `period: Period`, `from`, `to`, `totalLitres: number | null`, `sampledMinutes`, `items`) in src/features/dashboard/types.ts
- [x] T002 Add `getHotWater(locationId, period, date)` to src/features/dashboard/api.ts: `GET /api/locations/{id}/water-heater/hot-water?period={period}&date={yyyy-MM-dd}`, both always sent (research R1); test the query in src/features/dashboard/api.test.ts
- [x] T003 Add `useHotWater(locationId, period, date, isCurrent)` to src/features/dashboard/hooks.ts: key `['water-heater', 'hot-water', locationId, period, date]`, `placeholderData: keepPreviousData`, `refetchInterval` 5 minutes only when `isCurrent`, `staleTime` 5 minutes (research R2)
- [x] T004 [P] Export `dayName` and `monthTitle` from src/features/dashboard/periods.ts for reuse (no behaviour change)
- [x] T005 [P] Add fixtures in src/test/hotWater.ts: `hotWaterDay(date, litresByHour)` building a day answer with Oslo hour starts, and `serveHotWater(answer | (url) => answer)` recording each request's `period` and `date`

## Phase 3: User Story 1 – today, hour by hour (P1) 🎯 MVP

**Independent test**: the card shows today's bars up to now, gaps, the partly recorded mark and the total.

- [x] T006 [US1] Add `hotWaterRows(answer)` to src/features/dashboard/hotWater.ts per research R4: one row per part from `from` to `to` (day: hour steps in UTC, so 23/25 hours; week and month: Oslo dates; year: months); `label` (axis "07", "Mon", "18", "Nov"), `span` ("07:00–08:00", "Mon 23 Nov", "November"), `litres` null for a gap and a part to come, `partial` when `sampledMinutes` < 90 % of the part's minutes, `sampledShare`, `litresFull`, `litresPartial`; and `PARTIAL_SHARE = 0.9`
- [x] T007 [P] [US1] Test `hotWaterRows` in src/features/dashboard/hotWater.test.ts: 24 hours with today cut at now, 23 hours on 29 Mar 2026, 25 on 25 Oct 2026, a gap is null and 0 L stays 0, a partial hour, a week Monday to Sunday, a month of 30 days, a year of 12 months
- [x] T008 [US1] Create src/features/dashboard/HotWaterCard.tsx for the day only: region and title "Hot water used"; "Total V40 used {n} L" with " so far" for the current period; a `BarChart` in `ChartContainer` with two stacked series (`litresFull` in `var(--color-water-heater)`, `litresPartial` the same colour at 45 % opacity), ticks every 3 hours, tooltip per contracts/ui.md; the partly recorded legend only when a row is partial; the V40 note; the `figure` summary "Hot water used, {title}: {n} L in total, most at {span}"; skeleton while loading
- [x] T009 [US1] Put `HotWaterCard` between `WaterHeaterCard` and `WaterHeaterEnergyCard` (only once `!state.isLoading`) in src/features/dashboard/WaterHeaterPage.tsx
- [x] T010 [US1] Tests in src/features/dashboard/HotWaterCard.test.tsx: the total with "so far", the figure summary, the request for today (`period=day&date={osloToday}`), the legend only with a partial hour, "No hot water recorded yet today." when the total is null; and in src/features/dashboard/WaterHeaterPage.test.tsx the card's place on the tab

## Phase 4: User Story 2 – day, week, month, year and stepping (P1)

**Independent test**: Week shows Monday–Sunday with its title; back steps one week; forward is off at now.

- [x] T011 [US2] Add `hotWaterView(period, offset, now)` → `{ date, title, canGoBack }` and `HISTORY_START = '2026-11-24'` to src/features/dashboard/hotWater.ts per research R3 and the titles table in contracts/ui.md (ISO week number and Monday; "This week" at offset 0; the year added for another year)
- [x] T012 [P] [US2] Test `hotWaterView` in src/features/dashboard/hotWater.test.ts: each period at offsets 0, −1, −2; ISO week 1 across a year end ("Week 1 · 29 Dec – 4 Jan 2026"); a Sunday's week starts the Monday before; months across a year end; `canGoBack` false at the period holding 2026-11-24 and true after
- [x] T013 [US2] Add the `Segmented` "Period" switch and the arrows to `HotWaterCard` (period change resets the offset to 0; Next disabled at 0; Previous disabled when `!canGoBack` or while placeholder data shows); axis ticks every day for a week, every 5 days for a month, every month for a year; the "No hot water recorded for {title}. The record starts on 24 Nov 2026." text for a null total outside today, in src/features/dashboard/HotWaterCard.tsx
- [x] T014 [US2] Tests in src/features/dashboard/HotWaterCard.test.tsx: Week asks `period=week` with this week's Monday; Previous asks the Monday before and shows its title (or is off while this week holds 24 Nov 2026); Next is off at now; Year asks `{year}-01-01` and a null total shows the "No hot water recorded" text

## Phase 5: User Story 3 – the figures in the right light (P2)

- [x] T015 [US3] The note text from contracts/ui.md and the error text "The hot water used can't be shown right now." (the header and the switch stay) in src/features/dashboard/HotWaterCard.tsx
- [x] T016 [US3] Tests in src/features/dashboard/HotWaterCard.test.tsx: the note is shown; a 500 shows the error in the card and the rest of the tab (WaterHeaterPage) still shows the heater

## Phase 6: Polish

- [x] T017 `npm run lint`, `npm test`, `npm run build` pass; `prettier --check` on the changed files only
- [x] T018 Look at the card at 375 px in light and dark mode for a day with a gap and a partial hour, and a month (headless screenshot; harness not committed) (SC-004)
- [ ] T019 Run quickstart.md's checks by hand against production (Roy)
- [x] T020 Remove `specs/_backlog/water-heater-hot-water-frontend.md` from the API repository in its own small PR (a separate worktree): API PR #78

## Dependencies

- T001 → T002 → T003; T004, T005 parallel. Phase 2 → US1 → US2 (the switch builds on the day card) → US3.

## Parallel examples

- T004 and T005 together; T007 beside T008; T012 beside T013.

## Implementation strategy

MVP is US1 (today's chart). US2 adds the switch and the arrows, US3 the note and the error text. One PR for all
three, as for the earlier specs.
