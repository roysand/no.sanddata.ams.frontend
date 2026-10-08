# Contracts: existing API used by this feature

All paths are relative to `VITE_API_BASE_URL`. Bearer token via `apiClient`.

| Purpose | Request | Success | Errors |
|---|---|---|---|
| Create location (admin) | `POST /api/admin/locations` body `{ name, address, serialNumber, zone, hasNorgesPriceAgreement?, isActive? }` | `201 { location, apiKey }` | 400 validation (incl. invalid zone), 401, 403, 409 serial number already used |
| Link user to location (admin) | `PUT /api/users/{userId}/locations/{locationId}` | `204` (idempotent) | 401, 403, 404 |
| Register meter | `POST /api/meters` body `{ locationId, deviceId, comment? }` | `200 { id, locationId, deviceId, meterId?, meterType?, comment?, isActive }` | 400, 401, 404 (not found or not linked), 409 device already registered at location |
| List own locations | `GET /api/locations` | `200 LocationSummary[]` | 401 |
| List users (admin) | `GET /api/users?pageNumber&pageSize&search` | `200 PagedUsers` | 401, 403 |

Notes:
- Non-admins can register a meter only at an active location they are linked to.
- The API sends a body only with `Content-Type` when one is present; `apiClient` already handles this.
