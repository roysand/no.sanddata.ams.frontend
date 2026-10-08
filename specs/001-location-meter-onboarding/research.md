# Research: Location and Meter Onboarding

No `NEEDS CLARIFICATION` items remain in the spec. The decisions below come from reading the API
repository and the current frontend.

## 1. Who can create what (current API)

- **Decision**: Admin flow uses `POST /api/admin/locations` then `PUT /api/users/{id}/locations/{locationId}`;
  meters use `POST /api/meters`.
- **Rationale**: Verified in `Features/Locations/Endpoints/CreateLocationEndpoint.cs` (admin only),
  `Users/Endpoints/LinkUserLocationEndpoint.cs` (admin only, idempotent) and
  `Meters/Endpoints/CreateMeterEndpoint.cs` (admin, or user linked to an active location).
- **Finding**: `CreateLocationCommandHandler` does not link the creator, so the explicit link call is
  required for the admin flow, and the created location is not added to the admin's own list.
- **Alternatives considered**: Asking the backend to link on create for the admin flow too. Rejected:
  the explicit link keeps the admin API unchanged and makes "on behalf of" explicit.

## 2. Self-service location creation needs a backend change

- **Decision**: Request a new endpoint, `POST /api/locations`, that creates a location and links it to
  the caller in one step, and returns the same `{ location, apiKey }` payload.
- **Rationale**: No existing endpoint lets a non-admin create a location. Linking in the same
  transaction avoids the "created but not linked" state for normal users.
- **Alternatives considered**: (a) Letting users call the admin endpoints: rejected, would grant admin
  scope. (b) Frontend calls create, then link: rejected, link is admin-only.
- **Impact**: User Story 1 is blocked on this endpoint; User Stories 2–4 are not.

## 3. Showing the admin a user's locations for the meter step

- **Decision**: Use the `locations` (names) and `locationIds` already on `AdminUser`, paired by index,
  to offer the target location in `AddMeterDialog`.
- **Rationale**: Avoids an extra request. `/api/locations` returns the caller's own locations only
  (the admin users page already notes this), so it cannot be used for another user.
- **Risk**: Pairing by index assumes the API returns both lists in the same order. Verify in
  `GetUsersQuery`/`UserMapper`; if not guaranteed, request names with ids from the API or use
  `GET /api/admin/locations` and filter by `locationIds`. Recorded as a task to verify first.

## 4. Sensor key handling

- **Decision**: Keep the key in React state of the success step only. No `localStorage`, no query cache
  (mutation result is read once from `mutateAsync`, and the mutation is `reset()` on dismissal), no
  logging. Copy uses `navigator.clipboard.writeText` with a visible "Copied" state.
- **Rationale**: FR-006; the API returns the key only once.
- **Alternatives considered**: Offering download as a file: rejected as unnecessary for v1.

## 5. First-run guidance

- **Decision**: In `DashboardPage`, when the location list is empty, redirect to `/setup` instead of
  showing the "Ask an administrator" message. `/setup` resumes at the meter step if the user already
  has a location without meters.
- **Rationale**: FR-001b and Acceptance Scenario 4 of User Story 1.
- **Staging**: Until the backend endpoint exists the redirect is not enabled for non-admins; they keep
  the current message. (A single boolean constant in the slice, removed once the endpoint ships.)

## 6. Validation rules to mirror

- **Decision**: Name, address, serial number: required, max 100. Zone: one of NO1–NO5. Device id:
  required, max 100. Comment: optional, max 200. Taken from `CreateLocationValidator` and
  `CreateMeterValidator`. Comment these in `schema.ts` as "same rules as the API".

## 7. Testing approach

- **Decision**: MSW handlers per test for `POST /api/admin/locations`, `PUT .../locations/{id}`,
  `POST /api/meters`, `GET /api/locations`, covering success, 400, 409 and the "created but link
  failed" path. `renderWithQuery` from `src/test/render.tsx`.
