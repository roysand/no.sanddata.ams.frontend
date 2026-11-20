# Tasks: Show Water Heating Apart from the Rest

**Input**: Design documents from `/specs/010-water-heater-split/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R8
- [data-model.md](data-model.md)
- [contracts/api.md](contracts/api.md) and [contracts/ui.md](contracts/ui.md), which give the exact texts and columns
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) asks for tests for branching logic, and the quickstart lists them. They
use Vitest, Testing Library and MSW, with a fresh `QueryClient` per test. Tests assert visible text and roles.

**Organization**:

- Phase 2 holds the types, the API normalisation and the pure `waterHeater.ts` that every story uses.
- Then one phase per story: US1 chart (P1), US2 bill (P1), US3 Heater tab (P2) and US4 CSV (P2).
- The stories don't depend on each other.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md

## Facts from the code that the tasks rely on

- **Types:**
  - `HourlyCostItem`, `DailyCostItem` and `MonthlyBill` are in `src/features/dashboard/types.ts`. Item fields:
    `consumptionKwh`, `actual: {cost…} | null`, `comparison`.
  - Typed fixtures of these exist in `StandbyCard.test.tsx`, `standby.test.ts`, `heatmap.test.ts`,
    `HeatmapCard.test.tsx`, `series.test.ts`, `exportCsv.test.ts`, and the bill builders in `src/test/bills.ts`:
    `withParts`, `july2026Bill`, `november2026Estimate` and `emptyBill`.
- **`api.ts`:**
  - `getHourlyCost`, `getHourlyCostPage`, `getDailyCost`, `getDailyCostRange` and `getMonthlyBill` return
    `api.get<…>(…)` directly.
- **Chart data:**
  - `series.ts` has `UsageRow {key, kwh, nok}`, `rowsFromHourly` and `rowsFromDaily(items, byMonth)`, which sums a
    month's days for the year view.
  - It also has `UsagePoint {key, label, current, previous}`, `UsageSeries` and `buildUsageSeries(currentSlots,
currentRows, previousSlots, previousRows, unit)`.
  - The rows are built in `fetchPeriod` in `hooks.ts`.
- **`UsageChart.tsx`:**
  - It builds `rows = series.points.map(...)` with `{label, current, previous}`.
  - `bars = period !== 'day'`.
  - Bars: a `previous` `<Bar>` and a `current` `<Bar>`, each with `<LabelList content={BarValue}>`.
  - Day view: a `previous` `<Line>` and a `current` `<Area>`.
  - The legend is a `<ul>`, and the detail line is a `<p aria-live="polite">` showing `shown`.
  - `config` holds the chart colours.
- **`BillView.tsx`:** `BillInvoice` renders the total row (`border-t-2`), then `<IncompleteNote>`.
- **`ExpectedBillCard.tsx`:** `Estimate` renders the "Expected total" group and the So far / Rest of the month list,
  then the notes `div` (`space-y-1 text-xs text-muted-foreground`), then `<IncompleteNote>`.
- **Hooks (`hooks.ts`):**
  - `useTodayHourlyCost(id)`: key `['cost','hourly-today',id]`, every 5 min.
  - `useMonthlyBill(id, month, isCurrent)`: key `['cost','bill',id,month]`.
- **`WaterHeaterPage.tsx`:** returns `<WaterHeaterCard locationId={selected.id} />` at the end.
- **Oslo time helpers:**
  - `periods.ts` exports `dayStart(date)` and `addDays(date, n)`.
  - `format.ts` has `osloDayStartUtc`, `formatNok`, `formatOsloDate`, `formatMonth` and `addMonths`.
- **Colours:** `src/index.css` defines `--usage` and `--usage-ghost` in `:root` (around line 104) and in dark (around
  line 150), plus `--color-usage: var(--usage)` in `@theme` (around line 19).

---

## Phase 1: Setup

- [x] T001 Check the baseline on `010-water-heater-split`: run `npm run build`, `npm run lint` and `npm test`, and note
      the test count. Use `npx prettier --check` on changed files only. Don't run `npm run format`, because it reformats
      unrelated files.
- [x] T002 [P] Add the heater colour to `src/index.css` (research R8):
  - `--water-heater: oklch(0.68 0.16 45)` in `:root`
  - `--water-heater: oklch(0.75 0.13 45)` in the dark block(s), next to `--usage`
  - `--color-water-heater: var(--water-heater)` in `@theme`, so `bg-water-heater` and `fill-water-heater` exist.

---

## Phase 2: Foundational (blocks every story)

- [x] T003 Add the types to `src/features/dashboard/types.ts`, as in [data-model.md](data-model.md):
  - `export interface WaterHeaterPart { kwh: number; cost: number | null; sampledMinutes: number; capped: boolean }`
  - `export interface WaterHeaterBillPart extends WaterHeaterPart { firstHourUtc: string; lastHourUtc: string; estimate: false }`
  - On `HourlyCostItem` and `DailyCostItem`, add `waterHeater: WaterHeaterPart | null`. On `MonthlyBill`, add
    `waterHeater: WaterHeaterBillPart | null`.
  - Doc comment: "null = no heater figure (no heater, before it was connected, an outage, or an API without spec 012);
    never zeros".
- [x] T004 Normalise the field in `src/features/dashboard/api.ts` (research R2):
  - In `getHourlyCost`, `getHourlyCostPage`, `getDailyCost` and `getDailyCostRange`, map each item to
    `{ ...item, waterHeater: item.waterHeater ?? null }`.
  - In `getMonthlyBill`, map the bill the same way.
  - Type the raw response as the item with `waterHeater?: … | null`, in a local `Raw…` type in `api.ts`, so no
    `any` or `as` is needed.
- [x] T005 [P] Add `waterHeater: null` to every typed fixture that no longer compiles after T003, so `npm run build`
      and the tests' type check pass. Don't change any assertion. Files:
  - `src/test/bills.ts`: in the builders, so all bills get it
  - `src/features/dashboard/StandbyCard.test.tsx`, `standby.test.ts`, `heatmap.test.ts`, `HeatmapCard.test.tsx`,
    `series.test.ts` and `exportCsv.test.ts`: in each file's item helper where one exists, otherwise in each literal.
  - Then grep `src/` for other `consumptionKwh:` literals typed as these items.
- [x] T006 [P] Create `src/features/dashboard/waterHeater.ts` (research R1 and R3). It is pure, with no React:
  - `restOf(total: number | null, heater: number | null): number | null`: `null` if either is `null`, otherwise
    `Math.max(0, total - heater)`.
  - `sumParts(parts: (WaterHeaterPart | null)[]): WaterHeaterPart | null`:
    - Skip `null`, and return `null` if nothing is left.
    - `kwh` and `sampledMinutes` are sums. `cost` is the sum, or `null` if any part's cost is `null`. `capped` is
      any part capped.
  - `isPartlyMeasured(sampledMinutes: number, expectedMinutes: number): boolean`:
    `expectedMinutes - sampledMinutes > Math.max(2, 0.01 * expectedMinutes)`.
  - `osloDayMinutes(date: string): number`: `(dayStart(addDays(date, 1)) - dayStart(date)) / 60_000`, giving 1380,
    1440 or 1500.
  - `elapsedMinutes(startUtc: Date, endUtc: Date, now: Date): number`: the minutes from the start to
    `min(now, end)`, at least 0.
  - `shareOf(heaterKwh: number, totalKwh: number): number | null`: `null` if `totalKwh <= 0`, otherwise
    `Math.min(1, heaterKwh / totalKwh)`.
- [x] T007 [P] Write `src/features/dashboard/waterHeater.test.ts` to test T006:
  - **`restOf`:** a normal case; a negative case clamped to 0; `null` when either input is `null`.
  - **`sumParts`:** an exact sum; `null` cost when one part's cost is `null`; nulls skipped; all-null or empty gives
    `null`; capped ORed.
  - **`isPartlyMeasured`:** 60 vs 59 → false; 60 vs 57 → true; 1440 vs 1430 → false; 1440 vs 1420 → true.
  - **`osloDayMinutes`:** `2026-03-29` → 1380, `2026-10-25` → 1500, `2026-11-20` → 1440.
  - **`elapsedMinutes`:** before the end, and after the end.
  - **`shareOf`:** a normal case; total 0 → `null`; heater > total → 1.

**Checkpoint**: build, lint and tests pass, and the UI is unchanged.

---

## Phase 3: User Story 1, the usage chart shows water heating (P1) 🎯 MVP

**Goal**: The current period's slots show water heating and everything else in kWh or kr, with the legend and the
detail line. Everything else is unchanged (FR-002 to FR-005, FR-009, FR-010).

**Independent Test**: [quickstart](quickstart.md) §2, steps 2–5 and 10. In tests, a day fixture with parts shows
"Water heating" in the legend and in the detail line. A fixture without parts renders exactly as before.

### Tests for User Story 1

- [x] T008 [P] [US1] Extend `src/features/dashboard/series.test.ts`:
  - **`rowsFromHourly`:** the new fields are set from `waterHeater`. `expectedMinutes` is 60, or the elapsed minutes
    for the hour going on at `now`.
  - **`rowsFromDaily`:** for days, `expectedMinutes` is `osloDayMinutes`. In the year view (`byMonth`), the parts of
    a month's days are summed with `sumParts`, and `expectedMinutes` is summed.
  - **`buildUsageSeries` in kWh:** `heater`, `rest = current − heater`, `partly` and `hasHeater`.
  - **`buildUsageSeries` in kr:** a row with `heaterNok: null` gives `heater: null`, `rest: current`.
  - **Previous points:** they carry no heater values.
  - **No parts:** `hasHeater` is `false`, and the points are equal to today's, apart from `heater: null`,
    `rest: current` and `partly: false`.
- [x] T009 [P] [US1] Extend `src/features/dashboard/UsageChart.test.tsx` with MSW fixtures that carry `waterHeater`
      for some hours or days:
  - **The legend** has "Water heating" only when the period has a part.
  - **The detail line:** after selecting a slot with the arrow keys, it reads
    `… · Water heating 2,1 kWh · Everything else 1,3 kWh`, in the format of [contracts/ui.md](contracts/ui.md).
  - **"(partly measured)"** shows for a slot with too few minutes.
  - **A slot without a part:** the detail line has no "Water heating".
  - **kr with an unknown heater cost:** no split in the detail line.
  - **Regression:** an existing test fixture without `waterHeater` gives the same legend and detail texts as before.

### Implementation for User Story 1

- [x] T010 [US1] Extend `src/features/dashboard/series.ts` (data-model "Chart rows and points"):
  - **`UsageRow`** gains `heaterKwh`, `heaterNok`, `sampledMinutes: number | null` and `expectedMinutes: number`.
  - **`rowsFromHourly(items, now = new Date())`** fills these from `item.waterHeater`. `expectedMinutes` is 60, or
    `elapsedMinutes` for the current hour.
  - **`rowsFromDaily(items, byMonth, now = new Date())`:**
    - Each day's `expectedMinutes` is `osloDayMinutes(date)`. For today it is the elapsed minutes since `dayStart`.
    - In the month case, keep a per-key list of parts and set the heater fields from `sumParts`.
    - The row's kWh and nok summing is unchanged.
  - **`UsagePoint`** gains `heater`, `rest` and `partly`. **`UsageSeries`** gains `hasHeater`.
  - **`buildUsageSeries`** fills them for the chosen unit, for the current period only. Totals, deltas and
    `hasCurrent`/`hasPrevious` are unchanged.
  - **In `hooks.ts`:** check that `fetchPeriod` still compiles. The `now` default is enough, with no key change.
- [x] T011 [US1] Draw the split in `src/features/dashboard/UsageChart.tsx` (research R4, [contracts/ui.md](contracts/ui.md)):
  - **Data:** `rows` gains `heater` and `rest`. Add `heater: { label: 'Water heating', color: 'var(--water-heater)' }`
    to `config`.
  - **Bars:** replace the single `current` `<Bar>` with two bars, both with `stackId="current"` and
    `isAnimationActive={false}`:
    - `dataKey="heater"`, `fill="var(--water-heater)"`, `radius={[0, 0, 2, 2]}`
    - `dataKey="rest"`, `fill="var(--usage)"`, `radius={[4, 4, 0, 0]}`, with
      `<LabelList dataKey="current" content={BarValue} />`
  - **Without a heater:** render the stacked pair only when `series.hasHeater`, and otherwise keep today's single
    `current` bar unchanged, so the look and the tests without heater data are identical (SC-002).
  - **Previous bar:** unchanged.
  - **Day view:** when `series.hasHeater`, add an `<Area dataKey="heater" type="monotone" stroke="var(--water-heater)"
