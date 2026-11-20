# Tasks: The EV Charger in the App

**Input**: Design documents from `/specs/013-ev-charger/`

**Prerequisites**:

- [plan.md](plan.md) and [spec.md](spec.md)
- [research.md](research.md), with decisions R1 to R11
- [data-model.md](data-model.md)
- [contracts/api.md](contracts/api.md), which gives the endpoints, functions, keys and errors
- [contracts/ui.md](contracts/ui.md), which gives the exact texts
- [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (VII) asks for them. They use Vitest, Testing Library and MSW, with a fresh
`QueryClient` per test (retries off). Tests are written first, and fail until their implementation task is done.

**Organization**:

- Phase 2 holds the types, the normalisation and the CSS token, which every story needs.
- Then one phase per story:
  - US1: admin connection (P1)
  - US2: Car tab (P1)
  - US3: the checkbox (P1)
  - US4: chart, bill and CSV (P2)
- US1 and US2 are independent. US3 builds on US2's page. US4 needs only Phase 2: it can be tested with MSW answers
  that have `included: true`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1–US4 from spec.md

## Facts from the code that the tasks rely on

- **`src/features/dashboard/api.ts`** normalises spec 012's water heater fields with `withWaterHeater(item)`
  (`waterHeater ?? null`), through `normaliseHourly` and `normaliseDaily`, and `getMonthlyBill(...).then(withWaterHeater)`.
  `getCurrentHourCost` is not normalised yet. `getDailyCostRange(locationId, fromDate, toDate)` exists.
- **`src/features/locations/api.ts`:** `getLocations()` returns `api.get<LocationSummary[]>('/api/locations')`
  unchanged. `LocationSummary` (`locations/types.ts`) has `role: 'Owner' | 'Viewer'` and an optional
  `hasWaterHeater?: boolean`.
- **Query keys:**
  - Usage periods are `['usage', id, period, from, to]` (`periodQuery` in `dashboard/hooks.ts`).
  - Costs are `['cost', …]`: `['cost','hourly-today',id]`, `['cost','daily',id]`, `['cost','bill',id,month]`,
    `['cost','current',id]`.
  - Locations are `['locations']`.
  - Hooks use `const ONE_MINUTE = 60_000`.
- **`src/features/dashboard/series.ts`:**
  - `UsageRow { key, kwh, nok, heaterKwh?, heaterNok?, sampledMinutes?, expectedMinutes? }`, and
    `heaterFields(part)`.
  - `rowsFromHourly(items, now)` and `rowsFromDaily(items, byMonth, now)`. The latter sums a month's days, and its
    heater parts with `sumParts`.
  - `buildUsageSeries(...)` makes `UsagePoint { key, label, current, previous, heater, rest, partly }` and
    `UsageSeries { …, hasHeater }`.
  - `restOf(total, heater)` in `waterHeater.ts` is `max(0, total − heater)`, and `null` if either is `null`.
- **`src/features/dashboard/UsageChart.tsx`:**
  - `const config = { current, previous, heater: { label: 'Water heating', color: 'var(--water-heater)' }, rest }`.
  - Rows map `point.heater` and `point.rest`. `split = series.hasHeater` decides the stacked bars and the areas.
  - Legend swatches use the class `bg-water-heater`.
  - The detail line shows "· Water heating … · Everything else …" only inside `shown.heater !== null`.
- **`src/index.css`:**
  - `--color-water-heater: var(--water-heater);` (line 21).
  - `--water-heater: oklch(0.68 0.16 45)` in light (line 108) and `oklch(0.75 0.13 45)` in dark (line 155).
- **`src/features/dashboard/BillView.tsx`:**
  - `WaterHeaterBillNote({ bill })` is at line 165. It is rendered in `BillView` (line 155) and in
    `ExpectedBillCard.tsx` (line 75).
  - `useAuth` comes from `'../auth/useAuth'` and gives `roles`.
- **`src/features/dashboard/exportCsv.ts`:**
  - `WATER_HEATER_HEADERS` and `heaterCells(...)` are appended last in `hourlyCsv` and `dailyCsv`.
  - `number(value, decimals)` gives '' for null.
- **`src/features/admin`:**
  - `api.ts` has `isNotFound`, `getWaterHeaterSettings` (404 → null), `connectWaterHeater` and `removeWaterHeater`
    (404 is fine).
  - `hooks.ts` has `useWaterHeaterSettings` and `useWaterHeaterActions`, which invalidate the admin key and
    `['locations']`.
  - `WaterHeaterSection.tsx`, `ConnectWaterHeaterDialog.tsx` and `RemoveWaterHeaterDialog.tsx` are the patterns to
    copy.
  - `AdminLocationDialog.tsx` line 114 renders `<WaterHeaterSection location={location} />`.
- **Layout:**
  - `src/components/TabBar.tsx` takes `{ hasMultipleLocations, hasWaterHeater }` and uses
    `grid-cols-4` / `grid-cols-3`.
  - `src/components/AppLayout.tsx` passes `selected?.hasWaterHeater === true`.
  - `src/app/routes.tsx` has `{ path: '/water-heater', element: <WaterHeaterPage /> }`.
- **UI primitives:** `src/components/ui/` has `checkbox.tsx`, `badge.tsx`, `dialog.tsx`, `card.tsx` and
  `skeleton.tsx`, but no `radio-group.tsx`. `package.json` has the `radix-ui` meta package.
- **`WaterHeaterPage.tsx`** is the pattern for the page: it handles loading, error, no location and no device.

---

## Phase 1: Setup

- [x] T001 [P] Add `src/components/ui/radio-group.tsx`, the shadcn RadioGroup built on `RadioGroup` from the existing
      `radix-ui` package (`import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'`). Export `RadioGroup` and
      `RadioGroupItem`. No new dependency.
- [x] T002 [P] Add the colour token in `src/index.css`:
  - `--color-ev-charger: var(--ev-charger);` next to line 21.
  - `--ev-charger: oklch(0.62 0.14 250)` in the light block, next to `--water-heater`.
  - `--ev-charger: oklch(0.72 0.12 250)` in the dark block.

  This gives a `bg-ev-charger` utility. Blue sets the car apart from the heater's orange and the usage colour in both
  themes.

  **Changed while implementing:** the usage colour is already blue (`--usage`, hue 262), so the car is violet instead:
  `oklch(0.6 0.18 305)` in light and `oklch(0.72 0.15 305)` in dark.

---

## Phase 2: Foundational (blocks all stories)

- [x] T003 Add the types to `src/features/dashboard/types.ts`, exactly as in data-model.md:
  - `EvChargerPart { kwh: number; estimated: boolean; included: boolean }`
  - `EvChargerDayPart extends EvChargerPart { hoursWithoutMeterReading: number }`
  - `EvChargerBillPart extends EvChargerDayPart { firstHour: string; lastHour: string }`
  - `EvChargerSession { start: string; end: string; kwh: number; estimated: boolean }`

  Add these fields:
  - `HourlyCostItem`: `totalKwh: number`, `evCharger: EvChargerPart | null`
  - `DailyCostItem`: `totalKwh: number`, `evCharger: EvChargerDayPart | null`
  - `CurrentHourCost`: `totalKwhSoFar: number`, `evCharger: EvChargerPart | null`
  - `MonthlyBill`: `totalKwh: number | null`, `evCharger: EvChargerBillPart | null`

  Comment the rule: "`consumptionKwh` and every cost stay the house's own; `totalKwh` adds the car only when
  `included`".

- [x] T004 Add to `LocationSummary` in `src/features/locations/types.ts`: `hasEvCharger: boolean` and
      `includeEvCharger: boolean`, with the doc comment "false when the API is older than spec 016".
- [x] T005 Write the normalisation tests first, in `src/features/dashboard/api.test.ts` (and
      `src/features/locations/api.test.ts` for locations), with MSW answers that lack the new fields:
  - an hourly item gives `totalKwh === consumptionKwh` and `evCharger === null`
  - a daily item the same
  - the bill gives `totalKwh === null` and `evCharger === null`
  - the current hour gives `totalKwhSoFar === consumptionKwhSoFar` and `evCharger === null`
  - a location gives `hasEvCharger === false` and `includeEvCharger === false`
  - with the fields present, they pass through unchanged.

  Depends on T003 and T004.

- [x] T006 Implement the normalisation in `src/features/dashboard/api.ts` (research R1):
  - Extend the raw types so `totalKwh`, `totalKwhSoFar` and `evCharger` are optional.
  - Add `withEvCharger(item)`, which returns `{ ...item, totalKwh: item.totalKwh ?? item.consumptionKwh, evCharger:
item.evCharger ?? null }`.
  - Apply it beside `withWaterHeater` in `normaliseHourly` and `normaliseDaily`.
  - For the bill, `totalKwh ?? null` and `evCharger ?? null`.
  - Normalise `getCurrentHourCost` (`totalKwhSoFar ?? consumptionKwhSoFar`, `evCharger ?? null`).
- [x] T007 Implement the location normalisation in `src/features/locations/api.ts`: `getLocations` maps each item to
      `{ ...item, hasEvCharger: item.hasEvCharger === true, includeEvCharger: item.includeEvCharger === true }`.
      Make both T005 suites pass, and fix any test fixtures in `src/test/` that build `LocationSummary` objects so
      they type-check.

**Checkpoint**: `npm test` and `npm run build` pass. The app behaves exactly as before.

---

## Phase 3: User Story 1 - An Admin connects a Zaptec charger (Priority: P1) 🎯 MVP

**Goal**: The admin location dialog shows the charger connection, with Connect/Replace (a list of the server's
chargers), Remove, and the API's errors.

**Independent Test**: As Admin, connect "Garasje" to Hjemme from the list. The section shows it. Remove it, and the
section says no charger is connected (quickstart §1).

### Tests for User Story 1

- [x] T008 [P] [US1] Write `src/features/admin/EvChargerSection.test.tsx`. Use MSW on
      `*/api/admin/locations/:id/ev-charger` (GET/PUT/DELETE) and `*/api/admin/ev-chargers`. Cover:
  - (a) 404 gives "No car charger connected" and a **Connect** button
  - (b) settings give "Garasje · Hjemme", "connected 18.11.2026", "counted with the house" or "not counted",
    **Replace** and **Remove**
  - (c) Connect opens the dialog with a radio for each charger ("Garasje · Hjemme"). Pick one, press **Connect
    charger**, and the PUT body is `{ chargerId }`; the dialog closes and the section shows the charger
  - (d) Save with nothing picked shows "Pick a charger", and no request is sent
  - (e) the list's 503 `{ errors: { generalErrors: ['The Zaptec sign-in is not set up on the server'] } }` shows that
    text in the dialog, with no radios
  - (f) a PUT 409 with "This charger is connected to another location" shows the message above the footer, and the
    dialog stays open
  - (g) Remove, then **Remove charger**, sends a DELETE, and the section shows "No car charger connected"
  - (h) an empty list shows "The server's Zaptec sign-in sees no chargers."
  - (i) Replace has the title "Replace the car charger at Hjemme" and the button **Replace charger**.

### Implementation for User Story 1

- [x] T009 [P] [US1] Add to `src/features/admin/types.ts`:
  - `ZaptecCharger { chargerId: string; name: string; installationId: string; installationName: string }`
  - `EvChargerSettings { locationId: string; chargerId: string; chargerName: string; installationId: string;
installationName: string; connectedAt: string; readUpTo: string | null; includeInTotals: boolean }`

  Add to `src/features/admin/schema.ts`: `evChargerSchema = z.object({ chargerId: z.string().min(1, 'Pick a
charger') })` and `type EvChargerFormValues`.

- [x] T010 [US1] Add to `src/features/admin/api.ts`:
  - `const evChargerPath = (id) => \`/api/admin/locations/${id}/ev-charger\``
  - `getZaptecChargers()`, which is `GET /api/admin/ev-chargers`
  - `getEvChargerSettings(id)`, where 404 gives `null`, as `getWaterHeaterSettings` does
  - `connectEvCharger(id, chargerId)`, a `PUT` with `{ chargerId }`
  - `removeEvCharger(id)`, where 404 is fine, as `removeWaterHeater` does.

  Depends on T009.

- [x] T011 [US1] Add to `src/features/admin/hooks.ts`:
  - `useEvChargerSettings(locationId)`, with key `['admin', 'ev-charger', locationId]`
  - `useZaptecChargers(enabled)`, with key `['admin', 'ev-chargers']`, `enabled` only while the dialog is open,
    `retry: false` and `staleTime: 0`
  - `useEvChargerActions(locationId)`, with `connect` and `remove` mutations. On success both invalidate
    `['admin', 'ev-charger', locationId]`, `['locations']` (the Car tab and the checkbox) and `['ev-charger']`.

  Depends on T010.

- [x] T012 [P] [US1] Create `src/features/admin/ConnectEvChargerDialog.tsx`, modelled on
      `ConnectWaterHeaterDialog.tsx`, with the props `{ locationName, isReplace, connect, isPending, onDone, onCancel }`.
  - It uses React Hook Form with `evChargerSchema`, and the list comes from `useZaptecChargers(true)`.
  - The list is a `RadioGroup` (T001) of "{name} · {installationName}".
  - Show a skeleton while loading, the API's `error.message` on an error, and the empty text from contracts/ui.md.
  - Show the server error above the footer.
  - The footer has **Cancel** and **Connect charger** / **Replace charger**. The body scrolls on phones (the
    dialog-layout rule).
  - Titles come from contracts/ui.md.

  Depends on T011.

- [x] T013 [P] [US1] Create `src/features/admin/RemoveEvChargerDialog.tsx`, modelled on `RemoveWaterHeaterDialog.tsx`.
      Its text: "Remove the car charger from {location}? Charging already read is kept, and the car is no longer
      counted with the house." The footer has **Cancel** and **Remove charger**, and it shows the error.
- [x] T014 [US1] Create `src/features/admin/EvChargerSection.tsx`, modelled on `WaterHeaterSection.tsx`, with the
      heading "Car charger".
  - **Not connected:** "No car charger connected" and **Connect**.
  - **Connected:**
    - "{chargerName} · {installationName}"
    - "connected {formatOsloDate(connectedAt)}"
    - "read up to {date time}" when `readUpTo`
    - "counted with the house" or "not counted"
    - **Replace** and **Remove**.
  - It opens T012 or T013, and calls `reset()` on close.

  Depends on T011, T012 and T013.

- [x] T015 [US1] Render `<EvChargerSection location={location} />` right after `<WaterHeaterSection …/>` in
      `src/features/admin/AdminLocationDialog.tsx`. Make T008 pass.

**Checkpoint**: US1 works end to end against MSW.

---

## Phase 4: User Story 2 - The Car tab shows what the car charged (Priority: P1)

**Goal**: A Car tab for locations with a charger shows kWh today and this month (month ≥ today), the hours without a
house reading, the 15-minute note, and the sessions of the last 30 days.

**Independent Test**: With MSW, a location with `hasEvCharger: true` shows the Car tab. The page shows today's and the
month's kWh and the sessions list (quickstart §2).

### Tests for User Story 2

- [x] T016 [P] [US2] Write `src/features/dashboard/evCharger.test.ts` (pure, `today` passed in). Cover:
  - `carMonth(items, today)`:
    - (a) parts on the 3rd (2 kWh) and today (5 kWh) give `today 5`, `month 7`, and `since` = the 3rd's date
    - (b) a part on the 1st gives `since` null
    - (c) no parts give `today` and `month` both `null`, never 0
    - (d) no part today but some this month gives `today` null and `month` set
    - (e) `hoursWithoutReading` sums `hoursWithoutMeterReading`
    - (f) `month ≥ today` for any input
  - `sessionTimes(session)`:
    - the same day gives `{ date: 'Thu 20.11', from: '17:02', to: '21:40' }`
    - over midnight, `to` carries its date ("21.11 02:30")
    - the times are in Oslo time over the October clock change
  - `formatDuration`: 45 gives "45 min", 278 gives "4 h 38 min", 720 gives "12 h".
- [x] T017 [P] [US2] Write `src/features/dashboard/EvChargerPage.test.tsx`, with MSW on `*/api/locations`,
      `*/api/electricity-cost/daily` and `*/api/locations/:id/ev-charger/sessions`. Cover:
  - (a) the "Today" and "This month" rows ("5 kWh", "7 kWh", "since …"), with no "kr" anywhere
  - (b) no parts give "No charging yet" twice
  - (c) `hoursWithoutMeterReading: 3` gives the text from contracts/ui.md, and 0 gives no such text
  - (d) the note "A charge in progress shows here about 15 minutes after it ends."
  - (e) sessions, newest first, with date, times, kWh and duration, and an "estimated" badge only on the estimated
    one
  - (f) no sessions give "No completed charging sessions in the last 30 days."
  - (g) `hasEvCharger: false` gives "No car charger is connected at Hjemme…", and no daily or session request is sent
  - (h) an error in one card shows its message, and the other card still renders.
- [x] T018 [P] [US2] Extend `src/components/TabBar.test.tsx` (create it if it doesn't exist) and
      `src/components/AppLayout.test.tsx`:
  - a Car link to `/ev-charger` only when `hasEvCharger`
  - order Now, History, Heater, Car, Location
  - five tabs give `grid-cols-5`
  - `AppLayout` passes `selected.hasEvCharger`.

### Implementation for User Story 2

- [x] T019 [P] [US2] Create `src/features/dashboard/evCharger.ts` with:
  - `carMonth(items: DailyCostItem[], today: string)`, returning `{ today: number | null; month: number | null; since:
string | null; hoursWithoutReading: number }` (data-model.md)
  - `sessionTimes(session: EvChargerSession)`, returning `{ date, from, to }` (Oslo time, through the `Intl`
    formatters with `timeZone: 'Europe/Oslo'` as in `format.ts`), and `durationMinutes`
  - `formatDuration(minutes)`.

  Make T016 pass.

- [x] T020 [US2] Add to `src/features/dashboard/api.ts`: `getEvChargerSessions(locationId)`, which is
      `GET /api/locations/${id}/ev-charger/sessions` with no range (the API's 30 days) and returns
      `{ items: EvChargerSession[] }`.
      Add to `src/features/dashboard/hooks.ts`:
  - `useCarMonth(locationId)`:
    - key `['ev-charger', 'month', id, osloMonth(now)]`
    - fetches `getDailyCostRange(id, `${month}-01`, osloToday())`
    - `refetchInterval: 15 * ONE_MINUTE`
    - `enabled: !!locationId`
  - `useEvChargerSessions(locationId)`: key `['ev-charger', 'sessions', id]`, refreshed every 15 minutes, and
    `enabled`.
- [x] T021 [US2] Create `src/features/dashboard/EvChargerPage.tsx`, modelled on `WaterHeaterPage.tsx` (loading,
      error, no location, and redirect to setup).
  - When `!selected.hasEvCharger`, show the no-charger text from contracts/ui.md and make no requests.
  - Otherwise render two cards:
    - **"Charging":** the Today and This month rows from `carMonth`, the hours-without-reading line when it is above
      0, and the 15-minute note. Leave a slot at the top for US3's checkbox.
    - **"Sessions, last 30 days":** the list, with `Badge` "estimated", in the format from contracts/ui.md.
  - kWh use `formatKwh`.
  - Export `EvChargerPage` from `src/features/dashboard/index.ts`. Make T017 pass.
- [x] T022 [US2] Wire the tab:
  - **`src/components/TabBar.tsx`:**
    - Add the prop `hasEvCharger = false` and a `CarIcon` "Car" `NavLink` to `/ev-charger` after Heater.
    - Count the tabs and use a static class map `{3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5'}`, so
      Tailwind sees the classes.
    - Update the doc comment.
  - **`src/components/AppLayout.tsx`:** pass `hasEvCharger={selected?.hasEvCharger === true}`.
  - **`src/app/routes.tsx`:** add `{ path: '/ev-charger', element: <EvChargerPage /> }` next to `/water-heater`.

  Make T018 pass.

**Checkpoint**: US2 works on its own. The Car tab reads correctly with the checkbox in either state.

---

## Phase 5: User Story 3 - Count the car with the house (Priority: P1)

**Goal**: The checkbox at the top of the Car tab saves the setting, is read-only for viewers, goes back on failure,
and refetches every usage figure on success.

**Independent Test**: As owner, tick it. The PUT is sent and the usage queries refetch. As a viewer it is disabled
(quickstart §3).

### Tests for User Story 3

- [x] T023 [US3] Extend `src/features/dashboard/EvChargerPage.test.tsx`. Cover:
  - (a) an owner with `includeEvCharger: false` sees the unchecked checkbox "Count the car charger with the house"
    and the line "In kWh only. Costs and the bill stay the house's own."
  - (b) clicking sends `PUT */api/locations/:id/ev-charger/include` with `{ include: true }`. The checkbox reads as
    checked while the request is pending, and `/api/locations` is fetched again afterwards (count the MSW calls).
  - (c) a 400 with a message makes the checkbox read as unchecked again, and shows the message
  - (d) a viewer (`role: 'Viewer'`) sees a disabled checkbox and "Only the owner can change this.", and no PUT is
    possible
  - (e) an Admin who is a viewer of the location can change it (the `AuthContext` has the roles `['Admin']`).

### Implementation for User Story 3

- [x] T024 [US3] Add `setEvChargerInclude(locationId, include)` to `src/features/dashboard/api.ts`. It is a `PUT
/api/locations/${id}/ev-charger/include` with `{ include }`, and returns `{ locationId, includeInTotals }`.
      Add `useEvChargerInclude(locationId)` to `src/features/dashboard/hooks.ts`, a mutation whose `onSuccess`
      invalidates `['locations']`, `['usage']`, `['cost']` and `['ev-charger']` (research R6).
- [x] T025 [US3] Add an `IncludeCarCheckbox({ location })` at the top of the "Charging" card in
      `src/features/dashboard/EvChargerPage.tsx`, using `@/components/ui/checkbox` and a `Label`.
  - **Checked:** `mutation.isPending ? mutation.variables : location.includeEvCharger`.
  - **Enabled:** `location.role === 'Owner' || roles.includes('Admin')` (`useAuth`), and not pending.
  - **Viewer:** the note "Only the owner can change this."
  - **Error:** `mutation.error.message` in `text-destructive`.

  Do not copy the server value into state (Constitution III). Make T023 pass.

**Checkpoint**: US2 and US3 work together, and the setting is saved.

---

## Phase 6: User Story 4 - The car in the usage chart, the bill and the CSV (Priority: P2)

**Goal**: With the car included, the kWh chart draws a "Car charging" part on top. In kr it does not, and with the
checkbox off nothing changes. The bill gets a car note, and the CSV gets two columns.

**Independent Test**: MSW answers with `included: true` give a car part and its legend entry in kWh, none in kr.
With `included: false` the chart is as before (quickstart §3–4).

### Tests for User Story 4

- [x] T026 [P] [US4] Extend `src/features/dashboard/series.test.ts`. Cover:
  - (a) `rowsFromHourly` takes `kwh` from `totalKwh` (house 1 + car 3 gives 4), and `nok` stays the house's cost
  - (b) `carKwh` is `3` with `included: true`, and `null` with `included: false`, where `kwh === consumptionKwh`
  - (c) `rowsFromDaily` with `byMonth` sums the days' `carKwh`, and gives `null` when none has one
  - (d) `buildUsageSeries` in kWh gives `car: 3`, and in kr `car: null`
  - (e) `rest = current − heater − car`, never below 0, and equal to `current` when both are `null`
  - (f) `hasCar` is true or false as expected
  - (g) the previous period's value is `totalKwh`, on the same basis.
- [x] T027 [P] [US4] Extend `src/features/dashboard/UsageChart.test.tsx`. Cover:
  - (a) with a car part in kWh, the legend has "Car charging", and selecting the hour shows "· Car charging 3 kWh"
    and "· Everything else …", even without a heater part
  - (b) in kr there is no "Car charging"
  - (c) with `included: false` there is no legend entry and no detail text, and the values equal `consumptionKwh`.
- [x] T028 [P] [US4] Extend the bill tests (`src/features/dashboard/BillCard.test.tsx` or the `BillView` tests).
      Cover:
  - an Estimate with `evCharger { kwh: 212.7, included: true, firstHour: the 1st }` gives "Car charging so far this
    month: 212,7 kWh · counted with the house"
  - a Final month, with `included: false`, gives "Car charging in October 2026: … · not counted with the house"
  - `firstHour` after the 1st gives "since 18.11.2026"
  - no part gives no text
  - the bill's amounts are the same with and without the part.
- [x] T029 [P] [US4] Extend `src/features/dashboard/exportCsv.test.ts`:
  - The two last headers are "Car charging (kWh)" and "Car counted with the house".
  - A row with a part gives `3,200` and `Yes`, or `No`.
  - A row without one gives two empty cells.
  - The earlier columns are unchanged.

### Implementation for User Story 4

- [x] T030 [US4] Implement in `src/features/dashboard/series.ts` (research R2/R3):
  - **`UsageRow`:** add `carKwh?: number | null`.
  - **`rowsFromHourly` and `rowsFromDaily`:** use `kwh: item.totalKwh`, and
    `carKwh: item.evCharger?.included ? item.evCharger.kwh : null`. The `byMonth` path sums the non-null `carKwh`
    values (null when none).
  - **`UsagePoint`:** add `car: number | null`. It is `row.carKwh` when `unit === 'kwh'` and the slot has a value,
    otherwise `null`.
  - **`rest`:** `heater === null && car === null ? value : restOf(value, (heater ?? 0) + (car ?? 0))`.
  - **`UsageSeries`:** add `hasCar`.

  Make T026 pass.

- [x] T031 [US4] Implement in `src/features/dashboard/UsageChart.tsx`:
  - **Config:** add `car: { label: 'Car charging', color: 'var(--ev-charger)' }` to `config`, and map `car:
point.car` into the rows.
  - **Split:** `split = series.hasHeater || series.hasCar`.
  - **Bars and areas:** stack `rest`, then `heater` when `hasHeater`, then `car` when `hasCar`, on top.
  - **Legend:** a "Car charging" swatch with the class `bg-ev-charger` when `hasCar`.
  - **Detail line:**
    - Show "· Car charging {format}" when `shown.car !== null`, before water heating.
    - Show "· Everything else …" whenever `shown.heater !== null || shown.car !== null`.
    - Keep "(partly measured)" with the heater.

  Make T027 pass.

- [x] T032 [P] [US4] Add `EvChargerBillNote({ bill })` to `src/features/dashboard/BillView.tsx`, beside
      `WaterHeaterBillNote`, with the same period logic: `firstHour` against the month's start, and Estimate against
      Final.
  - Its text comes from contracts/ui.md, with "counted with the house" or "not counted with the house" from
    `included`.
  - Render it after `<WaterHeaterBillNote …/>` in `BillView.tsx` and in `ExpectedBillCard.tsx`.

  Make T028 pass.

- [x] T033 [P] [US4] Implement in `src/features/dashboard/exportCsv.ts`:
  - Add `EV_CHARGER_HEADERS = ['Car charging (kWh)', 'Car counted with the house']`.
  - Add `carCells(part)`, which returns `['', '']` without a part, otherwise `[number(part.kwh, 3), part.included ?
'Yes' : 'No']`.
  - Append both after the heater columns in `hourlyCsv` and `dailyCsv`. Keep `Usage (kWh)` as `consumptionKwh` (the
    house), so the existing columns do not change meaning.

  Make T029 pass.

**Checkpoint**: All four stories work. With the checkbox off, every existing test still passes unchanged.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T034 [P] Add the house-only guards (FR-021, research R11) in `src/features/dashboard/usual.test.ts` (the usual-power rule behind the usage warning) and
      `src/features/dashboard/standby.test.ts`. Hourly items with `totalKwh` greater than `consumptionKwh` (car
      included) give the same warnings and standby as without the car.
- [ ] T035 [P] Check at 375 px and in dark mode with a location that has both a heater and a charger (SC-007):
  - The five tab labels don't wrap or overflow.
  - The car colour reads in both themes.

  Adjust `--ev-charger` or the tab padding in `src/index.css` / `src/components/TabBar.tsx` if needed.

- [x] T036 Run `npm test`, `npm run build` and `npm run lint`. Run `npm run format` on the changed files.
- [ ] T037 Walk through quickstart.md §1–6 against the deployed API. Then, in the API repo, remove
      `specs/_backlog/ev-charger-frontend.md`, as its note asks (a separate PR there).

---

## Dependencies & Execution Order

- **Setup (T001–T002)** has no dependencies. T001 is needed only by US1 (T012), and T002 only by US4 (T031).
- **Foundational (T003–T007)** blocks every story. T005 runs after T003 and T004, and T006 and T007 make it pass.
- **US1 (T008–T015):** after Phase 2. It is independent of US2–US4.
- **US2 (T016–T022):** after Phase 2. It is independent of US1.
- **US3 (T023–T025):** after US2, since it adds to `EvChargerPage.tsx`.
- **US4 (T026–T033):** after Phase 2. It is independent of US1–US3, because the tests set `included` in MSW answers.
- **Polish (T034–T037):** after all stories.

Within each story, the tests come before the implementation. Types and API come before hooks, hooks before
components, and components before wiring.

## Parallel Examples

- **Setup:** T001 ∥ T002.
- **After Phase 2:** US1, US2 and US4 can proceed in parallel. US2 and US3 change `dashboard/api.ts` and
  `hooks.ts`; US1 and US4 do not.
- **US1:** T008 ∥ T009. After T011, T012 ∥ T013.
- **US2:** T016 ∥ T017 ∥ T018, then T019.
- **US4:** T026 ∥ T027 ∥ T028 ∥ T029. T032 ∥ T033 alongside T030 → T031.

## Implementation Strategy

1. **MVP:** Phase 1–2, then US1. An Admin can connect a charger, and the API starts reading its sessions.
2. **Car figures:** US2, then the Car tab shows charging, with the house figures unchanged.
3. **The feature Roy asked for:** US3 (the checkbox) and US4 (the car in the charts, the bill and the CSV).
4. **Polish:** guards, the visual check at 375 px, and the walkthrough against the real API.

Each checkpoint leaves `main` releasable. With the checkbox off, which is the default, the app looks as before.
