# Contracts: existing API used by this feature

All paths are relative to `VITE_API_BASE_URL`. Bearer token via `apiClient`. Verified against the API
repository `main` on 2026-10-09.

| Purpose | Request | Success | Errors |
|---|---|---|---|
| Admin edits a location | `PUT /api/admin/locations/{id}` body `{ id, name, address, serialNumber, zone, hasNorgesPriceAgreement, isActive }` | `200 AdminLocation` | 400 validation, 401, 403, 404, 409 serial number in use |
| Admin lists all locations | `GET /api/admin/locations` | `200 AdminLocation[]` (key facts and meters; users added by the new contract) | 401, 403 |
| Link a user (admin) | `PUT /api/users/{userId}/locations/{locationId}` | `204`, idempotent | 401, 403, 404 |
| Unlink a user (admin) | `DELETE /api/users/{userId}/locations/{locationId}` | `204` | 401, 403, 404 |
| List users (admin) | `GET /api/users?pageNumber&pageSize&search` | `200 PagedUsers` (`locations`, `locationIds` per user) | 401, 403 |
| Create location (admin) | `POST /api/admin/locations` | `201 { location, apiKey }` | see feature 001 |
| Create own location | `POST /api/locations` | `201 { location, apiKey }` | see feature 001 |
| Register meter | `POST /api/meters` body `{ locationId, deviceId, comment? }` | `200 Meter` | 400, 401, 404, 409 |
| List own locations | `GET /api/locations` | `200 LocationSummary[]` (active locations only today) | 401 |

Notes:
- An update of a deactivated location "rejects sensor readings and is hidden from regular users"
  (API description of `PUT /api/admin/locations/{id}`). Changing zone or the Norgespris flag changes how
  past hours are priced.
- The error body lists messages but does not carry the error `code`; branch on status and show the
  message (research item 10).