strokeWidth={1} fill="var(--water-heater)" fillOpacity={0.5} isAnimationActive={false} />` before the `current`
    `Area`, so it sits under it. `null` leaves gaps, so don't use `connectNulls`.
  - **Legend:** when `series.hasHeater`, add an `<li>` with a `bg-water-heater` swatch, `size-2.5 rounded-sm` for
    bars and `h-2 w-4 rounded-sm` for the day view, and the text "Water heating".
  - **Detail line:** when `shown.heater !== null`, add `· Water heating {format(unit, shown.heater)}`,
    `(partly measured)` if `shown.partly`, and `· Everything else {format(unit, shown.rest)}`. Put it after the total
    and before the previous-period text.
  - The `aria-label` is unchanged.

**Checkpoint**: T008 and T009 pass, and the chart matches [contracts/ui.md](contracts/ui.md) on Now and History.

---

## Phase 4: User Story 2, the bill says how much was water heating (P1)

**Goal**: A water heating line below the total on the History bill and the expected bill. No amount changes (FR-006).

**Independent Test**: [quickstart](quickstart.md) §2, steps 6–7. The bill tests show the texts from contracts/ui.md,
and no line without a part.

### Tests for User Story 2

- [x] T012 [P] [US2] Extend `src/features/dashboard/BillCard.test.tsx` with a Final month that carries `waterHeater`.
      Add it with a small `withWaterHeater(bill, part)` helper in `src/test/bills.ts`. Check:
  - **From the 1st:** `Water heating in November: 104,6 kWh · 94 kr`, when `firstHourUtc` is on the month's first
    Oslo day.
  - **Later start:** `Water heating since 19. november: …`.
  - **Unknown cost:** no kr.
  - **No part:** no "Water heating" text.
  - **Totals:** the total amount text is unchanged.
- [x] T013 [P] [US2] Extend `src/features/dashboard/ExpectedBillCard.test.tsx` with `november2026Estimate()` plus a
      part. Check that it shows `Water heating so far this month: …` and `Measured so far, not part of the estimate.`.
      Without a part, there is no line.

### Implementation for User Story 2

- [x] T014 [US2] Add `export function WaterHeaterBillNote({ bill }: { bill: MonthlyBill })` to
      `src/features/dashboard/BillView.tsx`:
  - Return `null` when `bill.waterHeater` is `null`.
  - **The period text:**
    - `so far this month` for an Estimate bill
    - `in {Month}` (from `formatMonth(bill.month)`, first word, capitalised as in contracts/ui.md) for a Final bill
      whose `firstHourUtc` falls on the month's first Oslo day
    - `since {formatOsloDate(firstHourUtc)}` otherwise
  - **The values:** `{kwh} kWh`, using the chart's kWh formatter style with 1 decimal, nb-NO, then ` · {formatNok(cost)}`
    when the cost is not `null`.
  - **For an Estimate bill,** add a second line, `Measured so far, not part of the estimate.`
  - **Markup:** `<p className="text-xs text-muted-foreground">`, with no amount column, so it doesn't read as a bill
    line.
  - Render it in `BillInvoice`, right after the total row and before `<IncompleteNote>`.
- [x] T015 [US2] Render `<WaterHeaterBillNote bill={bill} />` in `src/features/dashboard/ExpectedBillCard.tsx`, in
      `Estimate`, as the first child of the notes `div` (`space-y-1 text-xs text-muted-foreground`), above the basis text.
      If the card has a Final-month branch that shows a total, render it there too, below the total.

**Checkpoint**: T012 and T013 pass, and the existing bill tests are unchanged.

---

## Phase 5: User Story 3, the Heater tab shows today and this month (P2)

**Goal**: An "Energy" card under the live heater card (FR-007, FR-011).

**Independent Test**: [quickstart](quickstart.md) §2, step 8. The page test shows the today and month rows, and
"No measurements yet".

### Tests for User Story 3

- [x] T016 [P] [US3] Create `src/features/dashboard/WaterHeaterEnergyCard.test.tsx`, and extend
      `WaterHeaterPage.test.tsx`. MSW serves the hourly-today and bill responses:
  - **With parts:** `Today` shows `4,2 kWh · 3,80 kr · 31 % of today's use`, and `This month` shows the bill part's
    kWh and kr.
  - **Today without parts:** `No measurements yet`. **A bill without a part:** `No measurements yet` on the month row.
  - **Today's total kWh is 0:** no share.
  - **Cache:** with the bill and hourly-today already in the test's `QueryClient` cache, no request is made for them
    on mount. Count the MSW requests.
  - **No heater (404):** the energy card is not rendered.

