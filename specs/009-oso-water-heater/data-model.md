# Data Model: Connect and Show the OSO Water Heater

Phase 1 of [plan.md](plan.md). Wire format: [contracts/api-usage.md](contracts/api-usage.md). Decisions: [research.md](research.md).

## Admin (`features/admin/types.ts`)

### `WaterHeaterSettings`

| Field          | Type               | Notes                                                   |
| -------------- | ------------------ | ------------------------------------------------------- |
| `locationId`   | `string`           |                                                         |
| `deviceIdHint` | `string`           | e.g. `4b8814…49499d`; shown as sent                     |
| `connectedAt`  | `string` (UTC ISO) | shown as an Oslo date                                   |
| `updatedAt`    | `string` (UTC ISO) | shown as "changed …" when it differs from `connectedAt` |

`getWaterHeaterSettings` returns `WaterHeaterSettings | null` (`null` = 404, not connected).

### `WaterHeaterInput` (form values and PUT body)

| Field             | Type     | Rules (mirror the API validator)                                                       |
| ----------------- | -------- | -------------------------------------------------------------------------------------- |
| `deviceId`        | `string` | trimmed; required; ≤ 200; `^[0-9a-fA-F]+$` ("Device id can only contain 0-9 and a-f")  |
| `subscriptionKey` | `string` | required; ≤ 200; no whitespace ("The key cannot contain spaces"); not trimmed silently |

## Dashboard (`features/dashboard/types.ts`)

### `WaterHeaterState`

| Field             | Type                                                                                                                       | Shown                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `locationId`      | `string`                                                                                                                   | no                                                                      |
| `readingTime`     | `string` (UTC ISO)                                                                                                         | no (age is shown)                                                       |
| `ageSeconds`      | `number`                                                                                                                   | as "updated … ago" (R7)                                                 |
| `isStale`         | `boolean`                                                                                                                  | "Reading is old"                                                        |
| `isOnline`        | `boolean`                                                                                                                  | "Heater is offline" when false                                          |
| `isHeating`       | `boolean`                                                                                                                  | "Heating · 2,0 kW" / "Not heating"                                      |
| `setPointCelsius` | `number \| null`                                                                                                           | as detail "set to 72 °C" when present                                   |
| `temperatures`    | `{ topCelsius, midCelsius, lowCelsius, fourthCelsius }`, each `number \| null`                                             | top = main figure; mid, low as details; fourth not shown                |
| `hotWater`        | `{ availableLitres40, maxLitres40, showers, baths, storedEnergyKwh }`, each `number \| null`                               | all but `storedEnergyKwh` (FR / AS 2.9)                                 |
| `powerKw`         | `number`                                                                                                                   | only when `isHeating`                                                   |
| `specialMode`     | `{ mode: 'None' \| 'Holiday' \| 'Supercharge' \| 'BlueBattery', start, end: string \| null, profileName: string \| null }` | Holiday / Supercharge with end time; `None` and `BlueBattery` not shown |
| `osoCodes`        | object                                                                                                                     | not typed beyond `Record<string, number \| null>`, not shown            |

Any `null` is left out of the card, never shown as 0 (FR-010).

## View states

### Water heater section (Admin)

```text
loading ──► not connected ──Connect──► form ──save──► checking ──200──► connected
                ▲                       │  ▲                 │
                │                     Cancel └──── 4xx/5xx ──┘ (message shown, values kept)
                │
connected ──Replace──► form (empty) ── same as above
connected ──Remove──► confirm ──204──► not connected
                         └─ error: message in the confirm dialog
load error (not 404): message in the section, no buttons
```

### Water heater card (dashboard)

| Query result                                   | Card                                       |
| ---------------------------------------------- | ------------------------------------------ |
| loading                                        | skeleton                                   |
| 404                                            | nothing rendered; polling stops (R3)       |
| other error (502, 503, …)                      | title + `error.message`; polling continues |
| data, `isOnline: false`                        | figures + "Heater is offline"              |
| data, stale (API flag or computed age > 900 s) | figures + "Reading is old" next to the age |
| data                                           | figures + age                              |

A refetch error after earlier data shows the message in place of the figures (stale figures are not presented as
current).
