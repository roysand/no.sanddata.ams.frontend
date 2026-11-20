# Data Model: Show Water Heating Apart from the Rest

Phase 1 of [plan.md](plan.md). The API fields are in [contracts/api.md](contracts/api.md), and the decisions in
[research.md](research.md).

Nothing is stored in the frontend. Everything comes from the API figures, or is derived from them in memory.

## From the API (`types.ts`)

```ts
interface WaterHeaterPart {
  kwh: number // ≤ the item's consumptionKwh
  cost: number | null // null when the hour or day has no actual cost
  sampledMinutes: number // hour 0–60, day ≤ 1380/1440/1500
  capped: boolean
}

interface WaterHeaterBillPart extends WaterHeaterPart {
  firstHourUtc: string // ISO UTC
  lastHourUtc: string
  estimate: false // never projected
}
```

| Type             | New field                                  | Value                                                             |
| ---------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| `HourlyCostItem` | `waterHeater: WaterHeaterPart \| null`     | `null` after normalisation when the field is absent (research R2) |
| `DailyCostItem`  | `waterHeater: WaterHeaterPart \| null`     | the same                                                          |
| `MonthlyBill`    | `waterHeater: WaterHeaterBillPart \| null` | the same                                                          |

## Chart rows and points (`series.ts`)

`UsageRow` gains these fields, set by `rowsFromHourly` and `rowsFromDaily`. `rowsFromDaily` sums the days of a
month in the year view with `sumParts`.

| Field             | Type             | Rule                                                                                                                                    |
| ----------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `heaterKwh`       | `number \| null` | `part?.kwh ?? null`                                                                                                                     |
| `heaterNok`       | `number \| null` | `part?.cost ?? null`                                                                                                                    |
| `sampledMinutes`  | `number \| null` | `part?.sampledMinutes ?? null`                                                                                                          |
| `expectedMinutes` | `number`         | 60 for an hour; the Oslo day length for a day; the sum of a month's days. For the slot going on now, the minutes elapsed (research R3). |

`UsagePoint` gains the following, computed in `buildUsageSeries` for the chosen unit. The previous period gets no
heater fields.

| Field    | Type             | Rule                                                                        |
| -------- | ---------------- | --------------------------------------------------------------------------- |
| `heater` | `number \| null` | the row's `heaterKwh`, or `heaterNok` in kr                                 |
| `rest`   | `number \| null` | `restOf(current, heater)`; equals `current` when `heater` is `null`         |
| `partly` | `boolean`        | `isPartlyMeasured(sampledMinutes, expectedMinutes)`; `false` without a part |

`UsageSeries` gains `hasHeater: boolean`, which is true when any current point has `heater !== null`. It drives the
legend.

## Derived elsewhere

| Place             | Value                | From                                                                           |
| ----------------- | -------------------- | ------------------------------------------------------------------------------ |
| Heater tab, today | kWh, kr, share       | Σ today's hourly parts (`sumParts`) and Σ today's `consumptionKwh` (`shareOf`) |
| Heater tab, month | kWh, kr              | `bill.waterHeater` as is                                                       |
| Bill note         | kWh, kr, period text | `bill.waterHeater`, `bill.month`, `bill.status`                                |
| CSV row           | 5 cells              | the item's part and `restOf(item total, part)`                                 |

## Rules (tested in `waterHeater.test.ts`)

- `restOf(total, heater)`: `max(0, total − heater)`, and `null` when either is `null`.
- `sumParts`:
  - It skips `null`, and returns `null` when nothing is left.
  - Its cost is `null` if any part's cost is `null`.
  - Minutes are a sum. Capped is any part capped.
- `isPartlyMeasured(sampled, expected)`: `expected − sampled > max(2, 0.01 × expected)`.
- `shareOf(heater, total)`: `null` when the total is ≤ 0, otherwise `min(1, heater / total)`.