### Implementation for User Story 3

- [x] T017 [US3] Create `src/features/dashboard/WaterHeaterEnergyCard.tsx`, following
      [contracts/ui.md](contracts/ui.md) "Heater tab":
  - **Card:** a shadcn `Card` titled "Energy", with two rows (a `dl`): Today and This month.
  - **Today:** from `useTodayHourlyCost(locationId)`:
    - `part = sumParts(items.map((i) => i.waterHeater))`, and `total = Σ consumptionKwh`
    - shows `{kWh} · {kr} · {Math.round(share × 100)} % of today's use`, where share is `shareOf(part.kwh, total)`
      and is left out when `null`.
  - **This month:** `useMonthlyBill(locationId, currentMonth, true)`, with `currentMonth` taken the same way as
    `ExpectedBillCard` takes it (reuse that helper). Shows `bill.waterHeater`, plus `since {formatOsloDate}` when
    `firstHourUtc` is after the month's first Oslo day.
  - **Missing data:** `No measurements yet` for a `null` part. A `Skeleton` row while loading. On an error, the row
    shows a short muted "Could not load", and the live card stays unaffected.
- [x] T018 [US3] In `src/features/dashboard/WaterHeaterPage.tsx`, render
      `<><WaterHeaterCard locationId={selected.id} /><WaterHeaterEnergyCard locationId={selected.id} /></>` in a
      `space-y-4` wrapper, only on the heater path (not on the 404 note).

