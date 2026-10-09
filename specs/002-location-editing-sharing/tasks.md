---

description: "Task list for Location Editing and Sharing"
---

# Tasks: Location Editing and Sharing

**Input**: Design documents from `/specs/002-location-editing-sharing/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Constitution Principle VII: new logic ships with Vitest + Testing Library + MSW tests, and `npm test`, `npm run build` and `npm run lint` must pass.

**Organization**: Grouped by user story. Story numbers follow spec.md (US1 owner edits, US2 admin shares, US3 users overview, US4 all-locations page). **Delivery order is set by what the backend can do today: US4 first (works with the current API), then US2 and US3 (need the link role and read models), then US1 (needs the owner endpoints).** US1 has the highest priority in the spec but is delivered last because it depends on the most backend work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md

## Path Conventions

Single frontend project: `src/` and tests beside the code as `*.test.ts(x)`; shared test helpers in `src/test/`. Slices import each other only through `index.ts`.

---

## Phase 1: Setup

- [ ] T001 Hand the backend contract to the API repository: create `specs/_backlog/location-roles-and-owner-edit.md` in `/c/shared/repo/private/ams/no.sanddata.ams.api` that points at `specs/002-location-editing-sharing/contracts/backend-required.md` in this repo and lists its six items (link role, owner update, read models, own-locations list, meters, limit and viewer reads). The API's CLAUDE.md says new features start from `specs/_backlog/`.
- [ ] T002 [P] Verify research item 6 in the API: confirm the measurement and cost endpoints used by the dashboard authorise by link to the location, not by ownership, so a viewer sees usage and cost. Record the result in `specs/002-location-editing-sharing/research.md` (item 6) and, if any endpoint is owner-only, add it to `contracts/backend-required.md`.

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: shared types, rules and the feature flag. No user-facing change yet.

- [ ] T003 Update `src/features/locations/types.ts`: add `LocationRole = 'Owner' | 'Viewer'`; extend `LocationSummary` with `serialNumber: string`, `hasNorgesPriceAgreement: boolean`, `isActive: boolean`, `role: LocationRole` (per data-model.md); add `LocationUser { userId, email, firstName, lastName, role }`.
- [ ] T004 In `src/features/locations/api.ts` `getLocations`, normalise the known API gap until the backend ships: when `role` is missing default it to `'Owner'`, when `isActive` is missing default it to `true` (Principle II: normalise in `api.ts`, not in components). Add a comment saying this is removed once `backend-required.md` item 4 is deployed. Add a test in `src/features/locations/api.test.ts` with MSW for both the old and the extended response.
- [ ] T005 [P] Create `src/features/locations/access.ts` with `canEdit(location)` (`location.role === 'Owner'`) and `ownedLocations(locations)`; comment that this is UX only and the API enforces it (Principle V). Write `src/features/locations/access.test.ts` (owner true, viewer false, `ownedLocations` filters viewers).
- [ ] T006 [P] Add to `src/features/locations/schema.ts`: `ownerLocationSchema` with `name` required max 100, `address` required max 100, `isActive` boolean; and `meterCommentSchema` with `comment` optional max 200. Comment both as "same rules as the API" (`UpdateLocationValidator`, meter comment). Extend `src/features/locations/schema.test.ts` for each rule (accepts valid, rejects empty and over-length values, comment length 200 vs 201).
- [ ] T007 [P] Add the constant `LOCATION_SHARING_ENABLED = true` with a comment to `src/features/locations/index.ts`, exported next to `SELF_SERVICE_ENABLED`. It gates the new admin nav item, the admin Locations route and the owner Edit actions, so the frontend can merge before the backend ships. Add a note that it is removed once the backend is deployed.
- [ ] T008 [P] Create `src/features/locations/ConfirmDeactivateDialog.tsx`: shadcn `Dialog` with props `open`, `onConfirm`, `onCancel`; text states the consequence from the API ("the location stops accepting sensor readings and is hidden from its viewers") with buttons "Deactivate" and "Keep active". Write `ConfirmDeactivateDialog.test.tsx` (confirm calls `onConfirm`, cancel calls `onCancel`, warning text shown).
- [ ] T009 Extend `src/features/locations/LocationForm.tsx` with an optional `defaultValues?: Partial<LocationFormValues>` prop (used by edit; create keeps today's defaults) and an optional `submitLabel`. Extend `LocationForm.test.tsx`: renders given default values, submits edited values.
- [ ] T010 Export the new pieces from `src/features/locations/index.ts`: `LocationRole`, `LocationUser`, `canEdit`, `ownedLocations`, `ownerLocationSchema`, `meterCommentSchema`, `ConfirmDeactivateDialog`, `LOCATION_SHARING_ENABLED`.

**Checkpoint**: `npm test`, `npm run build`, `npm run lint` pass; existing pages behave as before.

---

## Phase 3: User Story 4 - Administrator sees and edits all locations (Priority: P2, delivered first)

**Goal**: A new admin menu item lists every location (name, address, owner, viewer count, active status); the administrator opens one to edit every field.

**Independent Test**: As admin, open Locations, change a location's price zone and save; change a serial number to one in use and see a specific message with the values kept.

- [ ] T011 [US4] In `src/features/admin/types.ts` add `AdminLocation` (id, name, address, serialNumber, zone, isActive, hasNorgesPriceAgreement, apiKey `{ description, hint, isActive, expiresAt, status }`, meters, and `users?: LocationUser[]`, optional until `backend-required.md` item 3 ships). In `src/features/admin/api.ts` add `getAdminLocations()` (`GET /api/admin/locations`) and `updateLocationAsAdmin(id, input)` (`PUT /api/admin/locations/{id}` with body `{ id, name, address, serialNumber, zone, hasNorgesPriceAgreement, isActive }`).
- [ ] T012 [US4] In `src/features/admin/hooks.ts` add `useAdminLocations()` (key `['admin','locations']`) and `useUpdateLocationAsAdmin()` that invalidates `['admin','locations']`, `['locations']` and `['admin','users']` on success.
- [ ] T013 [US4] Create `src/features/admin/AdminLocationDialog.tsx`: `LocationForm` with `defaultValues` from the chosen location and submit label "Save"; read-only block with the sensor key's hint, status and expiry (never the key); when `isActive` goes from true to false show `ConfirmDeactivateDialog` before sending; show field errors and the server message with `toFormServerError` (fields `name,address,serialNumber,zone`), keep entered values on error; block submit while pending.
- [ ] T014 [US4] Create `src/features/admin/AdminLocationsPage.tsx`: a table of all locations with name, address, owner (the `users` entry with role `Owner`, or "-" when `users` is absent), viewer count, and an Active/Inactive badge; a text filter on name and address; clicking a row opens `AdminLocationDialog`; loading, error and empty states as on `UsersPage`.
- [ ] T015 [US4] Register `/admin/locations` under `AdminRoute` in `src/app/routes.tsx` and add the admin nav item `{ to: '/admin/locations', label: 'Locations' }` in `src/components/Header.tsx`, both only when `LOCATION_SHARING_ENABLED`.
- [ ] T016 [P] [US4] Write `src/features/admin/AdminLocationsPage.test.tsx` with MSW: lists all locations with status; filter narrows the list; changing the zone sends `PUT /api/admin/locations/{id}` with the expected body and refreshes the list; a `409` shows the server message and keeps the values; deactivating asks for confirmation (cancel sends nothing); a non-admin is redirected (extend `src/components/AdminRoute.test.tsx` with the Locations link visible only to administrators).

**Checkpoint**: US4 works against today's API (owner and viewer count show "-" until the read model ships).

---

## Phase 4: User Story 2 - Administrator shares a location with other users (Priority: P2)

**Goal**: The administrator adds other users as viewers of a location and removes them again; viewers see the location and its data but cannot edit.

**Independent Test**: Add a second user as viewer; sign in as that user and see the location in the picker with its charts, and no edit actions; remove the viewer and the location is gone after a refresh.

- [ ] T017 [US2] Change `setLocationLink` in `src/features/admin/api.ts` to `setLocationLink(userId, locationId, linked, role?)`: when linking and `role` is given send body `{ role }` (`'Owner' | 'Viewer'`), otherwise send no body so the backend default (`Owner`) applies and the 001 flow is unchanged. Update `useUserActions.link` in `hooks.ts` to accept the role and also invalidate `['admin','locations']`.
- [ ] T018 [US2] Create `src/features/admin/LocationAccessList.tsx` used inside `AdminLocationDialog`: lists the location's users with their role; a user picker (search by name or email using `useUsers` with the existing search, excluding users already linked so a duplicate cannot be added) with an "Add as viewer" action; per-row "Make owner", "Make viewer" and "Remove" actions; show the server's message on a refused change (for example `409` when removing or demoting the last owner) above the list.
- [ ] T019 [US2] Render `LocationAccessList` in `src/features/admin/AdminLocationDialog.tsx` and show the viewer count and owner in `AdminLocationsPage` from `users`.
- [ ] T020 [P] [US2] Write `src/features/admin/LocationAccessList.test.tsx` with MSW: adding a viewer sends `PUT /api/users/{id}/locations/{locationId}` with body `{ role: 'Viewer' }`; users already linked are not offered; removing sends `DELETE`; changing role sends the new role; a `409` shows the server message and the list is unchanged; owner and viewers are listed with roles.
- [ ] T021 [US2] In `src/features/locations/LocationsPage.tsx` show a role badge on each location and render "Add meter" only when `canEdit(location)`; a viewer's card shows no action buttons. Add the cases to a new `src/features/locations/LocationsPage.test.tsx`: viewer sees no Add meter or Edit, owner does, and the viewer location appears in the list.
- [ ] T022 [P] [US2] Add a test in `src/features/dashboard/DashboardPage.test.tsx`: a shared (viewer) location is offered in the location picker and its name is shown, as for an owned location.

**Checkpoint**: sharing works end to end once the backend link role is deployed.

---

## Phase 5: User Story 3 - Administrator sees all users and their locations (Priority: P2)

**Goal**: The Users page shows, for each user, their locations with the role, including users with none; the administrator can change roles from there.

**Independent Test**: Open Users; every user is listed with each location and its role; a user with no locations shows an add action; search narrows by name or email.

- [ ] T023 [US3] In `src/features/admin/types.ts` add `locationAccess?: { locationId: string; name: string; role: LocationRole }[]` to `AdminUser`. In `getUsers` (`api.ts`) normalise a response without it to the legacy pairing of `locations` and `locationIds` with `role: null`, so the page shows names without a role badge until the backend ships. Keep `locations` and `locationIds` for compatibility (data-model.md).
- [ ] T024 [US3] Update `src/features/admin/locationOptions.ts` and `src/features/admin/UsersPage.tsx` to render each location with a role badge (Owner or Viewer; no badge when the role is unknown), and add per-location row actions "Make owner", "Make viewer" and "Remove" that call `setLocationLink` / unlink and show the server's message when refused (the page already has an error banner). Users with no locations stay listed with "Add location" (existing). Search by name or email already exists; keep it.
- [ ] T025 [P] [US3] Extend `src/features/admin/UsersPage.test.tsx` and `src/features/admin/locationOptions.test.ts`: roles shown next to locations; no badge for legacy responses; "Make viewer" sends `PUT` with `{ role: 'Viewer' }`; a `409` on removing the last owner shows the message; a user with no locations is still listed.

**Checkpoint**: US2 and US3 complete the administrator side.

---

## Phase 6: User Story 1 - An owner edits their location (Priority: P1, delivered last)

**Goal**: An owner changes the name, address and active flag of their location and the comment of its meters; system fields are visible but not editable; deactivating warns first.

**Independent Test**: Sign in as an owner, change name and address, see them everywhere without a reload; untick Active and see the warning; confirm, and the location stays on My locations as inactive and can be activated again.

- [ ] T026 [US1] Add to `src/features/locations/api.ts`: `updateOwnLocation(id, { name, address, isActive })` → `api.put<LocationSummary>('/api/locations/{id}', body)` and `updateMeterComment(id, comment)` → `api.put<Meter>('/api/meters/{id}', { comment })`. Add `useUpdateOwnLocation` and `useUpdateMeterComment` to `hooks.ts`, each invalidating `['locations']` and `['admin','locations']`.
- [ ] T027 [US1] Create `src/features/locations/EditLocationDialog.tsx`: form for `name`, `address` (both required, max 100) and an Active checkbox using `ownerLocationSchema`; the location's serial number, price zone and Norgespris agreement shown as read-only text (never inputs, no sensor key); turning Active off asks `ConfirmDeactivateDialog` before saving, turning it on does not; field errors via `toFormServerError`; a `404` shows "You can no longer edit this location" and closes after refetch; submit blocked while pending. The request body contains only `name`, `address` and `isActive`.
- [ ] T028 [P] [US1] Create `src/features/locations/EditMeterCommentDialog.tsx`: single field `comment` (optional, max 200) using `meterCommentSchema`, same error handling.
- [ ] T029 [US1] In `src/features/locations/LocationsPage.tsx` add "Edit" per location and "Edit comment" per meter, both shown only when `canEdit(location)` and `LOCATION_SHARING_ENABLED`; show an "Inactive" badge on inactive locations (owners receive them, `backend-required.md` item 4).
- [ ] T030 [US1] In `src/features/dashboard/DashboardPage.tsx` use only active locations for the picker and the selected location (`isActive !== false`). When the user has locations but none is active, show "All your locations are inactive. Activate one under My locations." with a link, and do not redirect to `/setup` (the redirect is only for users with no locations at all).
- [ ] T031 [US1] Make the limit and the wizard owner-aware: `LocationsPage` and `SetupWizard` compute `hasReachedLocationLimit(ownedLocations(locations).length)`, and `SetupWizard`'s `initialStep` considers only owned locations (a shared location without meters must not send a viewer to the meter step). Add a test for each in `LocationsPage.test.tsx` and `SetupWizard.test.tsx` (4 viewer locations do not hit the limit; a viewer location without meters does not trigger the meter step).
- [ ] T032 [P] [US1] Write `src/features/locations/EditLocationDialog.test.tsx` with MSW: saving sends only `name`, `address`, `isActive` (assert the request body has no `serialNumber`, `zone` or `hasNorgesPriceAgreement`); serial number and zone are text, not inputs; validation errors for empty and 101-character values; deactivating shows the warning, cancel sends nothing, confirm sends `isActive: false`; reactivating shows no warning; a `404` shows the not-allowed message.
- [ ] T033 [P] [US1] Write `src/features/locations/EditMeterCommentDialog.test.tsx` (saves the comment, rejects 201 characters, shows the server message) and extend `LocationsPage.test.tsx` (owner sees Edit and Edit comment, an inactive location shows its badge and Edit, viewer sees neither).
- [ ] T034 [P] [US1] Extend `src/features/dashboard/DashboardPage.test.tsx`: inactive locations are not in the picker; a user whose locations are all inactive sees the message and is not redirected to `/setup`.

**Checkpoint**: the owner experience works once the backend owner endpoints are deployed.

---

## Phase 7: Polish and cross-cutting

- [ ] T035 [P] Update `README.md` project structure for the new admin Locations page and the owner dialogs under `locations/`.
- [ ] T036 [P] Update the cross-reference in `specs/001-location-meter-onboarding/spec.md` (Assumptions: "Editing or deleting locations and meters is out of scope") to say editing is covered by feature 002 and deleting remains out of scope.
- [ ] T037 Run `npm test`, `npm run build`, `npm run lint`; fix any failures.
- [ ] T038 Walk through `specs/002-location-editing-sharing/quickstart.md` against the local API (admin part with today's API, owner and viewer parts once the backend is deployed), using a throwaway local database as in feature 001, and note the result in the PR description.
- [ ] T039 Confirm no system field or sensor key can reach the owner screens: search `src/features/locations/EditLocationDialog.tsx` and the owner API calls for `serialNumber`, `zone`, `hasNorgesPriceAgreement` and `apiKey` in request bodies and form inputs, and check one owner request in the browser network tab.
- [ ] T040 When the backend is deployed: set `LOCATION_SHARING_ENABLED` handling to permanent (remove the constant and its uses) and remove the normalisation shims from T004 and T023 (`role` default, `isActive` default, legacy `locationAccess` pairing).

---

## Dependencies and execution order

- **Phase 1** (T001, T002): no code dependency; T001 should happen first so the API work can start in parallel.
- **Phase 2** (T003-T010): blocks every story. T005, T006, T007, T008 can run in parallel after T003; T009 after T008 only for the shared dialog's use, otherwise independent.
- **US4** (T011-T016) needs Phase 2. Works with the current API.
- **US2** (T017-T022) needs US4's `AdminLocationDialog` (T013) for the access list; T021 and T022 are independent of it.
- **US3** (T023-T025) needs Phase 2 and T017 (`setLocationLink` with a role); it does not need US4.
- **US1** (T026-T034) needs Phase 2; T027 needs T008 and T009; T029 needs T027 and T028; T030 and T031 are independent of each other.
- **Polish** (T035-T040) after the stories; T040 only after the backend is deployed.

Backend dependencies (see `contracts/backend-required.md`): US4 none beyond today; US2 and US3 need items 1 and 3; US1 needs items 2, 4 and 5; T031's owner-only count also needs item 6.

### Parallel opportunities

- Phase 2: T005, T006, T007, T008 together.
- US4: T016 (tests) alongside T014 once T011-T013 exist.
- US2 and US3 can be built by different people after Phase 2 and T017.
- US1: T028, T032, T033, T034 in parallel once T027 exists.

## Implementation strategy

1. **First release (frontend only, current API)**: Phase 2 and US4. Administrators get the all-locations page and can edit every field.
2. **Second release (needs backend items 1 and 3)**: US2 and US3: roles, viewers, the role-aware Users page.
3. **Third release (needs backend items 2, 4, 5, 6)**: US1: owners edit their own locations and meter comments, inactive locations stay visible to owners, the limit counts owners only.
4. Merge each release behind `LOCATION_SHARING_ENABLED`; remove the flag and shims in T040 once the backend is deployed.
