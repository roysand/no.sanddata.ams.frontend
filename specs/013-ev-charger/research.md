# Research: The EV Charger in the App

Phase 0 of [plan.md](plan.md). The API contract is `no.sanddata.ams.api` →
`specs/016-zaptec-ev-charger/contracts/endpoints.md`; [contracts/api.md](contracts/api.md) lists what this app reads.

## R1. An older API without the charger fields

- **Decision**: `api.ts` normalises at the boundary, as spec 010 did for `waterHeater`:
  - `totalKwh ?? consumptionKwh` and `evCharger ?? null` for hourly items, daily items, the bill and the current hour
    (`totalKwhSoFar ?? consumptionKwhSoFar`).
  - `hasEvCharger` and `includeEvCharger` on a location are read as `=== true`.
  - So without the fields there is no Car tab, no checkbox, and every total equals the house's kWh (FR-022).
- **Rationale**: Constitution II puts API gaps in `api.ts`, and components never test for `undefined`.
- **Alternatives considered**: optional fields checked in each component. Rejected: it spreads the rule and is easy
  to miss in one place.

## R2. Which figure the usage chart draws

- **Decision**: `rowsFromHourly` and `rowsFromDaily` (`series.ts`) take `kwh` from `totalKwh`, not
  `consumptionKwh`. They add `carKwh`: `evCharger.kwh` when `evCharger.included`, otherwise `null`.
  - **Checkbox off:** the API sends `totalKwh = consumptionKwh` and `included: false`. So the chart is the house
    only, with no car part, exactly as today (FR-015), and the code has no separate path for it.
  - **The previous period** is built from the same rows, so it is on the same basis (FR-017). The API applies the
    setting when a request is answered, not when the data was stored.
  - **kr:** the `nok` value stays the house's cost, and `carKwh` is used in kWh only (FR-016).
  - **Year view:** months sum their days' `carKwh` like the heater part, with `null` when no day has one.
- **Rationale**: the API already worked out the total. The frontend never adds the car to the house itself, so it
  cannot disagree with the API.
- **Alternatives considered**: `consumptionKwh + evCharger.kwh` in the frontend. Rejected: it duplicates the API's
  rule.

## R3. The car beside water heating in a bar

- **Decision**: `UsagePoint` gains `car: number | null`. `rest` becomes `current − heater − car` (never below 0,
  through the existing `restOf`).
  - **Stack order**, from the bottom: water heating (as spec 010 drew it), everything else, car charging. The car is
    on top because it is the part that comes and goes with the checkbox. In the day view, where the total is a line,
    the car is a band just under the line.
  - **Colour:** a new CSS token `--ev-charger` (violet, hue 305), in light and dark, next to `--water-heater` in
    `index.css`.
  - **Legend:** "Car charging" is shown when any point has a car part (`hasCar`).
  - **Detail line:** "· Car charging 3,2 kWh", before "· Water heating …". There is never a "Car charging 0 kWh".
- **Rationale**: it keeps the spec 010 split as it is and adds one series. In kr `car` is always `null`, so the kr
  chart is unchanged.

## R4. Charging hours without a house reading (FR-018)

- **Facts**: the day's and the month's `evCharger.kwh` include those hours. The hourly list has no item for them,
  and `hoursWithoutMeterReading` counts them per day and on the bill.
- **Decision**:
  - The week, month and year views use daily rows, which include those hours.
  - The day view is built from hourly items, so the hours are missing there. The Car tab says, under "Today" and
    "This month": "n hours of charging had no house reading and are not in the hour-by-hour chart". It shows this only
    when the count is above 0.
  - The day view itself gets no note.
- **Spec change**: FR-018 and US4 scenario 5 now place the note on the Car tab instead of the chart's day view.
- **Rationale**: the day view loads hourly items only. Adding a daily request to every day view for a rare case
  costs more than it gives. The Car tab already loads the daily figures (R5).
- **Alternatives considered**: an extra daily request in the day view when the location includes the car. Rejected
  for the cost and the extra loading state.

## R5. Today and this month on the Car tab (FR-006)

- **Decision**: one request, `getDailyCostRange(id, monthStart, today)`, in `useCarMonth(locationId)`.
  - **Today** is today's item's `evCharger`.
  - **This month** is the sum of the items' `evCharger.kwh`.
  - **"Since"** is the first day with a part, when that day is not the 1st.
  - **Hours without a house reading:** the sum of `hoursWithoutMeterReading`.
  - The query key is `['ev-charger', 'month', id, month]`. It refreshes every 15 minutes (FR-010).
- **Rationale**:
  - Both figures come from the same response, so "This month" is never less than "Today" (SC-006). That is the
    lesson of PR #45, where the bill (finished hours only) and today's hours (with the running hour) disagreed.
  - The bill's `evCharger` would have the same gap.
- **Alternatives considered**: the bill's `evCharger` plus today's hours after its `lastHour`, as the Heater tab
  does. Rejected: the car has hours with no hourly item (R4), so that sum could miss them.

