# Data Model: Warnings Inside the App

Phase 1 of [plan.md](plan.md). The decisions are in [research.md](research.md). Nothing is stored; everything is
derived from figures the app already reads.

## Inputs (existing types)

| From                       | Hook                                           | Fields used                                                                 |
| -------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- |
| `CapacityCharge`           | `useCapacityCharge(id, month, true)`           | `set`, `step.upperKw` (the next step's lower limit), `peaks[] { date, kw }` |
| `PagedHourlyCost` (today)  | `useTodayHourlyCost(id)`                       | `items[].hourStart`, `consumptionKwh` (today's completed hours)             |
| `CurrentHourCost`          | `useCurrentHourCost(id)`                       | `hourStart`, `consumptionKwhSoFar`                                          |
| `Consumption` (per minute) | `useLastHourPower(id)`                         | `items[].periodStart`, `consumptionKwh`                                     |
| Hourly items, 4 weeks      | the heatmap query, through `useUsualPower(id)` | `hourStart`, `consumptionKwh`                                               |

## Derived (`features/dashboard/warnings.ts` and `usual.ts`, pure)

### Constants

```ts
CAPACITY_MIN_MINUTES = 10 // judge an hour only after this
USAGE_WINDOW_MINUTES = 15 // the power now is averaged over this
USAGE_MIN_READINGS = 5 // fewer readings in the window give no power now
USAGE_RATIO = 2 // at least twice the usual
USAGE_MIN_EXCESS_KW = 1 // and at least 1 kW above it
USUAL_MIN_WEEKS = 3 // of the last 4
```

### `CapacityWarning`

| Field        | Type             | Rule                                                                                                 |
| ------------ | ---------------- | ---------------------------------------------------------------------------------------------------- |
| `nextStepKw` | `number`         | `step.upperKw`                                                                                       |
| `limitKw`    | `number \| null` | the kW for the rest of the hour, rounded down to one decimal; `null` once the step is already lifted |

`capacityWarning({ capacity, todayHours, currentHour, now })` → `CapacityWarning | null`, by research R1.

### `UsualPower`

| Field   | Type     | Rule                                  |
| ------- | -------- | ------------------------------------- |
| `kw`    | `number` | the median of the matching hours' kWh |
| `weeks` | `number` | how many matching hours were found    |

`usualPower(items, now)` → `UsualPower | null`. It is `null` when nothing matches.

### `UsageWarning`

| Field     | Type     | Rule                                                                                           |
| --------- | -------- | ---------------------------------------------------------------------------------------------- |
| `nowKw`   | `number` | the mean power over the last 15 minutes                                                        |
| `usualKw` | `number` | from `UsualPower`                                                                              |
| `ratio`   | `number` | `nowKw / usualKw`, rounded to a whole number. With `usualKw` 0, the text leaves the ratio out. |
| `weekday` | `string` | the Oslo weekday name of `now`, for the text                                                   |

`usageWarning({ minutes, usual, now })` → `UsageWarning | null`. It warns when all of these hold:

- `usual.weeks ≥ 3`
- the newest reading is no older than 6 minutes
- there are at least 5 readings in the window
- `nowKw ≥ 2 × usualKw`
- `nowKw − usualKw ≥ 1`.

### `NorgesPrisWarning`

| Field          | Type      | Rule                                                                                      |
| -------------- | --------- | ----------------------------------------------------------------------------------------- |
| `projectedKwh` | `number`  | the `SpotEnergy` line's quantity (so far + projected)                                     |
| `limitKwh`     | `number`  | the `NorgesPrisCredit` line's quantity, which is the limit once the projection is over it |
| `passed`       | `boolean` | `projectedKwh − projection.kwh ≥ limitKwh`                                                |

`norgesPrisWarning(bill)` → `NorgesPrisWarning | null`. It warns when all of these hold:

- the bill is an `Estimate` with a projection
- it has a `NorgesPrisCredit` line
- `projectedKwh − limitKwh > 0,5`.

Inputs: `MonthlyBill` from `useMonthlyBill(id, month, true)`: `status`, `projection.kwh`, and the lines' `code` and
`quantity`.

## Invariants (tested)

- **No warning on any missing or failed input.** A rule returns `null` in that case.
- **The capacity limit keeps the step.** Using exactly `limitKw` for the rest of the hour puts the hour at `T*`. One
  0,1 kW less keeps the average below the next step.
- **Months with fewer than three days:** they use `n` days in the average.
- **The repeated hour on the night the clocks go back:** it is counted as its own Oslo hour, as the heatmap counts it.
