# API Usage: Connect and Show the OSO Water Heater

Source of truth: `no.sanddata.ams.api` `specs/011-oso-water-heater/contracts/endpoints.md`. This file lists only what
the frontend calls and how it reacts. Error bodies carry the message (`errors.generalErrors` or per-field `errors`)
and no code, so the UI decides by status and shows `ApiError.message` as it comes (research R2).

## GET /api/admin/locations/{locationId}/water-heater

`getWaterHeaterSettings(locationId)` in `features/admin/api.ts`; query key `['admin', 'water-heater', locationId]`.

| Response     | Frontend reaction                                               |
| ------------ | --------------------------------------------------------------- |
| 200 settings | "Connected", `deviceIdHint`, connected date; Replace and Remove |
| 404          | `api.ts` returns `null` → "No water heater connected"; Connect  |
| other        | Message in the section                                          |

## PUT /api/admin/locations/{locationId}/water-heater

`connectWaterHeater(locationId, { subscriptionKey, deviceId })`. Body sent as typed (device id trimmed). Can take up to
10 s.

| Response                                                | Frontend reaction                                                                                             |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 200 settings                                            | Form closed and cleared, mutation reset; invalidate the admin key and `['water-heater', 'state', locationId]` |
| 400 with field `errors` (`subscriptionKey`, `deviceId`) | Messages under the fields                                                                                     |
| 400 Rejected, 409 DeviceInUse, 502, 503                 | Message above the form buttons; values kept; section unchanged                                                |
| 404                                                     | Message (the location was removed meanwhile)                                                                  |

## DELETE /api/admin/locations/{locationId}/water-heater

`removeWaterHeater(locationId)`.

| Response | Frontend reaction                                                                 |
| -------- | --------------------------------------------------------------------------------- |
| 204      | Confirm dialog closes; invalidate the same two keys → "No water heater connected" |
| 404      | Treated as removed (same invalidation)                                            |
| other    | Message in the confirm dialog                                                     |

## GET /api/locations/{locationId}/water-heater

`getWaterHeaterState(locationId)` in `features/dashboard/api.ts`; `useWaterHeaterState` with key
`['water-heater', 'state', locationId]`, `refetchInterval` 60 s (off after 404), `retry: false` (research R3).

| Response                               | Frontend reaction                               |
| -------------------------------------- | ----------------------------------------------- |
| 200 state                              | Card with the figures (data-model.md)           |
| 404 (no heater, inactive, not visible) | No card                                         |
| 502 / 503                              | Card with the message; next refresh tries again |
| 401                                    | Handled by `apiClient` (refresh, then sign-in)  |

Fields not shown: `readingTime` (age is shown instead), `temperatures.fourthCelsius`, `hotWater.storedEnergyKwh`,
`specialMode.start`, `specialMode.profileName`, `osoCodes`.
