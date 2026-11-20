# API Contract Used: The EV Charger

The source of truth is `no.sanddata.ams.api` → `specs/016-zaptec-ev-charger/contracts/endpoints.md`. This file lists
only what this app reads or sends, and where.

| Endpoint                                                                                      | Function (slice `api.ts`)          | Hook / key                                                                                    |
| --------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET /api/locations` (+ `hasEvCharger`, `includeEvCharger`)                                   | `locations/api.ts` `getLocations`  | `['locations']`                                                                               |
| `PUT /api/locations/{id}/ev-charger/include` `{ include }`                                    | `dashboard` `setEvChargerInclude`  | `useEvChargerInclude`; invalidates `['locations']`, `['usage']`, `['cost']`, `['ev-charger']` |
| `GET /api/locations/{id}/ev-charger/sessions`                                                 | `dashboard` `getEvChargerSessions` | `['ev-charger', 'sessions', id]`, 15 min                                                      |
| `GET /api/electricity-cost/daily?from=&to=` (month so far)                                    | `dashboard` `getDailyCostRange`    | `['ev-charger', 'month', id, yyyy-MM]`, 15 min                                                |
| `GET /api/electricity-cost/hourly`, `/daily`, `/current`, `/bill` (+ `totalKwh`, `evCharger`) | existing, normalised (research R1) | existing keys                                                                                 |
| `GET /api/admin/ev-chargers`                                                                  | `admin` `getZaptecChargers`        | `['admin', 'ev-chargers']`, while the connect dialog is open                                  |
| `GET /api/admin/locations/{id}/ev-charger` (404 → `null`)                                     | `admin` `getEvChargerSettings`     | `['admin', 'ev-charger', id]`                                                                 |
| `PUT /api/admin/locations/{id}/ev-charger` `{ chargerId }`                                    | `admin` `connectEvCharger`         | invalidates `['admin', 'ev-charger', id]`, `['locations']`                                    |
| `DELETE /api/admin/locations/{id}/ev-charger`                                                 | `admin` `removeEvCharger`          | the same                                                                                      |

## Errors shown as the API's message

- **The connect dialog's charger list:**
  - `503 EvCharger.NotConfigured`, `EvCharger.SignInRejected` or `EvCharger.Unavailable`.
  - `502 EvCharger.InvalidResponse`.
- **Saving a connection:**
  - `400`: a missing id, `EvCharger.UnknownCharger`, or `SignInRejected`.
  - `409 EvCharger.ChargerInUse`.
  - `502` or `503`.
- **The checkbox:** `400 EvCharger.NotConnected`, and `403` for a viewer (who should never get that far).

## Never

- The app never computes a price per kWh as cost ÷ `totalKwh`.
- The car is never added to `consumptionKwh` in the frontend.
- The app never sends or asks for a Zaptec password.
