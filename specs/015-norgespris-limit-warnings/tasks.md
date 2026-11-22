# Tasks: Norgespris Limit Warnings for Every Location

**Input**: Design documents from `/specs/015-norgespris-limit-warnings/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R7
- [data-model.md](data-model.md)
- [contracts/ui.md](contracts/ui.md), which gives the exact texts and their order
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) asks for them. They use Vitest, Testing Library and MSW, with a fresh
`QueryClient` per test. The rules in `norgesPris.ts` are pure and take `now`, so no fake timers are needed there.

**Organization**:

- Phase 2 adds the types, the request, the hook and the test fixtures, which every story needs. It also gives the
  banner its new props, so US1–US4 only add lines.
- US1 (over) and US2 (approaching, projected) are both P1 and share `limitWarning`. US1 comes first: it is the MVP.
- US3 adds the expensive hours (P2), US4 the order across locations and the failure case (P2).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md

## Facts from the code that the tasks rely on

- **`src/features/dashboard/WarningBanner.tsx`**:
  - `WarningBanner({ location }: { location: LocationSummary })` builds `lines: Line[]` (`{ key, urgent, content }`)
    and renders each as a `<Link to="/">` with `data-urgent="true"` when urgent.
  - It reads `useMonthlyBill(id, osloMonth(now), true)` only for `norgesPrisWarning(bill.data)`.
  - The clock is `useNow(60_000)`. `monthKwh(kwh)` formats whole kWh with `nb-NO` grouping.
  - The region's label is `` `Warnings for ${location.name}` ``.
- **`src/features/dashboard/warnings.ts`** ends with `NorgesPrisWarning`, `quantityOf`, `norgesPrisWarning(bill)`, and
  defines `NORGESPRIS_MARGIN_KWH`. `BillLine` and `MonthlyBill` are imported only for it.
  `src/features/dashboard/warnings.test.ts` line 175 has `describe('norgesPrisWarning')`.
- **`src/features/dashboard/hooks.ts`**:
  - `useDayPrices(locationId, date?)` has key `['prices', date ?? 'today', locationId]`, calls
    `getDayPrices(locationId, date)` and refreshes every 15 minutes.
  - `ONE_MINUTE = 60_000`. `useQueries` is already imported.
- **`src/features/dashboard/CheapestTimeCard.tsx`** line 48: tomorrow is
  `addDays(lastOsloDays(new Date(), 1)[0], 1)` (`addDays` from `./periods`, `lastOsloDays` from `./format`).
  `osloToday(now)` in `format.ts` gives the same Oslo date.
- **`src/features/dashboard/types.ts`** line 174: `HourPrice { hourStart; ratePerKwh; spotRatePerKwh }`.
- **`src/features/locations/selectedLocation.ts`**: `useSelectedLocation()` returns `active`, `selected` and
  `select(id)`.
- **`src/components/AppLayout.tsx`** renders `{selected && <WarningBanner location={selected} />}`.
- **`src/test/warnings.ts`**: `WarningFigures`, `warningHandlers(figures)`, `WARNING_NOW` (Friday 20 November 2026,
  11:30 Oslo), `billWith`, `NORGESPRIS_DUE` and `ALL_DUE`. It is used by `WarningBanner.test.tsx` and
  `src/components/AppLayout.test.tsx`.
- **`WarningBanner.test.tsx`**: `hjemme` (`l1`), `renderBanner(figures)`, `region()`, and the describes "Norgespris
  limit" (line 128), "together" (line 157) and "and the Now cards" (line 193, counts the bill request).

---

## Phase 1: Setup

None. No new dependencies.

---

## Phase 2: Foundational (blocks every story)

- [x] T001 Add the types to `src/features/dashboard/types.ts`, as in data-model.md:
  - `NorgesPrisStatusItem { locationId: string; month: string; limitKwh: number | null; kwhSoFar: number;
projectedKwh: number | null; overLimit: boolean; overLimitKwh: number; norgesPrisPricePerKwh: number | null;
resetsAt: string }`, with the comments "yyyy-MM, Oslo month", "null: no limit set; never over", "the car's kWh
    included when it is counted with the house", "null without a projection", "incl. VAT, no grid charge, taxes or
    markup" and "UTC ISO, 00:00 Oslo on the 1st of next month".
  - `NorgesPrisStatus { asOf: string; items: NorgesPrisStatusItem[] }`.
  - `HourPrice.spotEnergyPricePerKwh?: number | null`, commented "spot energy incl. VAT only; the same under or over
    the limit. Absent from an API without spec 018: treated as null."
- [x] T002 Write the test first, in `src/features/dashboard/api.test.ts`: a `describe('getNorgesPrisStatus (spec 015)')`
      where MSW answers `*/api/electricity-cost/norgespris-status` with one item, and the function returns it.
- [x] T003 Add `getNorgesPrisStatus()` to `src/features/dashboard/api.ts`:
      `api.get<NorgesPrisStatus>('/api/electricity-cost/norgespris-status')`.
- [x] T004 Add `useNorgesPrisStatus()` to `src/features/dashboard/hooks.ts`: key `['cost', 'norgespris-status']`,
      `refetchInterval: 5 * ONE_MINUTE`, with a comment that the `cost` prefix lets the car checkbox's invalidation refresh
      it (research R1).
- [x] T005 Extend `src/test/warnings.ts`:
  - `WarningFigures.status?: NorgesPrisStatusItem[] | 'fail'` (default `[]`), served by `warningHandlers` at
    `*/api/electricity-cost/norgespris-status` as `{ asOf: WARNING_NOW, items }`.
  - `WarningFigures.prices?: Record<string, HourPrice[]>` keyed by location id, served at
    `*/api/electricity-cost/prices` for `date=2026-11-21` (tomorrow at `WARNING_NOW`); other dates and ids answer an
    empty day.
  - `statusItem(overrides)` with the cabin's defaults: `locationId: 'l2'`, `month: '2026-11'`, `limitKwh: 1000`,
    `kwhSoFar: 600`, `projectedKwh: 900`, `overLimit: false`, `overLimitKwh: 0`, `norgesPrisPricePerKwh: 0.5`,
    `resetsAt: '2026-11-30T23:00:00Z'`.
  - Replace `NORGESPRIS_DUE` with a status that is `projected` (600 kWh, projected 1 240), and drop `billWith` if
    nothing else uses it.
- [x] T006 Give the banner its new props in `src/features/dashboard/WarningBanner.tsx` and
      `src/components/AppLayout.tsx` (research R6, R7):
  - `WarningBanner({ location, locations, onSelect }: { location: LocationSummary; locations: LocationSummary[];
onSelect: (id: string) => void })`.
  - `Line` gains an optional `locationId`; its `Link`'s `onClick` calls `onSelect(line.locationId)` when set.
  - The region's label becomes "Warnings".
  - `AppLayout` passes `locations={active}` and `onSelect={select}`.
  - Update `renderBanner` and `region()` in `WarningBanner.test.tsx`, and the render in
    `src/components/AppLayout.test.tsx` where needed, so spec 012's capacity and usage tests pass unchanged.

**Checkpoint**: `npm test` passes; the banner looks as before.

---

## Phase 3: User Story 1 - See that a location is over its limit (P1) 🎯 MVP

**Goal**: The cabin's urgent over-the-limit line shows on every page, whichever location is selected.

**Independent test**: Hjemme selected, cabin at 1 084 of 1 000 kWh: the banner shows the cabin's urgent line with the
reset date, no close button, and following it selects the cabin.

- [x] T007 [P] [US1] Write tests first in the new `src/features/dashboard/norgesPris.test.ts`, `describe('limitWarning')`:
  - `overLimit: true` at 1 000 and at 1 084 of 1 000 kWh gives `{ kind: 'over', kwhSoFar, limitKwh, resetsAt }`.
  - `limitKwh: null` gives null, even with `overLimit: true`.
- [x] T008 [US1] Create `src/features/dashboard/norgesPris.ts` with the `LimitWarning` union from data-model.md
      (`over | approaching | projected`), `APPROACHING_SHARE = 0.9`, and `limitWarning(item: NorgesPrisStatusItem, now:
Date): LimitWarning | null`, returning null when `limitKwh` is null and `over` when `item.overLimit` (research R3).
      Comment each constant as `warnings.ts` does.
- [x] T009 [US1] In `src/features/dashboard/WarningBanner.tsx`: read `useNorgesPrisStatus()`, keep the items whose
      `locationId` is in `locations` (research R2), and push an urgent line per `over` warning with `locationId` set:
      **"{name} is over its Norgespris limit: {kwhSoFar} of {limit}."** "The kWh above it are priced at spot price until
      {date}." `{date}` is the Oslo day and English month of `resetsAt` ("1 December"), via a small
      `Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', timeZone: 'Europe/Oslo' })`. kWh via `monthKwh`.