**Checkpoint**: T016 passes, and the month figure on the tab equals the bill line (SC-004).

---

## Phase 6: User Story 4, the CSV export includes water heating (P2)

**Goal**: Five columns at the end of both files (FR-008, research R7).

**Independent Test**: [quickstart](quickstart.md) §2, step 9. The CSV tests show the headers, filled cells and empty
cells.

### Tests for User Story 4

- [x] T019 [P] [US4] Extend `src/features/dashboard/exportCsv.test.ts`, for both `hourlyCsv` and `dailyCsv`:
  - **Headers:** the header ends with the five columns from [contracts/ui.md](contracts/ui.md), in order.
  - **A full row:** a part `{kwh: 2.104, cost: 1.9218, sampledMinutes: 60}` on a row with 3.412 kWh and cost 3.1166
    gives `2,104;1,92;1,308;1,19;60`. The rest is computed before rounding.
  - **No part:** five empty cells.
  - **Unknown cost:** the cost cells are empty and the kWh cells filled.
  - **Existing columns:** unchanged. Every existing assertion still passes.

### Implementation for User Story 4

- [x] T020 [US4] In `src/features/dashboard/exportCsv.ts`, append to both header arrays:
      `'Water heating (kWh)', 'Water heating cost (kr)', 'Everything else (kWh)', 'Everything else cost (kr)', 'Water heating sampled minutes'`.
  - Append the cells with a helper, `heaterCells(totalKwh, totalCost, part)`, that returns:
    - `number(part?.kwh, 3)`
    - `number(part?.cost, 2)`
    - `number(restOf(total, part?.kwh), 3)`, where the rest is `null` without a part
    - `number(restOf(totalCost, part?.cost), 2)`
    - `part ? String(part.sampledMinutes) : ''`
  - The existing `number()` already gives `''` for `null`.

