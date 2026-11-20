# Tasks: Warnings Inside the App

**Input**: Design documents from `/specs/012-in-app-warnings/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R7
- [data-model.md](data-model.md)
- [contracts/ui.md](contracts/ui.md), which gives the exact texts
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) and quickstart §1 ask for them. They use Vitest, Testing Library and MSW,
with a fresh `QueryClient` per test. The rules are pure and take `now` as a parameter, so no fake timers are needed
there.

**Organization**:

- Phase 2 holds the shared Oslo hour helper, the constants and the empty banner.
- Then one phase per story:
  - US1: capacity (P1)
  - US2: unusual usage (P1)
  - US3: Norgespris limit (P2)
  - US4: fitting in (P2)
- US1–US3 each add one rule and one banner line, and don't depend on each other. US4 checks them together.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md

## Facts from the code that the tasks rely on

- **Dashboard hooks (`src/features/dashboard/hooks.ts`), with their keys and intervals:**

  | Hook                                      | Key                            | Interval            | Returns                                                                                                                    |
  | ----------------------------------------- | ------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
  | `useCurrentHourCost(id)`                  | `['cost','current',id]`        | 1 min               | `{ hourStart, consumptionKwhSoFar, … }`                                                                                    |
  | `useTodayHourlyCost(id)`                  | `['cost','hourly-today',id]`   | 5 min               | `PagedHourlyCost`                                                                                                          |
  | `useLastHourPower(id)`                    | `['consumption','minute',id]`  | 1 min               | `Consumption { items: { periodStart, consumptionKwh }[] }`, per minute, over the last 60 minutes                           |
  | `useCapacityCharge(id, month, isCurrent)` | `['cost','capacity',id,month]` | 15 min when current | `CapacityCharge { set, peaks: { date, hourStartUtc, kw }[], averageKw, step: { lowerKw, upperKw } \| null, kwToNextStep }` |
  | `useMonthlyBill(id, month, isCurrent)`    | `['cost','bill',id,month]`     | 15 min when current | `MonthlyBill`                                                                                                              |
  | `useHeatmap(id)`                          | `['cost','heatmap',id,last]`   | 60 min              | four weeks of hourly items (`HEATMAP_WEEKS = 4`); its `queryFn` returns `heatmapFrom(page.items)` today                    |
  | `useNow(intervalMs)`                      | —                              | —                   | a number (ms) that ticks                                                                                                   |

- **`MonthlyBill`:**
  - `status` (`'Estimate'` or `'Final'`)
  - `projection { kwh, … } | null`
  - `strom.lines[]` and `nettleie.lines[]`, each with `{ code, quantity }`
  - the codes `SpotEnergy` (in strom: all kWh, so far + projected) and `NorgesPrisCredit` (in nettleie: the kWh within
    the limit, the same split).
- **`src/features/dashboard/heatmap.ts`:** it has a private `osloParts` formatter (en-GB, Oslo, `weekday: 'short'`,
  `hour` h23) and `WEEKDAYS = ['Mon', …, 'Sun']`.
- **`src/features/dashboard/format.ts`:** it has `osloMonth(now)`, `osloDayStartUtc(now)` and `formatKw`
  (`5,4 kW`), and the `nb-NO` number formatters.
- **`src/features/dashboard/series.ts`:** `STALE_AFTER_MS = 6 * MINUTE_MS`, which is private.
- **`src/components/AppLayout.tsx`:**
  - It has `const { hasMultiple, selected } = useSelectedLocation()`.
  - Then `<Header />`, then `<div className="px-4"><KeyReminderBanner /></div>`, then `<main>`.
  - `AppLayout.test.tsx` exists, with routes and an `AuthContext`, and serves only `/api/locations` (and
    `key-reminders` in one test).
- **`src/features/admin/KeyReminderBanner.tsx`:** the style to follow, `section role="region"` with an `AlertTriangle`
  and a link per line. Urgent lines use `bg-destructive/10 text-destructive`.

---

## Phase 1: Setup

- [x] T001 Check the baseline on `012-in-app-warnings`: run `npm run build`, `npm run lint` and `npm test`, and note the
      test count. Use `npx prettier --check` on changed files with `xargs`, never `npm run format`.

---

## Phase 2: Foundational (blocks every story)

- [x] T002 [P] Share the Oslo hour and weekday in `src/features/dashboard/heatmap.ts`:
  - Export `osloWeekdayHour(at: Date): { weekday: number; hour: number } | null`, built from the existing `osloParts`.
    `weekday` is 0 = Monday, the index into `WEEKDAYS`.
  - Use it in `heatmapFrom` too, with the behaviour unchanged.
  - Export `WEEKDAY_LONG = ['Monday', …, 'Sunday']` for the texts.
  - **Test in `heatmap.test.ts`:** 2026-11-21T13:30Z gives Sat, 14. Both 2026-10-25T00:30Z and 2026-10-25T01:30Z give
    Sun, 02: the repeated hour when the clocks go back.
- [x] T003 [P] Create `src/features/dashboard/warnings.ts` with only the constants from data-model, each with a comment:
  - `CAPACITY_MIN_MINUTES = 10`
  - `USAGE_WINDOW_MINUTES = 15`
  - `USAGE_MIN_READINGS = 5`
  - `USAGE_RATIO = 2`
  - `USAGE_MIN_EXCESS_KW = 1`
  - `USUAL_MIN_WEEKS = 3`
  - `STALE_AFTER_MINUTES = 6`, the same as `series.ts`; say so in the comment
  - `NORGESPRIS_MARGIN_KWH = 0.5`.
- [x] T004 Create `src/features/dashboard/WarningBanner.tsx` (after T003):
  - **Props:** `{ location: LocationSummary }`, the type from `../locations`.
  - **Clock:** `const now = useNow(60_000)`.
  - **Empty for now:** with no warning lines, render nothing. Each story adds its line.
  - **When there are lines:** a `section`, `role="region"`, `aria-label="Warnings for {location.name}"`, with an
    `AlertTriangle` icon and a `ul` of `Link to="/"` lines.
  - **Export** it from `src/features/dashboard/index.ts`.
- [x] T005 Place the banner in `src/components/AppLayout.tsx` (after T004): inside the existing `px-4` div, before
      `<KeyReminderBanner />`, render `{selected && <WarningBanner location={selected} />}`. Import it from
      `../features/dashboard`. Update the comment on the div to cover both banners.

**Checkpoint**: build, lint and tests pass, and nothing new is visible.

---

## Phase 3: User Story 1, stay below the next capacity step (P1) 🎯 MVP

**Goal**: The capacity line, when this hour's pace would lift the month's three-peak average into the next step
(FR-001, FR-002).

**Independent Test**: In the rule's tests:

- With peaks 9,5 and 9,2 kW on other days, a next step at 10 kW and the hour at 6 kWh after 30 minutes, the rule
  warns.
- The limit is `T* = 30 − 9,5 − 9,2 = 11,3` kWh, so the rest of the hour must stay under `(11,3 − 6) / 0,5 = 10,6` kW.

### Tests for User Story 1

- [x] T006 [P] [US1] Add a `capacityWarning` describe block to `src/features/dashboard/warnings.test.ts`, with fixed
      `now` values:
  - **The example above:** `{ nextStepKw: 10, limitKw: 10.6 }`.
  - **Today among the top three:** with peaks `[{today, 9.8}, {d1, 9.5}, {d2, 9.2}]`, only d1 and d2 count as others,
    so `T* = 11,3`.
  - **Fewer than three days:**
    - one other day at 4 kW and today, so two days: `T* = 2 × 10 − 4 = 16`
    - no other days: `T* = 10`.
  - **No warning when:**
    - 10 minutes or less have passed
    - the projection is below `T*`
    - the projection is not above today's peak so far (today's completed hours have a 13 kWh hour, and the projection
      is 12)
    - `step.upperKw` is `null` (the top step)
    - `set` is `false` or `step` is `null`
    - any input is missing.
  - **Already past:** `soFar ≥ T*` gives `limitKw: null`.
  - **Rounding down:** a limit of 4,26 kW gives 4,2.
- [x] T007 [P] [US1] Create `src/features/dashboard/WarningBanner.test.tsx` and its setup:
  - Render the banner in a `MemoryRouter` with a `LocationSummary` fixture.
  - Use MSW handlers for each input, with switches to make them due or quiet, or to answer 500.
  - Fix the clock with `vi.useFakeTimers({ toFake: ['Date'] })` and `setSystemTime` at 2026-11-20T10:30:00Z, so the
    current hour is 30 minutes in.
  - **The capacity case:** the line "This hour may lift the capacity step above 10 kW. Stay under 10,6 kW for the rest
    of the hour.", with the first sentence bold, is a link to `/`, and the region is named "Warnings for Hjemme".
  - **The already-past case:** "This hour has lifted the capacity step above 10 kW."

### Implementation for User Story 1

- [x] T008 [US1] Add `capacityWarning({ capacity, todayHours, currentHour, now })` to `src/features/dashboard/warnings.ts`,
      by research R1:
  - **Today:** `today = osloDateOf(now)`, with the en-CA Oslo date. Reuse `osloToday` from `format.ts` (spec 011).
  - **Minutes passed:** `m = (now − hourStart) / 60 000`. Return `null` when `m <= CAPACITY_MIN_MINUTES` or `m >= 60`.
  - **Projection:** `p = soFar × 60 / m`.
  - **Today's peak so far:** `t` = the max `consumptionKwh` of today's items with `hourStart < currentHour.hourStart`,
    or 0.
  - **The other days:** `others` = the peaks with `date !== today`, sorted by `kw` from highest. `n` = the number of
    days counted, which is `min(3, others.length + 1)`.
  - **The limit:** `T* = n × L − (sum of the top n−1 others)`, with `L = step.upperKw`.
  - **When it warns:** `p ≥ T*` and `p > t`.
  - **The rest of the hour:** `limitKw = floor(((T* − s) / ((60 − m) / 60)) × 10) / 10`, or `null` if `T* − s ≤ 0`.
  - Return `{ nextStepKw: L, limitKw }`.
- [x] T009 [US1] Show the capacity line in `src/features/dashboard/WarningBanner.tsx`:
  - **Reads:** `useCapacityCharge(id, osloMonth(new Date(now)), true)`, `useTodayHourlyCost(id)` and
    `useCurrentHourCost(id)`.
  - **Calls:** `capacityWarning`.
  - **Text:** from contracts/ui.md, with the numbers in nb-NO with one decimal (`formatKw` style).
  - **Style:** the destructive style (`bg-destructive/10 text-destructive`), with the first sentence in `font-semibold`.
  - **Missing or failed data:** the rule returns `null`, so there is no line.

**Checkpoint**: T006 and T007 pass, and the capacity line shows on every page.

---

## Phase 4: User Story 2, notice unusual usage right now (P1)

**Goal**: The usage line, when the last 15 minutes are at least twice the usual and at least 1 kW above it (FR-003,
FR-004).

**Independent Test**: In the tests, a usual of 0,9 kW and a power now of 3,8 kW give "about 4× the usual". 1,7 kW gives
no line. A usual of 0,3 and a power now of 0,9 give no line.

### Tests for User Story 2

- [x] T010 [P] [US2] Create `src/features/dashboard/usual.test.ts` for `usualPower(items, now)`:
  - **The median** of 4 matching Saturdays at 14:00 Oslo (0,8, 0,9, 1,0, 5,0) is 0,95, with `weeks: 4`.
  - **With 3 matches,** the median is the middle value, with `weeks: 3`.
  - **Non-matching items** are ignored: another hour, or another weekday.
  - **No match** gives `null`.
- [x] T011 [P] [US2] Add a `usageWarning` describe block to `src/features/dashboard/warnings.test.ts`:
  - **Warns:** 15 readings of 3,8/60 kWh in the last 15 minutes, with a usual of `{ kw: 0.9, weeks: 4 }`, give
    `{ nowKw: 3.8, usualKw: 0.9, ratio: 4, weekday: 'Saturday' }`.
  - **No warning when:**
    - 1,7 kW (less than 2×)
    - a usual of 0,3 and 0,9 kW now (not +1 kW)
    - `weeks: 2`
    - the newest reading is 7 minutes old
    - there are only 4 readings in the window
    - `usual` is `null`.
  - **A usual of 0** with 1,2 kW now warns, with `usualKw: 0`.
- [x] T012 [P] [US2] Extend `src/features/dashboard/WarningBanner.test.tsx`:
  - **The line:** with the minute and four-week handlers set to "unusual", the line reads "Hjemme uses 3,8 kW now,
    about 4× the usual 0,9 kW for a Friday at this hour." The fixed clock is a Friday.
  - **The usual of 0** gives the "against the usual 0,0 kW" text.
  - **No line** with the quiet handlers.

### Implementation for User Story 2

- [x] T013 [P] [US2] Create `src/features/dashboard/usual.ts`:
  - **`usualPower(items: HourlyCostItem[], now: Date)`** → `{ kw, weeks } | null`.
  - **The match:** `osloWeekdayHour(now)` is compared with `osloWeekdayHour(new Date(item.hourStart))`.
  - **The median** is taken over the matches' `consumptionKwh`, with an even count averaging the two middle values.
- [x] T014 [US2] Share the four weeks in `src/features/dashboard/hooks.ts` (after T013):
  - **The shared query:** move the heatmap query's options to a `fourWeeksQuery(id)` helper whose `queryFn` returns
    `page.items`, with the same key, `staleTime` and `refetchInterval`.
  - **`useHeatmap(id)`:** it becomes `useQuery({ ...fourWeeksQuery(id), select: heatmapFrom, enabled: !!id })`.
    `HeatmapCard` and its tests behave the same.
  - **Add `useUsualPower(id, now)`:** `useQuery({ ...fourWeeksQuery(id), select: (items) => usualPower(items,
new Date(now)), enabled: !!id })`.
  - **The key** stays `['cost','heatmap',id,last]`, so the two share one request.
- [x] T015 [US2] Add `usageWarning({ minutes, usual, now })` to `src/features/dashboard/warnings.ts`, by research R3
      and data-model:
  - **The window:** the readings with `periodStart` in `[now − 15 min, now]`.
  - **Stale:** none of them is no older than 6 minutes.
  - **The power now:** `nowKw` = the mean of `consumptionKwh × 60` over the window.
  - **When it warns:** `nowKw ≥ 2 × usualKw` and `nowKw − usualKw ≥ 1`.
  - **The ratio:** `Math.round(nowKw / usualKw)`, or `null` when `usualKw` is 0.
  - **The weekday:** `WEEKDAY_LONG[osloWeekdayHour(now).weekday]`.
- [x] T016 [US2] Show the usage line in `src/features/dashboard/WarningBanner.tsx`:
  - **Reads:** `useLastHourPower(id)` and `useUsualPower(id, now)`.
  - **Text:** from contracts/ui.md, in the muted warning style.
  - **Position:** after the capacity line.

**Checkpoint**: T010–T012 pass, and `HeatmapCard.test.tsx` still passes unchanged.

---

## Phase 5: User Story 3, know when the month goes over the Norgespris limit (P2)

**Goal**: The Norgespris line, when the expected bill projects the month over the limit (FR-010, SC-006).

**Independent Test**: In the tests:

- A bill with `SpotEnergy` 1 240 kWh, `NorgesPrisCredit` 1 000 kWh and `projection.kwh` 600 gives "expected to use
  1 240 kWh … limit of 1 000 kWh".
- With `projection.kwh` 200 (so far 1 040), the line says the limit has been passed.
- With 840 and 840, there is no line.

### Tests for User Story 3

- [x] T017 [P] [US3] Add a `norgesPrisWarning` describe block to `src/features/dashboard/warnings.test.ts`, using
      `november2026Estimate()` from `src/test/bills.ts` with the two lines' `quantity` changed by `withLine`:
  - **Projected over:** `{ projectedKwh: 1240, limitKwh: 1000, passed: false }`.
  - **Passed:** `passed: true`.
  - **No warning when:**
    - the projection is within the limit (equal quantities, or less than 0,5 kWh apart)
    - there is no `NorgesPrisCredit` line (`spotBill()`)
    - the bill is `status: 'Final'`
    - `projection` is `null`.
- [x] T018 [P] [US3] Extend `src/features/dashboard/WarningBanner.test.tsx`:
  - **Projected over:** the bill handler serves the projected-over bill, and the line reads "Hjemme is expected to use
    1 240 kWh this month, above the Norgespris limit of 1 000 kWh. The kWh above it are priced at spot price."
  - **Passed:** "Hjemme has passed the Norgespris limit of 1 000 kWh this month. The rest of the month is priced at
    spot price.", in the urgent style.
  - **A 500 from the bill** gives no line, and the other lines still show.

### Implementation for User Story 3

- [x] T019 [US3] Add `norgesPrisWarning(bill: MonthlyBill)` to `src/features/dashboard/warnings.ts`, by research R7:
  - **The two quantities:** `total` is the `quantity` of the `SpotEnergy` line in `bill.strom.lines`, and `within` is
    the `quantity` of the `NorgesPrisCredit` line in `bill.nettleie.lines`.
  - **No warning:** return `null` unless `status === 'Estimate'`, `projection` is set, both lines are found, and
    `total − within > NORGESPRIS_MARGIN_KWH`.
  - **Return:** `{ projectedKwh: total, limitKwh: within, passed: total − projection.kwh ≥ within }`.
- [x] T020 [US3] Show the Norgespris line in `src/features/dashboard/WarningBanner.tsx`:
  - **Reads:** `useMonthlyBill(id, osloMonth(new Date(now)), true)`.
  - **Text:** from contracts/ui.md, with kWh as whole numbers in nb-NO (`1 240`).
  - **Style:** muted while projected, urgent once passed.
  - **Position:** after the usage line.

**Checkpoint**: T017 and T018 pass.

---

## Phase 6: User Story 4, the warnings fit in with the rest of the app (P2)

**Goal**: The order, the location, the shared area with the key reminders, and quiet failure (FR-005 to FR-009).

**Independent Test**: In `AppLayout`, an administrator with all three warnings and a key reminder sees one area with the
warnings first (capacity, usage, Norgespris), then the key reminders. Switching location shows only its warnings.

### Tests for User Story 4

- [x] T021 [P] [US4] Extend `src/features/dashboard/WarningBanner.test.tsx`:
  - **All three due:** the links' texts are in the order capacity, usage, Norgespris.
  - **None due:** no region is rendered.
  - **All inputs answer 500:** no region and no `role="alert"`.
- [x] T022 [P] [US4] Extend `src/components/AppLayout.test.tsx`:
  - **The order:** with warning handlers (all due) and a key reminder for an administrator, the "Warnings for Hjemme"
    region comes before "Keys that expire soon" in the document (`compareDocumentPosition`).
  - **Locations:** with two locations, choosing the second (as `Header.test.tsx` does) shows "Warnings for Hytta" with
    only Hytta's lines.
  - **No location:** no warning region.
  - **The existing tests** must still pass. Give them warning handlers that answer "quiet", so MSW has no unhandled
    requests, because the banner now asks for the location's figures on every page. Put the handlers in a shared
    helper in `src/test/`, for example `warningHandlers(locationId, { due })`, used by both test files.

### Implementation for User Story 4

- [x] T023 [US4] In `src/features/dashboard/WarningBanner.tsx`, check the final details:
  - The lines are in a fixed order: capacity, usage, Norgespris.
  - The banner renders nothing when no line applies.
  - It never renders an error.
  - It fits at 375 px: `text-sm`, no horizontal scroll, and each line at most two lines at that width, with short
    texts.
- [x] T024 [US4] Check that Now makes no extra requests (SC-004). In `DashboardPage.test.tsx`, or a small new test,
      **Done 2026-11-20, differently:** a test in `WarningBanner.test.tsx` renders the banner with `CapacityCard` and
      `ExpectedBillCard`, and checks that the capacity figures and the bill are fetched once each. The Now page doesn't
      read today's hours, the per-minute readings or the four weeks, so the banner does add those three requests there, as
      FR-009 allows. The plan is corrected.
      count the requests to the six inputs when rendering `DashboardPage` inside `AppLayout`. Each key is fetched once,
      because the banner and the cards share their queries. If a request is duplicated, align the hook's parameters
      (for example the month) with the card's.

**Checkpoint**: T021 and T022 pass, and the whole suite is green.

---

## Phase 7: Polish and checks

- [x] T025 Run `npm run build`, `npm run lint` and `npm test`, and `npx prettier --check` on the changed files with
      `xargs`. The test count is T001's plus the new tests. Lint shows no new warnings; there are 4 on `main`.
- [x] T026 Review the diff:
  - no `any` and no unjustified `as`
  - the thresholds only as the named constants
  - no new API call
  - the rules are pure and take `now`
  - the banner shows no error text.
- [x] T027 [P] Update `backlog.md`, "Warnings": this first version is built (spec 012), with three warnings in the app.
      Expensive hours tomorrow, warning within 10 % of the Norgespris limit, and push remain. Set the spec's status line.
- [ ] T028 Manual: quickstart §2, steps 1–7, against the deployed API:
  - a quiet hour gives no banner
  - a 2 kW heater at a quiet hour gives the usage line within about 2 minutes
  - the capacity line only if one extra peak is affordable
  - the Norgespris line against the expected bill's numbers
  - locations, a viewer, and 375 px in light and dark mode.

---

## Dependencies and execution order

- **Phase 1 → Phase 2 → (US1 ∥ US2 ∥ US3) → US4 → Phase 7.**
- **Phase 2:** T002 and T003 run in parallel. T004 needs T003. T005 needs T004.
- **US1:** T006 and T007 first. Then T008, then T009.
- **US2:** T010–T012 first. T013 runs in parallel with them. Then T014, then T015, then T016.
- **US3:** T017 and T018 first. Then T019, then T020.
- **US4:** T021 and T022 need US1–US3 for their "all three due" cases. Then T023 and T024.
- **Shared files:**
  - `warnings.ts` and `WarningBanner.tsx` are touched by every story. When several are done in parallel, add each
    story's function and line in its own block, and merge in order: capacity, usage, Norgespris.
  - `WarningBanner.test.tsx` is extended by every story. Add one `describe` block per story.

## Parallel examples

```text
Phase 2:  T002 (heatmap.ts) ∥ T003 (warnings.ts constants)
Tests:    T006 ∥ T010 ∥ T011 ∥ T017 (pure tests in different blocks or files)
Rules:    T008 (capacity) · T013 (usual.ts) ∥ T015 (usage) · T019 (Norgespris), all pure
```

## Implementation strategy

1. **MVP = Phases 1–3:** the capacity warning. It saves the most money and can only be acted on in the hour.
2. **Then US2:** unusual usage, which matters most for the cabin when no one is there.
3. **Then US3:** the Norgespris limit.
4. **Then US4:** the order, the locations and the shared area.
5. **Commit and open a PR only when Roy asks.** Suggested commits:
   - "Warn when this hour may lift the capacity step"
   - "Warn about unusual usage right now"
   - "Warn when the month goes over the Norgespris limit"
   - "Fit the warnings in with the key reminders"