- [x] T010 [US1] Tests in `src/features/dashboard/WarningBanner.test.tsx`, replacing `describe('WarningBanner Norgespris
limit')`, with a `cabin` location (`l2`) next to `hjemme` and Hjemme selected:
  - the cabin's over line, with `data-urgent="true"`, exact text from contracts/ui.md
  - no button in the region
  - clicking the line calls `onSelect('l2')`
  - an item for an id not in `locations` gives no line.
- [x] T011 [US1] In `src/components/AppLayout.test.tsx`, a test that the cabin's over line shows while Hjemme is
      selected, on a route other than `/`.

**Checkpoint**: US1 works on its own.

---

## Phase 4: User Story 2 - Approaching and projected (P1)

**Goal**: From 90 % the banner says how close the location is and how long it has; below 90 % and projected over, spec
012's wording stays.

**Independent test**: the four cabin cases from spec.md US2.

- [x] T012 [P] [US2] Tests in `src/features/dashboard/norgesPris.test.ts`, `describe('limitWarning')`, `now` =
      `2026-11-22T11:00:00Z`, `resetsAt` = `2026-11-30T23:00:00Z`:
  - 900 of 1 000 (exactly 90 %) is `approaching`; 899,9 is not.
  - 912, projected 1 240: `reachedIn` is a whole number of days, from `(1240 − 912) / daysLeft` per day and
    `(1000 − 912) / pace` days, rounded (research R3).
  - `reachedIn` `'today'` when the moment falls on today's Oslo date, `'tomorrow'` on the next.
  - 912, projected 980: `reachedIn: null`, `projectedKwh: 980`.
  - 912, no projection: `reachedIn: null`, `projectedKwh: null`.
  - 600, projected 1 240: `projected`. 600, projected 900 or null: null.
  - over takes precedence over approaching, approaching over projected (FR-005).
