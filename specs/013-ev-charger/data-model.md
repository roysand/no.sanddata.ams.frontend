# Data Model: The EV Charger in the App

Phase 1 of [plan.md](plan.md). Nothing is stored in the frontend. Everything comes from the API, or is derived from it
in memory. The decisions are in [research.md](research.md).

## From the API (after normalisation in `api.ts`, research R1)

```ts
// features/locations/types.ts: LocationSummary gains
hasEvCharger: boolean // false when absent
includeEvCharger: boolean // false when absent

// features/dashboard/types.ts
interface EvChargerPart {
  kwh: number
  estimated: boolean
  included: boolean
}
interface EvChargerDayPart extends EvChargerPart {
  hoursWithoutMeterReading: number
}
interface EvChargerBillPart extends EvChargerDayPart {
  firstHour: string // UTC ISO
  lastHour: string
}
interface EvChargerSession {
  start: string // UTC ISO
  end: string
  kwh: number
  estimated: boolean
}
```

| Type              | New fields                                                         | When absent                   |
| ----------------- | ------------------------------------------------------------------ | ----------------------------- |
| `HourlyCostItem`  | `totalKwh: number`, `evCharger: EvChargerPart \| null`             | `consumptionKwh`, `null`      |
| `DailyCostItem`   | `totalKwh: number`, `evCharger: EvChargerDayPart \| null`          | the same                      |
| `CurrentHourCost` | `totalKwhSoFar: number`, `evCharger: EvChargerPart \| null`        | `consumptionKwhSoFar`, `null` |
| `MonthlyBill`     | `totalKwh: number \| null`, `evCharger: EvChargerBillPart \| null` | `null`, `null`                |

The admin slice (`features/admin/types.ts`):

```ts
interface ZaptecCharger {
  chargerId: string
  name: string
  installationId: string
  installationName: string
}
interface EvChargerSettings {
  locationId: string
  chargerId: string
  chargerName: string
  installationId: string
  installationName: string
  connectedAt: string
  readUpTo: string | null
  includeInTotals: boolean
}
// schema.ts
evChargerSchema = z.object({ chargerId: z.string().min(1, 'Pick a charger') })
```

## Chart rows and points (`series.ts`, research R2/R3)

| Field                | Type             | Rule                                                                                                               |
| -------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `UsageRow.kwh`       | `number`         | `item.totalKwh` (was `consumptionKwh`)                                                                             |
| `UsageRow.nok`       | `number \| null` | unchanged: the house's cost                                                                                        |
| `UsageRow.carKwh`    | `number \| null` | `evCharger?.included ? evCharger.kwh : null`. The year view sums the days' values, and is `null` when none has one |
| `UsagePoint.car`     | `number \| null` | `row.carKwh` in kWh; always `null` in kr                                                                           |
| `UsagePoint.rest`    | `number \| null` | `restOf(current, heater + car)`. It equals `current` when both are `null`                                          |
| `UsageSeries.hasCar` | `boolean`        | any current point has `car !== null`. It drives the legend                                                         |

## Derived for the Car tab (`evCharger.ts`, research R5/R7)

| Function                  | Result                                                                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `carMonth(items, today)`  | `{ today: number \| null, month: number \| null, since: string \| null, hoursWithoutReading: number }`. `today` and `month` are `null` when there are no parts, never 0. `since` is the first date with a part when that date is after the 1st |
| `sessionTimes(session)`   | `{ date, from, to, duration }` in Oslo time. `to` carries its date when it is a different day                                                                                                                                                  |
| `formatDuration(minutes)` | "45 min", "4 h 38 min", "12 h"                                                                                                                                                                                                                 |

## The checkbox (research R6)

| State  | Shown value                                      | Enabled                                      |
| ------ | ------------------------------------------------ | -------------------------------------------- |
| idle   | `selected.includeEvCharger`                      | owner or Admin                               |
| saving | `mutation.variables`                             | no                                           |
| failed | `selected.includeEvCharger`, plus the error text | owner or Admin                               |
| viewer | `selected.includeEvCharger`                      | never, with "Only the owner can change this" |

On success, invalidate `['locations']`, `['usage']`, `['cost']` and `['ev-charger']`.

## Rules (tested in `evCharger.test.ts` and `series.test.ts`)

- `carMonth`:
  - `month ≥ today` always.
  - No parts gives nulls.
  - A part in the middle of the month gives `since`.
  - `hoursWithoutReading` is summed.
- Rows:
  - With `included: false`, `carKwh` is `null` and `kwh` is `totalKwh`, which equals `consumptionKwh`.
  - With `included: true`, `kwh` is the total, `nok` is unchanged and `carKwh` is set.
- Points:
  - In kr, `car` is `null`.
  - `rest = current − heater − car`, and is never below 0.
  - `hasCar` is false without parts.
