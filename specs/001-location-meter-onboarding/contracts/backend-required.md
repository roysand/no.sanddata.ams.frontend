# Contract required from the backend (API repository)

Needed only for User Story 1 (users set up their own location). Not implemented in this repository.

## `POST /api/locations`

- **Auth**: any signed-in user (JWT).
- **Body**: same as `POST /api/admin/locations`: `{ name, address, serialNumber, zone, hasNorgesPriceAgreement?, isActive? }`.
- **Behaviour**: creates the location, generates its sensor key and links the caller to it in one
  transaction.
- **Success**: `201 { location, apiKey }`. The key is returned only here.
- **Errors**: `400` validation (same validator as the admin endpoint), `401`, `409` serial number in use, `409` with code `Location.LimitReached` when the user is already linked to 4 locations.
- **Out of scope here**: key rotation for non-admins.

**Status**: implemented in the API repo on branch `feature/005-user-creates-own-location` (merged to `main` on 2026-10-09 as PR #12, merge commit `7a7721e`; the Build, Push & Deploy workflow finished successfully). The limit of 4 counts all locations linked to the user; the admin endpoints are not limited.
