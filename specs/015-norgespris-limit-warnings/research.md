# Research: Norgespris Limit Warnings for Every Location

The API side is fixed by API spec 018's contract (`no.sanddata.ams.api` →
`specs/018-norgespris-limit-status/contracts/endpoints.md`, merged 2026-11-22). This file settles how the app uses it.

## R1. One status request for every location

**Decision**: A new `getNorgesPrisStatus()` in `features/dashboard/api.ts` and `useNorgesPrisStatus()` in `hooks.ts`,
query key `['cost', 'norgespris-status']`, refreshed every 5 minutes. The banner reads it once for all locations.

**Rationale**: The endpoint answers every Norgespris location the caller can see, in the order of `GET /api/locations`,
so one request serves every location (FR-001). The key starts with `cost`, so the car checkbox's mutation, which
invalidates `['cost']` (spec 013), refreshes it at once when the owner changes whether the car counts. 5 minutes meets
SC-001.

**Alternatives considered**: one bill per location (heavy, and why spec 018 exists); refreshing every minute (the
figures move by an hour's kWh at most, so 5 minutes is enough).

## R2. Which locations, and their names

**Decision**: The banner gets the active locations from `AppLayout` (`useSelectedLocation().active`) and keeps only
status items whose `locationId` is among them, named from that list. Items for unknown ids are left out.

**Rationale**: The status has no names, and the list is already loaded. Matching against the active list also keeps
the warnings consistent with the location switcher.

## R3. One limit warning per location

**Decision**: The pure `limitWarning(item, now)` in a new `features/dashboard/norgesPris.ts` returns one of:

- `over` when `overLimit` (the API's `kwhSoFar ≥ limitKwh`)
- `approaching` when `kwhSoFar ≥ 0,9 × limitKwh`
- `projected` when `projectedKwh > limitKwh`
- `null` otherwise, and always when `limitKwh` is null.

`approaching` carries either the days until the limit (when projected over it) or the month's projected end (when not,
or without a projection, in which case neither is shown).

**Days until the limit**: the month's projected pace is `(projectedKwh − kwhSoFar) / daysLeft`, where `daysLeft` is
the time from now to `resetsAt` in days. The limit is reached after `(limitKwh − kwhSoFar) / pace` days. The text is
"today" when that moment is on today's Oslo date, "tomorrow" on the next, otherwise "in about N days", N rounded.

**Rationale**: The projection is the bill's, so the warning agrees with the expected bill (SC-003). Spreading it
evenly is what "at this pace" says; the bill's projection is itself built on the last 7 days.

**Spec 012's `norgesPrisWarning(bill)`** is removed with its tests: the `projected` case replaces it with the API's
figures (FR-004), and the banner no longer reads the bill. Its `NORGESPRIS_MARGIN_KWH` goes too.

## R4. Expensive hours tomorrow

**Decision**: The pure `expensiveHours(day, pricePerKwh)` in `norgesPris.ts`:

- threshold = `4 × pricePerKwh` (`EXPENSIVE_FACTOR = 4`); no warning when the price is null or ≤ 0
- an hour is expensive when `spotEnergyPricePerKwh ≥ threshold`; a null price is not expensive
- consecutive expensive hours become ranges `{ from, to }` in Oslo clock hours, `to` being the end hour ("07–09")
- returns the ranges and the highest price among them, or null when none.

The banner shows at most 3 ranges, then "and N more hours" (FR-006).

**Published**: tomorrow's prices count as published when any hour has a non-null `spotEnergyPricePerKwh`. Before that,
or on an older API without the field, there is no warning.

**Rationale**: `spotEnergyPricePerKwh` is the same for every pricing model, under or over the limit (contract), which
is the reason spec 018 adds it.

## R5. Reading tomorrow's prices only where needed

**Decision**: A new `useTomorrowPrices(locationIds)` with `useQueries`, one query per id, with the same key as
`useDayPrices(id, tomorrow)` (`['prices', tomorrowDate, id]`), so the Now page's cheapest-time card shares the cache
for the selected location. The ids are those whose limit warning is `over` or `projected`, or `approaching` with a
projection over the limit (FR-010). Tomorrow's date comes from the Oslo helpers, as in `CheapestTimeCard`.

**At midnight**: the banner's clock (`useNow(60_000)`) moves the date, so the key changes and yesterday's "tomorrow"
is no longer read (US3 scenario 4).

## R6. Following a warning for another location

**Decision**: Each Norgespris line is a `Link` to `/` whose `onClick` calls `select(locationId)` from
`useSelectedLocation`, passed in from `AppLayout`. The selected location's lines do the same; selecting it again is
harmless.

**Rationale**: The Now page shows the selected location's expected bill, so it has to switch first (US1 scenario 4).

## R7. The banner with several locations

**Decision**: `WarningBanner` becomes `WarningBanner({ location, locations, onSelect })`. It builds the selected
location's capacity and usage lines as before, then the limit lines (selected first, the rest by name), then the
expensive-hours lines in the same order. The region's label changes from "Warnings for {name}" to "Warnings", since
it may hold several locations; each line names its location.

**Wording**: see [contracts/ui.md](contracts/ui.md). Numbers use `nb-NO` formatting as the rest of the banner; the
reset date is "1 December" (day and English month, Oslo time) to match the app's English text.
