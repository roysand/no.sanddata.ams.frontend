# Contract: the API Calls This Feature Uses

The source is `no.sanddata.ams.api/specs/015-key-expiry-reminders/contracts/endpoints.md` (PR #43), which is the
authority for these. Every call here is for administrators only.

| Call                                      | Endpoint                                                                                             | Used by                                 |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `getKeyReminders()`                       | `GET /api/admin/key-reminders`                                                                       | `useKeyReminders` → `KeyReminderBanner` |
| `connectWaterHeater(id, input)` (changed) | `PUT /api/admin/locations/{id}/water-heater`, now also sending `keyExpiresOn`                        | `ConnectWaterHeaterDialog`              |
| `getWaterHeaterSettings(id)` (changed)    | `GET …/water-heater`, now with `keyExpiresOn` in the answer                                          | `WaterHeaterSection`                    |
| `setWaterHeaterKeyExpiry(id, date)`       | `PUT …/water-heater/key-expiry` with `{ "keyExpiresOn": "yyyy-MM-dd" }`, answering with the settings | `KeyExpiryDialog`                       |
| `rotateSensorKey(id)`                     | `POST /api/admin/locations/{id}/api-key/rotate`, answering `{ apiKey, hint, expiresAt }`             | `ReplaceSensorKeyDialog`                |

## What the frontend relies on

- **Reminders:**
  - `items` is ordered soonest first.
  - `daysLeft` is counted in Oslo days.
  - Inactive locations and deactivated sensor keys are already left out.
- **Errors:**
  - `400` with code `WaterHeater.KeyExpiryOutOfRange` for a date out of range, as a field error.
  - `404 WaterHeater.NotConnected` from the date call.
- **Rotate:**
  - It invalidates the old key at once, and returns the new key only in this answer.
  - The new key is valid for two years.
- **The Admin location list** already has `apiKey.expiresAt` and `apiKey.status`. It is unchanged.

## Older API

| Call                                  | What happens                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `GET /api/admin/key-reminders`        | 404, so no banner and no error                                                 |
| `keyExpiresOn` in the settings        | Absent, read as `null`. The section shows no date and no "Change date" button. |
| `keyExpiresOn` in the connect request | Ignored by the API. The connection works.                                      |