- [x] T013 [US2] Extend `limitWarning` in `src/features/dashboard/norgesPris.ts`: `approaching` when `kwhSoFar ≥
APPROACHING_SHARE × limitKwh`, `projected` when `projectedKwh > limitKwh`, with `reachedIn` as in research R3 and
      data-model.md (`'today' | 'tomorrow' | number (≥ 2) | null`), comparing Oslo dates with `osloToday`.
- [x] T014 [US2] Add the approaching and projected lines in `src/features/dashboard/WarningBanner.tsx`, not urgent,
      with `locationId`, exactly as contracts/ui.md:
  - "{name}: {kwhSoFar} of {limit} this month. At this pace the limit is reached in about {n} days." / "… reached
    tomorrow." / "… reached today."
  - "{name}: {kwhSoFar} of {limit} this month, expected to end at {projected}."
  - "{name}: {kwhSoFar} of {limit} this month."
  - "{name} is expected to use {projected} this month, above the Norgespris limit of {limit}. The kWh above it are
    priced at spot price."
- [x] T015 [US2] Remove spec 012's rule: `norgesPrisWarning`, `NorgesPrisWarning`, `quantityOf` and
      `NORGESPRIS_MARGIN_KWH` from `src/features/dashboard/warnings.ts`, the unused `BillLine`/`MonthlyBill` imports, its
      describe in `warnings.test.ts`, and `useMonthlyBill` from `WarningBanner.tsx`. In the "and the Now cards" test, stop
      expecting the bill request from the banner (the `ExpectedBillCard` still makes one).
- [x] T016 [US2] Banner tests in `src/features/dashboard/WarningBanner.test.tsx` for each approaching text and the
      projected text, none urgent.

**Checkpoint**: US1 and US2 work; spec 012's bill-based warning is gone.

---

## Phase 5: User Story 3 - Tomorrow's expensive hours (P2)

**Goal**: For a location over or projected over its limit, the banner lists tomorrow's hours at ≥ 4 × its Norgespris
price.

**Independent test**: the cabin over its limit at 0,50 kr, tomorrow's hours 07, 08, 17, 18, 19 at ≥ 2,00 kr: "07–09
and 17–20, up to …". No line without such hours, nor for Hjemme within its limit, which also gets no prices request.

- [x] T017 [P] [US3] Tests in `src/features/dashboard/norgesPris.test.ts`:
  - `describe('expensiveHours')`: threshold equal counts (2,00 at 0,50); consecutive hours make one range; a range to
    midnight ends at 24; null and negative prices aren't expensive; a null or zero Norgespris price gives null; a day
    with no `spotEnergyPricePerKwh` at all (unpublished, or the field absent) gives null; `hours` and `maxPrice`; the
    23-hour (`2027-03-28`) and 25-hour (`2026-10-25`) days read in Oslo clock hours.
  - `describe('needsTomorrow')`: true for `over`, `projected`, and `approaching` with `projectedKwh > limitKwh`; false
    for other `approaching` and null.
