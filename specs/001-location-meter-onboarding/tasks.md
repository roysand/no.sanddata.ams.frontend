---

description: "Task list for Location and Meter Onboarding"
---

# Tasks: Location and Meter Onboarding

**Input**: Design documents from `/specs/001-location-meter-onboarding/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. Constitution Principle VII: new logic ships with Vitest + Testing Library + MSW tests, and `npm test`, `npm run build` and `npm run lint` must pass.

**Organization**: Grouped by user story. Delivery order (set by the team): **US2 and US3 (admin) first, then US4 (feedback polish), then US1 (self-service) once the backend endpoint exists.** Story numbers follow spec.md.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US4 from spec.md

## Path Conventions

Single frontend project: `src/` and tests beside the code as `*.test.ts(x)`; shared test helpers in `src/test/`.

---

## Phase 1: Setup

- [X] T001 Verify that the API returns `AdminUser.locations` (names) and `locationIds` in the same order. Result: both are built from the same `user.Locations` collection in the API's `Features/Users/Mappers/UserMapper.cs` (lines 56-57), so the order matches; not an explicit sort. Recorded in `specs/001-location-meter-onboarding/research.md` item 3.
- [X] T002 Track the backend dependency: confirm `specs/_backlog/user-creates-own-location.md` and the CLAUDE.md "Starting a New Feature" note exist in the API repo (`/Users/roysand/develop/repo/ams/no.sanddata.ams.api`) and are committed on a branch there.

---

## Phase 2: Foundational (blocks all stories)

**Purpose**: the shared `features/locations/` slice. No user-facing change yet.

- [X] T003 Create `src/features/locations/types.ts` with `LocationSummary` and `MeterSummary` moved from `src/features/dashboard/types.ts`, plus `LocationInput`, `CreatedLocation` (`{ location, apiKey }`), `MeterInput` and `Meter` exactly as in `specs/001-location-meter-onboarding/data-model.md`; leave a re-export in `src/features/dashboard/types.ts` so nothing breaks.
- [X] T004 [P] Create `src/features/locations/schema.ts` with Zod `locationSchema` and `meterSchema`. Constraints verbatim: name, address, serialNumber required, max 100; zone one of `NO1,NO2,NO3,NO4,NO5`; hasNorgesPriceAgreement default `false`; isActive default `true`; deviceId required, max 100; comment optional, max 200. Comment that the rules mirror `CreateLocationValidator` and `CreateMeterValidator` in the API.
- [X] T005 [P] Write `src/features/locations/schema.test.ts` covering each rule above (accepts valid, rejects empty and over-length values, rejects zone `NO6`, comment length 200 vs 201).
- [X] T006 Create `src/features/locations/api.ts`: move `getLocations` from `src/features/dashboard/api.ts`; add `createLocationAsAdmin(input)` → `api.post<CreatedLocation>('/api/admin/locations', input)` and `createMeter(input)` → `api.post<Meter>('/api/meters', input)`.
- [X] T007 Create `src/features/locations/hooks.ts`: move `useLocations` (key `['locations']`) from `src/features/dashboard/hooks.ts`; add `useCreateMeter` that invalidates `['locations']` and `['admin','users']` on success.
- [X] T008 Create `src/features/locations/index.ts` exporting only the public surface (types, hooks, forms, `SensorKeyNotice`); update imports in `src/features/dashboard/*` and `src/features/admin/UsersPage.tsx` to use `@/features/locations`.
- [X] T009 [P] Create `src/features/locations/SensorKeyNotice.tsx`: shows the key in a read-only box, a "Copy" button using `navigator.clipboard.writeText` with a visible "Copied" state, and a prominent warning "This key is shown only once. If you lose it, an administrator must generate a new one." No storage, logging or URL use of the key.
- [X] T010 [P] Write `src/features/locations/SensorKeyNotice.test.tsx`: key displayed, copy button writes to the clipboard and shows "Copied", warning text present.
- [X] T011 [P] Create `src/features/locations/LocationForm.tsx` (React Hook Form + `locationSchema` via `zodResolver`, shadcn `Input`/`Label`/`Select`/`Checkbox`; props: `onSubmit(values)`, `submitLabel`, `serverError`, `isSubmitting`; keeps entered values when `serverError` changes).
- [X] T012 [P] Create `src/features/locations/MeterForm.tsx` (same pattern with `meterSchema`; props also take `locations: {id, name}[]` to choose the location, preselected when there is one).
- [X] T013 [P] Write `src/features/locations/LocationForm.test.tsx` and `src/features/locations/MeterForm.test.tsx`: field errors before submit, valid submit calls `onSubmit`, values retained after a `serverError`.

**Checkpoint**: `npm test`, `npm run build`, `npm run lint` pass; dashboard and admin pages behave as before.

---

## Phase 3: User Story 2 - Administrator adds a location for any user (Priority: P2, delivered first)

**Goal**: Admin adds a location to any existing user (e.g. `roy@sanddata.no`); it is linked to that user; key shown once.

**Independent Test**: As admin, add a location to a user with none; the users table lists it; sign in as that user and see it in the location picker.

- [ ] T014 [US2] Add `createLocationForUser(userId, input)` to `src/features/admin/api.ts`: call `createLocationAsAdmin` (T006), then `setLocationLink(userId, location.id, true)`. If the link call fails, throw a `LocationNotLinkedError` carrying the created `CreatedLocation` so the UI can retry only the link (FR-012).
- [ ] T015 [US2] Add `create location` mutation and a `retryLink` mutation to `useUserActions()` in `src/features/admin/hooks.ts`; both invalidate `['admin','users']` and `['locations']`.
- [ ] T016 [US2] Create `src/features/admin/AddLocationDialog.tsx`: dialog containing `LocationForm`; on success replaces the form with `SensorKeyNotice` (key kept in component state only, cleared on close); on `LocationNotLinkedError` shows "Location created, but not linked to this user" with a Retry button that calls `retryLink`; submit disabled while pending (FR-011).
- [ ] T017 [US2] Add an "Add location" item to the row actions menu in `src/features/admin/UsersPage.tsx` (existing `DropdownMenu`) and a `{ kind: 'addLocation'; user }` case to `DialogState`.
- [ ] T018 [US2] Write `src/features/admin/AddLocationDialog.test.tsx` with MSW: success shows key once and list refresh; closing hides the key; 409 duplicate serial shows message and keeps values; link failure shows retry and does not create a second location.
- [ ] T019 [US2] Write a test in `src/features/admin/UsersPage.test.tsx` that the "Add location" action is offered for a user with no locations (MSW `GET /api/users`, `GET /api/locations`).

**Checkpoint**: Quickstart "admin on behalf of a user" steps 1-3 and 7 pass.

---

## Phase 4: User Story 3 - Administrator adds a meter to a user's location (Priority: P2)

**Goal**: Admin registers a meter at one of the user's locations.

**Independent Test**: Register a meter on a location with none; repeat the same device id and see the duplicate message.

- [ ] T020 [US3] Add a helper `userLocationOptions(user: AdminUser)` in `src/features/admin/locationOptions.ts` that pairs `user.locationIds[i]` with `user.locations[i]` (comment: relies on the API building both from the same collection, verified in T001) and `src/features/admin/locationOptions.test.ts` pinning the pairing.
- [ ] T021 [US3] Create `src/features/admin/AddMeterDialog.tsx`: dialog containing `MeterForm` with `userLocationOptions(user)`; calls `useCreateMeter`; shows a confirmation on success; maps 409 to "A reader with this device id is already registered at this location".
- [ ] T022 [US3] Add an "Add meter" item to the row actions in `src/features/admin/UsersPage.tsx`, hidden (or disabled with an explanation) when the user has no locations (FR-008); add `{ kind: 'addMeter'; user }` to `DialogState`.
- [ ] T023 [US3] Write `src/features/admin/AddMeterDialog.test.tsx` with MSW: success confirmation; 409 message; not offered when the user has no locations; location choice limited to the user's locations.

**Checkpoint**: Quickstart "admin" steps 4-5 pass.

---

## Phase 5: User Story 4 - Clear feedback when something is rejected (Priority: P3)

**Goal**: Rejections show their reason next to the form without losing input.

**Independent Test**: Duplicate serial number shows a specific message and values remain.

- [ ] T024 [US4] Map API validation errors to form fields: in `src/features/locations/LocationForm.tsx` and `MeterForm.tsx`, when `ApiError` has field-keyed `errors`, call `setError` for matching fields, otherwise show the message above the submit button (see `extractErrorMessage` in `src/lib/apiClient.ts`).
- [ ] T025 [US4] Handle 401 during a submit by letting `apiClient`'s refresh/sign-out flow run and keeping the form values; add a test in `src/features/locations/LocationForm.test.tsx`.
- [ ] T026 [P] [US4] Add tests in `src/features/admin/AddLocationDialog.test.tsx` for a 400 with field errors (shown on the fields) and a 400 with a generic message.
- [ ] T027 [US4] Guard against double submission in both dialogs (button disabled and `isSubmitting` respected); test that two rapid clicks send one request.

**Checkpoint**: Spec Acceptance Scenarios for US4 pass.

---

## Phase 6: User Story 1 - A user sets up their own location and meter (Priority: P1, BLOCKED on backend)

**Goal**: A signed-in user with no locations is guided through location then meter; the location belongs to them.

**Independent Test**: Sign in as a user with no locations, complete the wizard, see the location in the dashboard picker.

- [ ] T028 [US1] **BLOCKER (API repo)**: implemented on API branch `feature/005-user-creates-own-location` (limit of 4 included); still needs merge and deploy. Original task: implement `POST /api/locations` per `specs/001-location-meter-onboarding/contracts/backend-required.md` and `/Users/roysand/develop/repo/ams/no.sanddata.ams.api/specs/_backlog/user-creates-own-location.md` (create + link caller in one transaction, `201 { location, apiKey }`, 400/401/409). Deploy it to the environment the frontend calls. **Do not start T029-T036 until this is deployed.**
- [ ] T029a [US1] Handle the limit: in `src/features/locations/LocationsPage.tsx` and `SetupWizard.tsx` disable "Add location" when the user already has 4 locations and show "You have the maximum of 4 locations. Ask an administrator to add more."; also map a `409` with code `Location.LimitReached` from `createOwnLocation` to that message (FR-013). Add the constant `MAX_OWN_LOCATIONS = 4` in `src/features/locations/schema.ts` with a comment that it mirrors the API.
- [ ] T029 [US1] Add `createOwnLocation(input)` → `api.post<CreatedLocation>('/api/locations', input)` to `src/features/locations/api.ts` and a `useCreateOwnLocation` hook in `src/features/locations/hooks.ts` that invalidates `['locations']`.
- [ ] T030 [US1] Create `src/features/locations/SetupWizard.tsx`: step 1 `LocationForm` → `SensorKeyNotice` (user must acknowledge before continuing) → step 2 `MeterForm` for the new location → done screen with a link to the dashboard. Start at step 2 when the user already has a location with no meters (resume, Acceptance Scenario 4).
- [ ] T031 [US1] Create `src/features/locations/SetupPage.tsx` and `src/features/locations/LocationsPage.tsx` (own locations with meters; "Add location" and "Add meter" actions using the same forms); export from `src/features/locations/index.ts`.
- [ ] T032 [US1] Register `/setup` and `/locations` under `ProtectedRoute` (not `AdminRoute`) in `src/app/routes.tsx`; add a "My locations" link in `src/components/Header.tsx`.
- [ ] T033 [US1] In `src/features/dashboard/DashboardPage.tsx` replace the "Ask an administrator" empty state with `<Navigate to="/setup" replace />` (FR-001b), controlled by one constant `SELF_SERVICE_ENABLED` in `src/features/locations/index.ts` so it can ship dark until T028 is deployed.
- [ ] T034 [US1] Write `src/features/locations/SetupWizard.test.tsx` with MSW: full happy path; resume at meter step; leaving after step 1 and returning does not create the location twice; 409 duplicate serial shows a message.
- [ ] T035 [US1] Write a test in `src/features/dashboard/DashboardPage.test.tsx`: empty location list redirects to `/setup` when `SELF_SERVICE_ENABLED` is true, and shows the old message when false.
- [ ] T036 [US1] Write a test that a non-admin cannot see "Add location for user"/"Add meter for user" actions and `/admin/users` redirects them (extends `src/components/AdminRoute` coverage in `src/components/AdminRoute.test.tsx`).

**Checkpoint**: Quickstart "user sets up their own location" steps 1-4 pass against the real API.

---

## Phase 7: Polish and cross-cutting

- [ ] T037 [P] Update `README.md`: project structure (add `locations/`, remove the stale `measurements/` entry), remove the outdated CORS note, mention the dev proxy and `npm test`.
- [ ] T038 Run `npm test`, `npm run build`, `npm run lint`; fix any failures.
- [ ] T039 Walk through `specs/001-location-meter-onboarding/quickstart.md` against the real API (admin section now; self-service section after T028) and note the result in the PR description.
- [ ] T040 Confirm the sensor key never reaches storage or logs: grep `src/` for `localStorage`/`console` uses near `apiKey`, and check the browser Application tab after a run (FR-006).

---

## Dependencies and execution order

```text
Phase 1 (Setup) -> Phase 2 (Foundational) -> Phase 3 (US2) -> Phase 4 (US3) -> Phase 5 (US4)
                                                                               \
Phase 6 (US1) requires Phase 2 + T028 (backend deployed); can start in parallel with Phases 3-5 only for T029-T032 once T028 is done.
Phase 7 (Polish) after the stories you ship.
```

- US3 reuses the admin row-action pattern from US2 (T017) but is independently testable.
- US4 (T024-T027) refines forms from Phase 2 and dialogs from US2/US3.
- T033 stays behind `SELF_SERVICE_ENABLED` until T028 is deployed.

### Parallel opportunities

- Phase 2: T004, T005, T009, T010, T011, T012, T013 touch different files.
- After Phase 2: T020 (US3 helper) can run while US2 dialogs are built.
- T037 (README) any time.

## Implementation strategy

1. **First release (admin flow)**: Phases 1-2, then US2 and US3, then US4. This onboards `roy@sanddata.no` and any other user from the admin page using today's API.
2. **Second release (self-service)**: when T028 is deployed, complete US1 and enable `SELF_SERVICE_ENABLED`.
3. MVP for the real need today is Phases 1-4.