## R6. The checkbox (FR-011–FR-013)

- **Decision**:
  - **Hook:** `useEvChargerInclude(locationId)` in `features/dashboard/hooks.ts`, a mutation on
    `PUT /api/locations/{id}/ev-charger/include`.
  - **While saving**, the checkbox shows the value being saved (`mutation.variables`), not a copy in state
    (Constitution III).
  - **On error**, it falls back to the location's `includeEvCharger` and shows `ApiError.message` (FR-012).
  - **On success**, it invalidates `['locations']`, `['usage']` and `['cost']`. That refetches the charts, the bill and
    the Car tab without a reload (SC-003).
  - **Who can change it:** `role === 'Owner'`, or the user has the Admin role. A viewer gets a disabled checkbox and
    the note "Only the owner can change this". This is UX only; the API answers 403 (Constitution V).
- **Rationale**: the setting belongs to the location, and the Car tab is in the dashboard slice. The endpoint is under
  `/api/locations`, but the request is made only from the Car tab, so it lives in that slice's `api.ts`.

## R7. Sessions (FR-008)

- **Decision**: `useEvChargerSessions(locationId)` uses
  `GET /api/locations/{id}/ev-charger/sessions` with no range, which gives the API's default of the last 30 days.
  - The query key is `['ev-charger', 'sessions', id]`, refreshed every 15 minutes.
  - **Each row shows:** the Oslo date and "17:02–21:40", the duration ("4 h 38 min") and the kWh. Estimated sessions
    get an "estimated" badge.
  - **A session over midnight** shows the end date as well: "20.11 23:10 – 21.11 02:30".
- **Rationale**: the default range is the spec's 30 days, and the list is newest first from the API.

## R8. The Car tab and the tab bar (FR-005, SC-007)

- **Decision**:
  - **Route:** `/ev-charger`, rendering `EvChargerPage` in `features/dashboard`. It is modelled on `WaterHeaterPage`.
  - **Tab:** "Car", with lucide's `CarIcon`, shown when `selected.hasEvCharger`.
  - **Tab bar:** it takes the number of columns from the tabs it shows (3–5). At 375 px, five columns are 70 px each,
    which fits the 14 px icon-over-label design ("History" is the longest label).
  - **A location without a charger** that reaches `/ev-charger` by URL or by switching location sees "No car charger
    is connected at {name}". Whether there is a charger is known from `hasEvCharger`. Unlike the heater, there is no
    state request to tell.
- **Rationale**: it follows the Heater tab, which users already know.

## R9. Admin connection (FR-001–FR-004)

- **Decision**:
  - **Section:** `EvChargerSection` in `features/admin`, placed in `AdminLocationDialog` below `WaterHeaterSection`.
  - **Dialogs:** `ConnectEvChargerDialog` and `RemoveEvChargerDialog`. These follow the dialog layout rule: one footer
    with Cancel and a named save, the sub-form in its own dialog, and scrolling on phones.
  - **Connect:** a radio list of `GET /api/admin/ev-chargers` (charger name, installation name), loaded when the
    dialog opens. It uses a Zod schema `{ chargerId: string().min(1, 'Pick a charger') }`.
  - **Settings:** `GET /api/admin/locations/{id}/ev-charger`, where 404 means `null`, as for the heater.
  - **After connecting, replacing or removing:** invalidate `['admin', 'ev-charger', id]` and `['locations']`. The Car
    tab then appears or disappears, and the checkbox reads as off after a removal.
  - **Errors:**
    - The list's 502 and 503 show the API's message in the dialog, for example "The Zaptec sign-in is not set up on
      the server".
    - On save, `409 EvCharger.ChargerInUse` and `400` show the message above the footer.
- **Rationale**: the same shape as the water heater's admin flow, so the code and the UX match.

## R10. Bill and CSV (FR-019, FR-020)

- **Decision**:
  - **Bill:** an `EvChargerBillNote` below `WaterHeaterBillNote` in `BillView`, in the same small text: "Car
    charging so far this month: 212,7 kWh · counted with the house" (or "· not counted"). It says "since {date}" when
    `firstHour` is after the month's start, and adds to no sum.
  - **CSV:** two columns after the water heater ones, "Car charging (kWh)" and "Car counted with the house"
    (Yes/No). Both are empty when the row has no car part, so the existing columns keep their positions.
- **Rationale**: the same pattern as spec 010's heater note and CSV columns.

## R11. What stays house-only (FR-021)

- **Verified in code**: the capacity step, warnings, standby, heatmap, cheapest time and Norgespris read
  `consumptionKwh` or the capacity endpoint, never `totalKwh`. They are not changed.
  - The Now card shows no kWh, so the current hour's `totalKwhSoFar` is normalised but not shown.
- **Guard**: a test asserts that `rowsFromHourly` keeps `nok` as the house's cost with the car included. A test of
  the usual-power rule (warnings) asserts that it still uses `consumptionKwh` when `totalKwh` is larger.