**Checkpoint**: T019 passes, and an exported file opens with the new columns.

---

## Phase 7: Polish and checks

- [x] T021 Run `npm run build`, `npm run lint` and `npm test`, and `npx prettier --check` on the changed files. The
      test count is the T001 count plus the new tests, and no existing assertion changed (SC-002).
- [x] T022 Review the diff for the rules:
  - no `any` and no unjustified `as`
  - no server data in `useState`
  - no new request in the chart, the bill or the export (SC-005)
  - water heating text never rendered for a `null` part (FR-009)
- [x] T023 [P] Update `backlog.md` and the spec 010 status line, saying it is waiting for API spec 012 to be deployed
      for the manual checks.
- [ ] T024 Manual: [quickstart](quickstart.md) §2, steps 1–11, against the API with spec 012. Include the 375 px
      width and dark mode. If the bar colours are hard to tell apart, adjust `--water-heater` (T002) and check again.

---

## Dependencies and execution order

- **Phase 1 → Phase 2 → (US1 ∥ US2 ∥ US3 ∥ US4) → Phase 7.**
- **Phase 2:** T003 first. Then T004 and T005 (both need T003). T006 and T007 can run alongside T004 and T005.
- **US1:** T008 and T009 first (they fail until done), then T010, then T011.
- **US2:** T012 and T013, then T014, then T015.
- **US3:** T016, then T017, then T018. It needs T006's `sumParts` and `shareOf`.
- **US4:** T019, then T020. It needs T006's `restOf`.
- **Shared files:**
  - `src/test/bills.ts` is touched by T005 and T012. Do T005 first.
  - `series.test.ts` and `exportCsv.test.ts` are touched by T005 and later by T008 and T019. Do T005 first.

## Parallel examples

```text
Phase 2 after T003:  T004 (api.ts)  ∥  T005 (fixtures)  ∥  T006 (waterHeater.ts)  ∥  T007 (waterHeater.test.ts)
Stories:             T010–T011 (chart)  ∥  T014–T015 (bill)  ∥  T017–T018 (Heater tab)  ∥  T020 (CSV)
```

## Implementation strategy

1. **MVP:** Phases 1–3, meaning the chart. It is the everyday view and answers the main question.
2. **Then US2:** the bill.
3. **Then US3 and US4:** the Heater tab and the CSV, in either order.
4. **Everything can be built and tested with MSW** before the API is deployed. The app shows nothing new until the
   API sends `waterHeater` (FR-001). Run T024 against the deployed API before merging.
5. **Commit and open a PR only when Roy asks.** Suggested commits, one per phase:
   - "Read the water heater part from cost figures"
   - "Show water heating in the usage chart"
   - "Show water heating on the bill"
   - "Show today's and this month's water heating on the Heater tab"
   - "Add water heating columns to the CSV export"
