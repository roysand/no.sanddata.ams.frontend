# Data Model: Norgespris Limit Warnings for Every Location

## From the API (`features/dashboard/types.ts`)

### NorgesPrisStatus (new)

`GET /api/electricity-cost/norgespris-status` (API spec 018).

| Field   | Type                     | Notes                         |
| ------- | ------------------------ | ----------------------------- |
| `asOf`  | string (UTC ISO)         | when the figures were read    |
| `items` | `NorgesPrisStatusItem[]` | in `GET /api/locations` order |

### NorgesPrisStatusItem (new)

| Field                   | Type             | Notes                                                       |
| ----------------------- | ---------------- | ----------------------------------------------------------- |
| `locationId`            | string           |                                                             |
| `month`                 | string `yyyy-MM` | Oslo month                                                  |
| `limitKwh`              | number \| null   | null: no limit set; never over                              |
| `kwhSoFar`              | number           | the car's kWh included when it is counted with the house    |
| `projectedKwh`          | number \| null   | the bill's `totalKwh + projection.kwh`; null without one    |
| `overLimit`             | boolean          | `kwhSoFar ≥ limitKwh`                                       |
| `overLimitKwh`          | number           | 0 when not over                                             |
| `norgesPrisPricePerKwh` | number \| null   | incl. VAT, no grid charge, taxes or markup; null if not set |
| `resetsAt`              | string (UTC ISO) | 00:00 Oslo time on the 1st of next month                    |

### HourPrice (changed)

| Field                   | Type                        | Notes                                                        |
| ----------------------- | --------------------------- | ------------------------------------------------------------ |
| `spotEnergyPricePerKwh` | number \| null, optional \* | spot energy incl. VAT only; the same under or over the limit |

\* Optional in the type: absent from an API without spec 018, and then treated as null.

## In the app (`features/dashboard/norgesPris.ts`, pure)

### LimitWarning

A union, one per location at most (FR-005):

| `kind`        | Fields                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------- |
| `over`        | `kwhSoFar`, `limitKwh`, `resetsAt`                                                             |
| `approaching` | `kwhSoFar`, `limitKwh`, `reachedIn`: `'today' \| 'tomorrow' \| number \| null`, `projectedKwh` |
| `projected`   | `projectedKwh`, `limitKwh`                                                                     |

- `reachedIn` is the whole number of days (≥ 2) until the limit at the month's pace, or `'today'`/`'tomorrow'` by Oslo
  date; null when the month is projected within the limit (then `projectedKwh` is shown as the expected end) or has no
  projection.
- Constants: `APPROACHING_SHARE = 0.9`.
- `needsTomorrow(warning)`: true for `over`, `projected`, and `approaching` with `projectedKwh > limitKwh`.

### ExpensiveHours

| Field      | Type                                     | Notes                                      |
| ---------- | ---------------------------------------- | ------------------------------------------ |
| `ranges`   | `{ fromHour: number; toHour: number }[]` | Oslo clock hours; `toHour` is the end      |
| `hours`    | number                                   | expensive hours in all                     |
| `maxPrice` | number                                   | highest `spotEnergyPricePerKwh` among them |

- Constant: `EXPENSIVE_FACTOR = 4`.
- null when no hour reaches `4 × norgesPrisPricePerKwh`, the price is null or ≤ 0, or tomorrow isn't published.

## Removed

- `norgesPrisWarning(bill)`, `NorgesPrisWarning` and `NORGESPRIS_MARGIN_KWH` in `warnings.ts` (spec 012, research R7),
  replaced by `limitWarning`.
