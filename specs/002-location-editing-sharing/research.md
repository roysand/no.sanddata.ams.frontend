# Research: Location Editing and Sharing

No `NEEDS CLARIFICATION` items remain. The decisions below come from reading the API repository
(`main`, including its feature 004 location management and 005 user-created locations) and the
current frontend.

## 1. What the API already supports

| Need | Today | Verdict |
|---|---|---|
| Admin edits every location field | `PUT /api/admin/locations/{id}` (name, address, serial, zone, Norgespris, active) | Exists, no backend work |
| Admin lists every location | `GET /api/admin/locations` (with key facts and readers, but no users) | Exists, needs users + roles added |
| Admin links / unlinks a user | `PUT` / `DELETE /api/users/{id}/locations/{locationId}` | Exists, but a link has no role |
| Admin lists users with their locations | `GET /api/users` (`locations` names, `locationIds`) | Exists, needs the role per location |
| Owner edits own location | Nothing; all update endpoints are admin only | New endpoint |
| Edit a meter's comment | Nothing, even for admins (`POST /api/meters` and `GET` only) | New endpoint |
| A user's own locations | `GET /api/locations` returns active locations only, without serial, Norgespris, active flag or role | Needs extending (see 3) |

- **Decision**: Reuse the admin endpoints for everything an administrator does, and ask the backend for
  only what is genuinely missing: a role on the link, owner-side update, meter comment update, and
  richer read models. See [contracts/backend-required.md](./contracts/backend-required.md).
- **Alternatives considered**: Letting owners call the admin update endpoint. Rejected: it accepts
  system fields (serial, zone, Norgespris), so the "owners never change system fields" rule would
  rest on the UI alone, which the constitution (Principle V) forbids.

## 2. Roles on the link

- **Decision**: Add a `role` (`Owner` | `Viewer`) to the user-location link. `PUT
  /api/users/{id}/locations/{locationId}` takes an optional body `{ role }` that **defaults to
  `Owner`**, so the 001 admin flow ("add location for user") keeps working unchanged and creates owners.
- **Rationale**: Backward compatible; the new "add viewer" action is the only caller that sends a role.
- **Legacy data**: existing links have no role. The migration marks them all `Owner`. Some locations
  already have more than one linked user (for example one location linked to two users locally), so
  "exactly one owner" cannot be enforced retroactively. The rule is therefore **at least one owner**:
  several owners are allowed, and the backend refuses to remove or demote the *last* owner (`409`).
  Ownership is transferred by adding the new owner first and then demoting or removing the old one.
  An administrator can demote surplus legacy owners to viewer. "Exactly one" is the normal case, not
  an enforced invariant. (An earlier draft also refused a second owner; that made transfer impossible
  without a moment of having none, so it was dropped.)
- **Alternatives considered**: Picking the earliest link as owner. Rejected: links have no timestamp,
  so the choice would be arbitrary.

## 3. Reading your own locations (the "deactivated location" trap)

- **Finding**: `GET /api/locations` filters `IsActive`, and the update endpoint's own description says a
  deactivated location "is hidden from regular users". If an owner sets the active flag off, the
  location disappears from their own list and they can never switch it back on, which contradicts the
  spec's edge case.
- **Decision**: `GET /api/locations` returns, for each location, `isActive`, `role`, `serialNumber` and
  `hasNorgesPriceAgreement` in addition to today's fields, and includes **inactive locations for their
  owners** (viewers still see only active ones). The dashboard location picker filters inactive
  locations out on the client, so measurement views are unchanged. The My locations page shows an
  inactive location with an "Inactive" badge and a reactivate action.
- **Rationale**: One read model serves the edit form (read-only system fields), the role gating and
  the reactivate path; no second endpoint to keep in sync.
- **Alternatives considered**: A separate `GET /api/locations/mine/all`. Rejected: two list endpoints
  with overlapping meaning invite drift.

## 4. Owner edit endpoint

- **Decision**: `PUT /api/locations/{id}` with body `{ name, address, isActive }`, allowed for an owner of
  that location (and, harmlessly, administrators). It cannot carry system fields at all, so they cannot
  be sent by mistake. `404` when the caller is not an owner (same answer as a missing location, so
  viewers and strangers learn nothing), as `POST /api/meters` already does.
- **Rationale**: Enforces FR-006 on the server by shape, not by checking which fields changed.

## 5. Meter comment and meter registration

- **Decision**: New `PUT /api/meters/{id}` with body `{ comment }` for owners (and admins). Registering
  a new meter (`POST /api/meters`) becomes owner-only for non-admins; today any linked user can
  register one.
- **Rationale**: FR-007 says viewers get no edit action. Leaving meter registration open to viewers
  would let them change a location's data.

## 6. Viewer access

- **Decision**: Viewers keep today's read access: the existing measurement and cost endpoints already
  authorise by "linked to the location". No new read endpoint is needed; only the role check on writes
  is new.
- **Verified 2026-10-09**: every read handler the dashboard uses (`GetConsumption`, `GetCurrentHourCost`, `GetDailyCost`, `GetHourlyCost`, `GetLatestMeasurement`, `GetMeasurements`) authorises with `IsUserAssociatedAsync`, i.e. by link, not by ownership. Viewers therefore see usage and cost with no change. (Original check: confirm that every read endpoint the dashboard uses authorises
  by link, not by ownership, so viewers see usage and cost.

## 7. The 4-location limit

- **Decision**: `CountForUserAsync` counts **owner** links only (FR-015). Noted on API PR #12 on
  2026-10-09. Until roles exist the two counts are identical.
- **Frontend**: `hasReachedLocationLimit` must count only locations where `role === 'Owner'`.

## 8. Administrator screens

- **Decision**: Extend the existing **Users** page (it already lists every user with their locations)
  to show the role next to each location and to offer "Make viewer" / "Make owner" / "Remove". Add a
  new **Locations** page at `/admin/locations` listing every location with owner, viewer count and
  active status; opening a row shows a dialog to edit all fields (existing admin endpoint) and to
  manage who has access.
- **Rationale**: US3 asks for a users-with-locations overview, which the Users page already is; a new
  page would duplicate it. US4 is genuinely new.
- **Alternatives considered**: A single combined admin page with tabs. Rejected: the two lists have
  different primary keys and different actions.

## 9. Warning when deactivating

- **Decision**: A confirmation dialog on save when `isActive` changes from true to false, stating the
  consequence given by the API's own wording: the location stops accepting sensor readings and is hidden
  from its viewers. Activating needs no confirmation (spec edge case). The same dialog is used in the
  admin edit.

## 10. Error handling

- **Finding**: The API's error body for these endpoints does not carry the error `code` (the code is
  attached through FastEndpoints' `AddError` but the default response lists only messages), so
  `ApiError.code` is `Unknown`. Found during 001 while handling `Location.LimitReached`.
- **Decision**: The frontend distinguishes errors by HTTP status and shows the server's message; it
  never branches on `code`. `409` on update means serial number in use (admin) or last owner (link
  changes); the message says which.

## 11. Staging

- **Decision**: Build against the contract with MSW, behind a single `LOCATION_SHARING_ENABLED` constant
  in the locations slice, as in 001. Order of delivery: (1) administrator Locations page and edit, which
  works with today's API except the user/role columns; (2) roles and viewer management once the link
  role ships; (3) owner editing once `PUT /api/locations/{id}` and the extended `GET /api/locations`
  ship.