- [x] T018 [US3] Add to `src/features/dashboard/norgesPris.ts`: `EXPENSIVE_FACTOR = 4`, the `ExpensiveHours` type
      (`ranges: { fromHour: number; toHour: number }[]`, `hours: number`, `maxPrice: number`), `expensiveHours(day:
DayPrices | undefined, pricePerKwh: number | null): ExpensiveHours | null` (research R4; Oslo hour from
      `hourStart` with `Intl.DateTimeFormat` in `Europe/Oslo`, a range's `toHour` being the last hour + 1), and
      `needsTomorrow(warning: LimitWarning | null): boolean`.
- [x] T019 [US3] Add `useTomorrowPrices(locationIds: string[], now: number)` to `src/features/dashboard/hooks.ts` with
      `useQueries`, one query per id, key `['prices', tomorrow, id]` where `tomorrow = addDays(osloToday(new Date(now)),
1)`, `queryFn: () => getDayPrices(id, tomorrow)`, refreshed every 15 minutes, so it shares `useDayPrices`'s cache
      (research R5). Return a `Record<string, DayPrices | undefined>` or the query array, whichever reads cleaner.
- [x] T020 [US3] In `src/features/dashboard/WarningBanner.tsx`, call `useTomorrowPrices` with the ids whose
      `needsTomorrow(limitWarning(...))` is true, and push a non-urgent line per location with `expensiveHours`:
      "{name}, tomorrow: spot price is high {ranges}, up to {price}." Ranges are `HH–HH`, joined ", " with " and " before
      the last; more than three: the first three, then "and {n} more hours", `n` being the hours not in those three.
      `{price}` via `formatKrPerKwh` (check it gives "2,60 kr/kWh"; otherwise a two-decimal `nb-NO` formatter).
- [x] T021 [US3] Banner tests in `src/features/dashboard/WarningBanner.test.tsx`: the 07–09 and 17–20 case; the > 3
      ranges case; no line without expensive hours; and, counting requests to `/api/electricity-cost/prices` with
      `locationId=l1`, none for Hjemme within its limit.

**Checkpoint**: US1–US3 work.

---

## Phase 6: User Story 4 - Calm with several locations (P2)

**Goal**: The order of contracts/ui.md, and nothing on failure.

**Independent test**: Hjemme selected with a capacity warning, the cabin over with expensive hours: capacity, then the
cabin's limit line, then its expensive hours.

- [x] T022 [US4] In `src/features/dashboard/WarningBanner.tsx`, order the Norgespris lines: limit lines for the
      selected location first, then the others by `name` (`localeCompare` with `'nb'`), then the expensive-hours lines in
      the same order (FR-008). Keys `limit-{id}` and `expensive-{id}`.
- [x] T023 [US4] Tests in `src/features/dashboard/WarningBanner.test.tsx`, replacing "together":
  - the order with capacity, usage, Hjemme approaching, the cabin over and the cabin's expensive hours
  - `status: 'fail'`: no Norgespris lines and no error text, the capacity line still there (FR-009)
  - a failing tomorrow's prices request: the limit line stays, no expensive-hours line
  - a single location reads as before, naming it.
- [x] T024 [US4] In `src/components/AppLayout.test.tsx`, check the warnings still come before the key reminder with
      the new region label "Warnings".

**Checkpoint**: all stories work.

---

## Phase 7: Polish

- [x] T025 Update the doc comments in `WarningBanner.tsx` and `AppLayout.tsx` from "the selected location's warnings"
      to spec 015's: capacity and usage for the selected location, Norgespris for every location.
- [x] T026 Run `npm test`, `npm run build` and `npm run lint`, and fix what they find; run Prettier on the changed files.
- [ ] T027 Manual checks from quickstart.md 1–7 against the API with spec 018 deployed, including 375 px in light and
      dark mode (SC-005). Tick them here when done.

---

## Dependencies

- Phase 2 blocks everything.
- US1 → US2 (both extend `limitWarning` and the same banner block; US2 also removes the old rule).
- US3 needs `limitWarning` (US1/US2) for `needsTomorrow`.
- US4 orders the lines from US1–US3.
- Polish last.

## Parallel opportunities

- T002 alongside T001; T007, T012 and T017 (the pure tests) can each be written alongside the banner work of the
  story before them, since `norgesPris.test.ts` is its own file.
- Within US3, T017/T018 (pure) and T019 (hook) touch different files.

## Implementation strategy

1. Phase 2, then US1: the cabin's over-the-limit line on every page is the MVP, and the case Roy has today.
2. US2 replaces spec 012's rule with the API's figures.
3. US3 and US4 finish the feature; then polish and the manual checks.
