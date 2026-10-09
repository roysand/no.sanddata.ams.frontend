# Contract required from the backend (API repository)

Needed for the owner/viewer parts of this feature. Not implemented in this repository. User Story 4
(the administrator's all-locations page and editing) needs only the `users` addition in item 3.

Suggested name in the API repository: `006-location-roles-and-owner-edit`.

## 1. Role on the user-location link

- **Data**: a `role` on the link, `Owner` or `Viewer`. Migration: every existing link becomes `Owner`.
- **`PUT /api/users/{userId}/locations/{locationId}`** (admin): optional body `{ "role": "Owner" | "Viewer" }`,
  **default `Owner`** so existing callers are unchanged. Still idempotent; sending a different role on an
  existing link changes the role.
- **Rules**: creating a second `Owner` on a location is refused `409`; demoting the last `Owner` is
  refused `409`.
- **`DELETE /api/users/{userId}/locations/{locationId}`** (admin): refused `409` (`Location.LastOwner`) when the
  link is the location's last owner.

## 2. Owner edits a location

- **`PUT /api/locations/{id}`**, body `{ name, address, isActive }`, JWT, caller must be an `Owner` of the
  location. Validation as `UpdateLocationValidator` (name and address required, max 100).
- **Responses**: `200 LocationSummary` (extended, item 4); `400`; `401`; `404` when the location does not
  exist **or the caller is not an owner** (viewers and strangers learn nothing); never touches serial
  number, zone, Norgespris flag or the sensor key.
- Logging as for the admin update, including the active-flag change.

## 3. Read models

- **`GET /api/admin/locations`**: each item gains `users: [{ userId, email, firstName, lastName, role }]`.
- **`GET /api/users`**: each item gains `locationAccess: [{ locationId, name, role }]`. `locations` and
  `locationIds` stay.

## 4. Own locations

- **`GET /api/locations`**: each item gains `serialNumber`, `hasNorgesPriceAgreement`, `isActive` and
  `role`. **Owners also receive their inactive locations**; viewers receive active ones only. The sensor
  key and its facts are not included.

## 5. Meters

- **`PUT /api/meters/{id}`**, body `{ comment }` (optional, max 200), caller is an `Owner` of the meter's
  location or an administrator. `200 Meter`; `404` otherwise as above.
- **`POST /api/meters`**: for non-admins, require `Owner` (today any linked user may register a meter).

## 6. Limit and reads

- **4-location limit** (`CountForUserAsync`): count `Owner` links only (noted on API PR #12).
- **Viewer reads**: confirm the measurement and cost endpoints authorise by link, not by ownership.

## Out of scope here

Sensor key rotation (see `backlog.md`), deleting locations or meters, owners inviting viewers.
