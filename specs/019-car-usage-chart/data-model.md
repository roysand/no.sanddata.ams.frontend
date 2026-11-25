# Data Model: A Usage Chart for the Car, on the Car Tab

## UsageRow (changed, `series.ts`)

| Field       | Type             | Notes                                                                   |
| ----------- | ---------------- | ----------------------------------------------------------------------- |
| `carKwh`    | `number \| null` | unchanged: the car's kWh only when counted with the house (Now's split) |
| `carOwnKwh` | `number \| null` | new: the car part's kWh, counted or not; null when the slot has none    |

## Car rows (derived, `carUsageRows`)

`{ key, kwh: carOwnKwh ?? 0, nok: null }` per house row, or `[]` when no row has car kWh.

## Removed

`EvChargerSession` and the sessions request (the API keeps the endpoint).
