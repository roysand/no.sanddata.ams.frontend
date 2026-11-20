# Tasks: Water Heating in the "Last 3 Hours" Chart

**Input**: Design documents from `/specs/014-recent-water-heating/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R7
- [data-model.md](data-model.md)
- [contracts/api.md](contracts/api.md) and [contracts/ui.md](contracts/ui.md), which give the exact texts
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) asks for them. They use Vitest, Testing Library and MSW, with a fresh
`QueryClient` per test. The series functions are pure and take `now`, so no fake timers are needed there.

**Organization**:

- Phase 2 adds the API type, the request and the hook, which US1 and US3 need.
- **US2 (steps on the clock) comes before US1.** Both are P1, but US1's areas only line up once the steps are on whole
  5 minutes. US2 is also useful alone: it changes the chart for every location.
- US1 draws the area and the detail line.
- US3 adds the share line (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US3 from spec.md

## Facts from the code that the tasks rely on

- **`src/features/dashboard/series.ts`** (from line 228):
  - `BUCKET_MS = 5 * MINUTE_MS`, `HOUR_MS`, `RECENT_HOURS = 3`, `RECENT_WINDOW_MS`, and `RECENT_BUCKETS = 36`.
  - `RecentPoint { label, current, previous }` and `RecentUsage { points, totalKwh, previousKwh, deltaPercent, cost,
previousCost, costDeltaPercent, hasCurrent, hasPrevious }`.
  - `bucketKw(items, startMs)` sums kWh per step and returns `sum * 12`.
  - `totalKwh` and `costOver` cover `[startMs, startMs + elapsed)`, where
    `elapsed = min(max(now − startMs, 0), RECENT_WINDOW_MS)`.
  - `RecentUsageInput { current, previous, currentRates, previousRates, startMs, previousStartMs, now, label }`.
- **`src/features/dashboard/hooks.ts`:** `useRecentUsage(locationId)` has key `['consumption', 'recent', locationId]`
  and refreshes every minute.
  - Its `queryFn` sets `startMs = Math.floor((Date.now() − RECENT_WINDOW_MS) / ONE_MINUTE) * ONE_MINUTE` and
    `previousStartMs = sameHourYesterday(new Date(startMs)).getTime()`.
  - It fetches minute consumption and hourly cost for both windows.
  - It returns `{ current, previous, currentRates, previousRates, startMs, previousStartMs }`.
- **`src/features/dashboard/RecentUsage.tsx`:**
  - `RecentUsage({ locationId })` calls `buildRecentUsage({..., now: new Date(), label: ms => formatClock(...) })`.
  - The chart is a `ComposedChart` with a dashed `Line` "previous" and an `Area` "current" (`var(--usage)`).
  - The legend is a `<ul>` ("Last 3 hours", "Yesterday", "kW, average per 5 minutes").
  - The detail `<p aria-live="polite">` shows `<b>{label}</b> · <b>{kw} kW</b> · yesterday {kw} kW`.
  - The "Yesterday, same 3 hours: …" `<p>` comes after the totals.
- **`src/features/dashboard/DashboardPage.tsx`** line 64 renders `<RecentUsage locationId={selected.id} />`.
- **`src/features/dashboard/waterHeater.ts`:** it has `shareOf(heaterKwh, totalKwh)`, which gives 0–1, or `null` when
  the total is ≤ 0.
- **`src/features/dashboard/UsageChart.tsx`** draws the heater in the day view as an `Area` with
  `stroke="var(--water-heater)"`, `strokeWidth={1}`, `fill="var(--water-heater)"`, `fillOpacity={0.5}`,
  `dot={false}`, `activeDot={false}` and `isAnimationActive={false}`. Copy it.
- **Tests:**
  - `series.test.ts` › `describe('buildRecentUsage')` (line 207) uses `START = Date.UTC(2026, 10, 13, 10, 0)` and an
    `input(overrides)` helper.
  - `RecentUsage.test.tsx` has `useApi(setup)`. It serves `*/api/consumption` (ten minutes from `from`) and
    `*/api/electricity-cost/hourly`, and tells today from yesterday by `to > now − 60 s`.
  - `src/features/dashboard/api.test.ts` exists (spec 013).

---

## Phase 1: Setup

None. No new dependencies, files or tokens: `--water-heater` exists.

---

## Phase 2: Foundational (blocks US1 and US3)

- [x] T001 Add the types to `src/features/dashboard/types.ts`, exactly as in data-model.md:
  - `WaterHeaterPowerStep { start: string; powerKw: number; sampledSeconds: number }`, with the comments "UTC ISO, on
    whole 5 minutes", "average over the sampled time only" and "1–300".
  - `WaterHeaterPower { locationId: string; from: string; to: string; stepSeconds: number; items:
WaterHeaterPowerStep[] }`.
- [x] T002 Write the test first, in `src/features/dashboard/api.test.ts`: `getWaterHeaterPower('l1',
  '2026-11-20T17:40:00.000Z', '2026-11-20T20:40:00.000Z')` requests `*/api/locations/l1/water-heater/power` with
      exactly those `from` and `to` query values (checked in the MSW handler), and returns the items.
- [x] T003 Add `getWaterHeaterPower(locationId, fromUtc, toUtc)` to `src/features/dashboard/api.ts`, using
      `api.get<WaterHeaterPower>` and the existing `query()` helper for `from` and `to`. Make T002 pass.
- [x] T004 Add `useRecentWaterHeater(locationId: string | undefined, startMs: number | undefined, enabled: boolean)`
      to `src/features/dashboard/hooks.ts`.
  - key `['water-heater', 'power', locationId, startMs]`
  - `queryFn: () => getWaterHeaterPower(id, iso(startMs), iso(startMs + RECENT_WINDOW_MS))`
  - `enabled: enabled && !!locationId && startMs !== undefined`
  - `refetchInterval: ONE_MINUTE`
  - `retry: false`.

  Doc comment: "a separate query, so a failure never holds back the house's power (spec 014, R3)".

**Checkpoint**: `npm test` and `npm run build` pass. Nothing is shown yet.

---

## Phase 3: User Story 2 - The steps line up with the clock (Priority: P1)

**Goal**: The card's 36 steps start on whole 5 minutes, ending with the step going on now. The house's power in a step
is averaged over its minutes with a reading.

**Independent Test**: At 20:37 the chart's labels run 17:40 … 20:35. The totals compare the same elapsed time with
yesterday (quickstart §1).

### Tests for User Story 2

- [x] T005 [P] [US2] Extend `src/features/dashboard/series.test.ts`. Cover:
  - (a) `recentWindow(new Date('2026-11-20T19:37:10Z'))` gives `startMs` = `Date.UTC(2026, 10, 20, 16, 40)` (17:40
    Oslo time), and `startMs + 35 × 5 min` is 20:35 Oslo time.
  - (b) `recentWindow` on 19:35:00Z exactly gives a start of 16:40Z.
  - (c) in `buildRecentUsage`, 2 minute readings of 0,1 kWh in a step give `current` 6 kW (`0,2 ÷ 2 × 60`). The
    existing five-reading case still gives 3 kW.
  - (d) a step with no readings stays `null`.
  - (e) totals and the yesterday comparison are unchanged for a `startMs` on whole 5 minutes.

  Update any existing expectation that relied on `sum × 12` for a step with fewer than 5 readings, and say why in the
  test name.

- [x] T006 [P] [US2] Extend `src/features/dashboard/RecentUsage.test.tsx`: the first axis step's label ends in 0 or 5
      minutes. Read the `recharts` tick text or the selected point's label through the detail line after
      `{ArrowRight}`, as `UsageChart.test.tsx` does.

### Implementation for User Story 2

- [x] T007 [US2] Implement in `src/features/dashboard/series.ts`:
  - Export `recentWindow(now: Date): { startMs: number }`, with
    `startMs = Math.floor(now.getTime() / BUCKET_MS) * BUCKET_MS − (RECENT_BUCKETS − 1) * BUCKET_MS`.
  - Change `bucketKw` to keep a count of readings per step and return `sum / count * 60`, or `null` when the count is 0.
  - Update the `RecentPoint.current` doc comment: "Average power in kW over the minutes with a reading in the 5
    minutes".

  Make T005 pass.

- [x] T008 [US2] In `src/features/dashboard/hooks.ts`, `useRecentUsage`'s `queryFn` uses `const { startMs } =
  recentWindow(new Date())` instead of rounding to the minute. Keep `previousStartMs`, the requests and the return
      value as they are. Make T006 pass, and run the whole `RecentUsage.test.tsx` and `series.test.ts`.

**Checkpoint**: Every location's chart is on whole 5 minutes, and the totals are as before.

---

## Phase 4: User Story 1 - The chart shows water heating under the power line (Priority: P1) 🎯 MVP

**Goal**: For a location with a heater, an orange area per 5 minutes under the blue line (never above it), a legend
entry, and the split in the detail line, marked "partly measured" when needed. If loading fails, a note is shown
instead.

**Independent Test**: With MSW heater steps of 2 kW, the legend has "Water heating", and the selected point reads "… ·
Water heating 2 kW · Everything else …". A location without a heater makes no request (quickstart §2, §4, §5).

### Tests for User Story 1

- [x] T009 [P] [US1] Extend `src/features/dashboard/series.test.ts` (data-model.md "Rules"), with
      `startMs = START` on whole 5 minutes and `heater` steps. Cover:
  - (a) a step at `START + 10 min` lands on `points[2]` with `heater` 2, when the house has readings there
  - (b) a step before `startMs` or at `startMs + 3 h` or later is ignored
  - (c) a step where the house has no reading gives `heater: null`, `heaterDrawn: null` and `rest: null`
  - (d) heater 3 with house 2 gives `heaterDrawn` 2, `rest` 0 and `heater` 3
  - (e) house 7,4 with heater 2 gives `rest` 5,4
  - (f) `partly` is true for `sampledSeconds: 170` on a finished step, false for 200, and false for 170 on the step
    going on now (`now` inside it)
  - (g) `hasHeater` is false with `heater` left out or `[]`, and every point has `heater: null`.
- [x] T010 [P] [US1] Extend `src/features/dashboard/RecentUsage.test.tsx`:
  - Add `*/api/locations/:id/water-heater/power` to `useApi` with a `heater` option (steps of 2 kW × 300 s on the
    minutes the consumption handler serves, rounded to whole 5 minutes), and count its calls.
  - Render with `hasWaterHeater`. Cover:
    - (a) "Water heating" in the legend (`selector: 'li'`), and after selecting the first point, "Water heating 2 kW
      · Everything else …" in the detail line
    - (b) `hasWaterHeater={false}` gives no legend entry and 0 calls to the heater endpoint
    - (c) the heater endpoint answers 500, so "Water heating could not be loaded." is shown, and the totals ("kWh",
      "kr") still are
    - (d) the heater endpoint answers `items: []`, so there is no legend entry and no note.

### Implementation for User Story 1

- [x] T011 [US1] Implement in `src/features/dashboard/series.ts`:
  - `RecentUsageInput.heater?: WaterHeaterPowerStep[]`.
  - `RecentPoint` gains `heater`, `heaterDrawn`, `rest` (all `number | null`) and `partly: boolean`, with the rules
    from data-model.md:
    - `heaterDrawn = min(heater, current)`
    - `rest = max(0, current − heater)`
    - `partly` for a finished step (start + 5 min ≤ now) with `300 − sampledSeconds > 120`.
  - Match steps by `Math.round((Date.parse(start) − startMs) / BUCKET_MS)` within `0..RECENT_BUCKETS−1`.
  - `RecentUsage.hasHeater`.

  Make T009 pass.

- [x] T012 [US1] Implement in `src/features/dashboard/RecentUsage.tsx`:
  - Take the props `{ locationId, hasWaterHeater = false }`. Call `useRecentWaterHeater(locationId, data?.startMs,
hasWaterHeater)` and pass `heater: water.data?.items` to `buildRecentUsage`.
  - Add `heater: { label: 'Water heating', color: 'var(--water-heater)' }` to `config`.
  - When `usage.hasHeater`, add an `Area dataKey="heaterDrawn"` (copied from UsageChart's heater area) between the
    `previous` Line and the `current` Area.
  - Legend: `<li>` "Water heating" with an `h-2 w-4 rounded-sm bg-water-heater` swatch when `hasHeater`. After the
    legend, when `water.error`, a muted `<p>` "Water heating could not be loaded.".
  - Build the detail line as one string: "· {kw} kW" for the house, then, when `shown.heater !== null`,
    "· Water heating {kw} kW{ (partly measured)} · Everything else {kw} kW", then "· yesterday …" as today.

  Make T010 pass.

- [x] T013 [US1] In `src/features/dashboard/DashboardPage.tsx`, render
      `<RecentUsage locationId={selected.id} hasWaterHeater={selected.hasWaterHeater === true} />`.

**Checkpoint**: The chart shows water heating for Hjemme. Other locations are unchanged apart from US2.

---

## Phase 5: User Story 3 - How much of the 3 hours was water heating (Priority: P2)

**Goal**: The line "Water heating: 3,1 kWh of 21,17 kWh (15 %)" under the comparison with yesterday.

**Independent Test**: With 12 heater steps of 2 kW × 300 s, the card reads "Water heating: 2 kWh of … (… %)", and it
reads nothing without steps (quickstart §3).

### Tests for User Story 3

- [x] T014 [P] [US3] Extend `src/features/dashboard/series.test.ts`. Cover:
  - (a) 12 steps of 2 kW × 300 s inside the elapsed time give `heaterKwh` 2
  - (b) a step after `now` is not counted
  - (c) `heaterShare` is `shareOf(heaterKwh, totalKwh)`, capped at 1, and `null` when `totalKwh` is 0
  - (d) no steps give `heaterKwh` null.
- [x] T015 [P] [US3] Extend `src/features/dashboard/RecentUsage.test.tsx`. Cover:
  - (a) with heater steps, a text matching `/^Water heating: [\d,]+ kWh of [\d,]+ kWh \(\d+ %\)$/`
  - (b) without steps, no "Water heating:" text.

### Implementation for User Story 3

- [x] T016 [US3] Add `heaterKwh` (Σ `powerKw × sampledSeconds ÷ 3600` over steps with `start < startMs + elapsed`,
      `null` without steps) and `heaterShare` (`shareOf`) to `RecentUsage` in `src/features/dashboard/series.ts`. Make
      T014 pass.
- [x] T017 [US3] In `src/features/dashboard/RecentUsage.tsx`, under the "Yesterday, same 3 hours" paragraph, when
      `usage.heaterKwh !== null`, render `<p className="mt-1 text-sm text-muted-foreground">`:
  - "Water heating: {kwh} kWh of {total} kWh ({Math.round(share × 100)} %)", using the card's `kwh` formatter
  - without " of … (… %)" when `heaterShare` is `null`.

  Make T015 pass.

**Checkpoint**: All three stories work.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T018 Run `npm test`, `npm run build` and `npm run lint`. Run `npm run format` on the changed files only.
- [ ] T019 Check at 375 px and in dark mode:
  - The orange area reads under the blue one.
  - The legend wraps cleanly with four entries.
  - The detail line fits on two lines at most.
- [ ] T020 Walk through quickstart.md §1–5 against the deployed API. Then remove
      `specs/_backlog/water-heater-power-frontend.md` in the API repo, as its note asks (a separate PR there).

---

## Changed while implementing

- **T005:** no existing test had to change for R2. Every `buildRecentUsage` case with `sum × 12` used full 5-minute
  steps, which give the same power under the new rule.
- **T006 and T010:** the card's chart cannot be hovered in jsdom, and it draws no axis ticks there.
  - T006 instead checks that both minute-consumption requests start on whole 5 minutes.
  - The detail line is built by a pure `recentDetailText(point, hasPrevious)` in `series.ts`, which `series.test.ts`
    tests directly.
  - The card tests cover the legend, the requests, the error note and the share line.
- **The detail line** is now one plain string after the bold clock time. The house's kW is no longer bold, which keeps
  the split readable as one sentence.

## Dependencies & Execution Order

- **Foundational (T001–T004):** T002 after T001, T003 after T002, and T004 after T003.
- **US2 (T005–T008):** independent of Phase 2. T007 makes T005 pass, then T008 makes T006 pass.
- **US1 (T009–T013):** after Phase 2 and US2. T011 → T012 → T013.
- **US3 (T014–T017):** after US1. It uses the `heater` input and the card's heater query.
- **Polish (T018–T020):** after all stories.

## Parallel Examples

- **Phase 2 ∥ US2:** T001–T004 touch `types.ts`, `api.ts`, `api.test.ts` and `hooks.ts`. T005 and T007 touch
  `series.ts` and `series.test.ts`. Only T008 and T004 share `hooks.ts`: do them one after the other.
- **US2:** T005 ∥ T006.
- **US1:** T009 ∥ T010.
- **US3:** T014 ∥ T015.

## Implementation Strategy

1. **US2 first:** the chart's steps move to whole 5 minutes for everyone, and the current step's power is fair. It
   can ship alone.
2. **MVP = Phase 2 + US1:** water heating under the line, which is what Roy asked for.
3. **US3:** the share line.
4. **Polish:** the visual check, then the walkthrough and removing the backlog note in the API repo.
