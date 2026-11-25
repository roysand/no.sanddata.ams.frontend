# Data Model: Hot Water Used, on the Heater Tab

## HotWater (from the API, `types.ts`)

| Field            | Type                                   | Notes                                        |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| `locationId`     | string                                 |                                              |
| `period`         | `'day' \| 'week' \| 'month' \| 'year'` |                                              |
| `from`, `to`     | string (UTC ISO)                       | the whole period, also after now             |
| `totalLitres`    | `number \| null`                       | sum of the items' litres; null when none has |
| `sampledMinutes` | number                                 | sum over the items                           |
| `items`          | `HotWaterItem[]`                       | parts that start before now, in time order   |

`HotWaterItem`: `start` (UTC ISO), `litres: number | null` (null: no sampled time, a gap), `sampledMinutes: number`.

## HotWaterView (derived, `hotWater.ts`)

`{ date: string (yyyy-MM-dd), title: string, canGoBack: boolean }` for a period and an offset (0 = now, −1 = the one
before).

## HotWaterRow (derived)

| Field           | Type             | Notes                                  |
| --------------- | ---------------- | -------------------------------------- |
| `key`           | string           | the part's start                       |
| `label`         | string           | axis text                              |
| `span`          | string           | tooltip text                           |
| `litres`        | `number \| null` | null for a gap or a part still to come |
| `partial`       | boolean          | sampled less than 90 % of the part     |
| `sampledShare`  | `number \| null` | 0–1, for the tooltip                   |
| `litresFull`    | `number \| null` | `litres` when not partial              |
| `litresPartial` | `number \| null` | `litres` when partial                  |

## Rules

- A gap is never 0 (FR-003). History starts on 2026-11-24 (`HISTORY_START`).
