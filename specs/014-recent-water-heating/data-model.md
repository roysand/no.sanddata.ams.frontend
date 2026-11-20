# Data Model: Water Heating in the "Last 3 Hours" Chart

Phase 1 of [plan.md](plan.md). Nothing is stored. The decisions are in [research.md](research.md).

## From the API (`features/dashboard/types.ts`)

```ts
interface WaterHeaterPowerStep {
  start: string // UTC ISO, on whole 5 minutes
  powerKw: number // average over the sampled time only
  sampledSeconds: number // 1–300
}
interface WaterHeaterPower {
  locationId: string
  from: string // the window used, UTC
  to: string
  stepSeconds: number // 300
  items: WaterHeaterPowerStep[] // ordered by start; a step without samples has no item
}
```

## The window (`series.ts`, R1)

| Function            | Result                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `recentWindow(now)` | `startMs = floor(now ÷ 5 min) × 5 min − 35 × 5 min`: 36 steps, the last one going on now |

## Points (`series.ts`, R2/R4)

`RecentPoint` gains:

| Field         | Type             | Rule                                                                     |
| ------------- | ---------------- | ------------------------------------------------------------------------ |
| `current`     | `number \| null` | changed: Σ kWh ÷ minutes with a reading × 60 (was Σ kWh × 12)            |
| `heater`      | `number \| null` | the step's `powerKw`; `null` without a step, or when `current` is `null` |
| `heaterDrawn` | `number \| null` | `min(heater, current)`, what the area draws                              |
| `rest`        | `number \| null` | `max(0, current − heater)`, and `null` without a heater value            |
| `partly`      | `boolean`        | a finished step (start + 5 min ≤ now) with `300 − sampledSeconds > 120`  |

`RecentUsage` gains:

| Field         | Type             | Rule                                                                                         |
| ------------- | ---------------- | -------------------------------------------------------------------------------------------- |
| `hasHeater`   | `boolean`        | any point with `heater !== null`                                                             |
| `heaterKwh`   | `number \| null` | Σ `powerKw × sampledSeconds ÷ 3600` of the steps from `startMs` to now; `null` without steps |
| `heaterShare` | `number \| null` | `shareOf(heaterKwh, totalKwh)`: 0–1, and `null` when `totalKwh` is 0                         |

`RecentUsageInput` gains `heater?: WaterHeaterPowerStep[]`. When it is absent or empty, every new field is `null` or
`false`, and the result is otherwise as before.

## Rules (tested in `series.test.ts`)

- `recentWindow`:
  - 20:37:10 gives a start of 17:40 and steps 17:40 … 20:35. That is 36 steps.
  - On whole 5 minutes (20:35:00), the last step starts at 20:35.
- `bucketKw`:
  - 5 full minutes at 0,1 kWh give 1,2 kW, unchanged.
  - 2 minutes at 0,1 kWh give 6 kW (it was 2,4).
  - No readings give `null`.
- Heater matching:
  - A step at 19:40 lands on the 19:40 point.
  - Steps outside the window are ignored.
  - A step where the house has no reading gives `heater: null`.
- Drawing and detail:
  - heater 3 with house 2 gives `heaterDrawn` 2 and `rest` 0, with `heater` still 3.
  - `partly` for `sampledSeconds` 170 on a finished step. Not for 200, and not for the step going on now.
- `heaterKwh`:
  - 12 steps of 2 kW × 300 s give 2 kWh.
  - The share is capped at 1.
  - No steps give `null`.
