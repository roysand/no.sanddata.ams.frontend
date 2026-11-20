# API Contract Used: The Water Heater's Power per 5 Minutes

The source of truth is `no.sanddata.ams.api` → `specs/017-water-heater-power/contracts/endpoints.md`. This file lists
only what this app sends and reads.

| Endpoint                                               | Function (`dashboard/api.ts`) | Hook / key                                                                       |
| ------------------------------------------------------ | ----------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/locations/{id}/water-heater/power?from=&to=` | `getWaterHeaterPower`         | `useRecentWaterHeater` · `['water-heater', 'power', id, startMs]` · every minute |

## Sent

- `from` is the window's `startMs` (on whole 5 minutes), and `to` is `startMs` + 3 h, both as UTC ISO.
- `to` may be up to 5 minutes in the future, which the API allows. `from` is never in the future.

## Read

- `items[].start`, `powerKw` and `sampledSeconds`.
- A step without an item has no samples. It is drawn as a gap, never 0.
- `powerKw` is not capped at the meter's power. The app draws `min(heater, house)` and shows the heater's own value in
  the detail line (research R4).

## Errors

- `404 Location.NotFound` cannot happen for a location in the user's own list.
- Any error is treated alike: no water heating, and the note "Water heating could not be loaded." (FR-009).
