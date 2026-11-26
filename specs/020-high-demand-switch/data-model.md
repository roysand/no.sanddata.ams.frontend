# Data Model: A High Demand Switch on the Heater Tab

## HighDemandAnswer (from the API, `types.ts`)

| Field        | Type                       | Notes                                                  |
| ------------ | -------------------------- | ------------------------------------------------------ |
| `locationId` | string                     |                                                        |
| `highDemand` | boolean                    | what was asked for                                     |
| `state`      | `WaterHeaterState \| null` | the heater read just after; null when that read failed |

High Demand is on when `state.specialMode.mode === 'Supercharge'`, until `specialMode.end` (UTC).
