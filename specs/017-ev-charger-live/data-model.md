# Data Model: The Car Charger's State Right Now

## EvChargerLiveState (from the API, `types.ts`)

| Field            | Type                       | Notes                                          |
| ---------------- | -------------------------- | ---------------------------------------------- |
| `state`          | `EvChargerLiveStatus`      | normalised: anything else becomes `unknown`    |
| `online`         | `boolean \| null`          | null for `noCharger`                           |
| `powerKw`        | `number \| null`           | only while `charging`                          |
| `sessionKwh`     | `number \| null`           | connected, charging, finished; unknown if sent |
| `pluggedInAt`    | `string \| null` (UTC ISO) | charging, connected, finished                  |
| `chargingSince`  | `string \| null`           | only while `charging`                          |
| `lastReportedAt` | `string \| null`           | may be null when offline; null for `noCharger` |
| `readAt`         | `string \| null`           | null only for `noCharger`                      |

`EvChargerLiveStatus = 'charging' | 'connected' | 'finished' | 'noCar' | 'unknown' | 'offline' | 'noCharger'`

## LiveView (derived, `evCharger.ts`)

| Field     | Type                                            | Notes                                    |
| --------- | ----------------------------------------------- | ---------------------------------------- |
| `heading` | string                                          | "Charging", "Connected, not charging", … |
| `details` | string[]                                        | in order; see contracts/ui.md            |
| `picture` | `'charging' \| 'plugged' \| 'noCar' \| 'faded'` | the drawing's mode                       |
| `label`   | string                                          | the picture's screen reader text         |
| `age`     | string \| null                                  | "updated 2 minutes ago", from `readAt`   |

`liveView` returns null for `noCharger`, and the tile is then not shown, as for a 404: the tab already says "No car
charger is connected" for such a location.

## Rules

- Nothing is stored or added to any figure (FR-008).
- An error answer (not 404) wins over cached data (research R3).
