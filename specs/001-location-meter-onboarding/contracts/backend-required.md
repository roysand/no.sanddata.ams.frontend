# Contract required from the backend (API repository)

Needed only for User Story 1 (users set up their own location). Not implemented in this repository.

## `POST /api/locations`

- **Auth**: any signed-in user (JWT).
- **Body**: same as `POST /api/admin/locations`: `{ name, address, serialNumber, zone, hasNorgesPriceAgreement?, isActive? }`.
- **Behaviour**: creates the location, generates its sensor key and links the caller to it in one
  transaction.
- **Success**: `201 { location, apiKey }`. The key is returned only here.
- **Errors**: `400` validation (same validator as the admin endpoint), `401`, `409` serial number in use.
- **Out of scope here**: key rotation for non-admins.

Open point for the API owner: whether non-admin-created locations should be limited in number per user.
