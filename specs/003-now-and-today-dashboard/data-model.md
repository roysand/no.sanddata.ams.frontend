# Data Model: Now and Today Dashboard

Client-side shapes. Existing API shapes (`CurrentHourCost`, `HourlyCostItem`, `DailyCostItem`, `Consumption`) are unchanged and defined in `src/features/dashboard/types.ts`.

## New API shape: `DayPrices` (from the new prices endpoint)

| Field | Type | Notes |
|-------|------|-------|
| `date` | string (yyyy-MM-dd) | Oslo calendar day |
| `zone` | string | Price zone of the location |
| `pricingModel` | `'Spot' \| 'NorgesPris'` | The location's enrolled model |
| `items` | `HourPrice[]` | One entry per real hour of the Oslo day (23, 24 or 25 on DST days) |

`HourPrice`: `hourStart` (UTC ISO string), `ratePerKwh` (number, NOK including the same adjustments as cost calculation) or `null` when the price is not published or the exchange rate is missing.

## Derived: `PriceDay`

| Field | Type | Rule |
|-------|------|------|
| `hours` | `{ hourStart, rate \| null, level \| null, isBest, isPast, isCurrent }[]` | Built from `DayPrices` and the current time |
| `cheapMax` / `expensiveMin` | number | Rate thresholds at the lower and upper third of rated hours |
| `best` | number[] | Indexes of up to 4 lowest rated hours, none if all rates are equal |

`level`: `'cheap' | 'normal' | 'expensive' | null` (null when there is no rate).

## Derived: `NowSummary`

| Field | Source |
|-------|--------|
| `powerKw` | Latest minute bucket × 60, or null when older than 5 minutes |
| `costSoFar`, `ratePerKwh`, `pricingModel` | `CurrentHourCost.actual` |
| `comparisonCost` | `CurrentHourCost.comparison` |
| `level`, `rank` | `PriceDay` for the current hour |
| `trend` | `{ direction: 'up' \| 'down', amount }` or null (see research R4) |

## Derived: `UsageSeries`

| Field | Type | Notes |
|-------|------|-------|
| `period` | `'day' \| 'week' \| 'month' \| 'year'` | Selected tab |
| `unit` | `'kwh' \| 'nok'` | Selected toggle |
| `points` | `{ label, current \| null, previous \| null }[]` | Aligned by position within the period |
| `total`, `previousTotal`, `deltaPercent` | number | Totals only over points that have a current value |

## Derived: `LocationSummary` (overview)

| Field | Notes |
|-------|-------|
| `locationId`, `name`, `pricingModel` | From `LocationSummary` and cost responses |
| `powerKw` | As for `NowSummary` |
| `kwh`, `cost`, `previousCost` | For Today, Week or Month |
| `trend` | 24 hourly kWh points for the sparkline |
| `sharePercent` | `kwh / total kwh` |
| `incomplete` | True when a request failed or prices are missing |

## Persisted preferences (localStorage, per device)

| Key | Values |
|-----|--------|
| `ams.selectedLocation` | Location id (existing key) |
| `ams.chart` | `{ period, unit }` |
| `ams.theme` | `'light' \| 'dark'`; absent means follow device |

## State transitions

- Theme: follow device → light → dark → follow device (button cycle). Explicit choice is stored; "follow device" removes the key.
- Selected location: falls back to the first active location when the stored id is missing or inactive (existing behaviour).
- Overview visibility: shown only when the user has two or more active locations.
