# Feature Specification: Location and Meter Onboarding

**Feature Branch**: `feature/admin-location-meter-onboarding`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Onboarding of locations and meters. A normal user creates locations and meters that belong to themselves; an administrator can do the same on behalf of any existing user (including users created by migration such as roy@sanddata.no). The sensor key is shown once."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A user sets up their own location and meter (Priority: P1)

A signed-in user with no location (for example `roy@sanddata.no`, created by a migration) is guided through a short setup: first add a location (name, address, serial number, price zone, optional Norgespris agreement), then register a meter for it (device identifier and optional comment). The location belongs to that user. The sensor key is displayed once, with a copy button and a clear warning. A user who already has locations can run the same steps again from their own locations view to add more.

**Why this priority**: This is how every user gets data into the system; it is the primary onboarding path.

**Independent Test**: Sign in as a user with no locations, complete the setup, and confirm the location appears in the dashboard location picker and the sensor key was shown once.

**Acceptance Scenarios**:

1. **Given** a signed-in user with no locations, **When** they open the app, **Then** they are guided into the setup instead of an empty dashboard.
2. **Given** the user submits a valid location, **When** it is saved, **Then** it belongs to that user, appears in their locations without a reload, and the sensor key is shown once with a warning.
3. **Given** the location exists, **When** the user registers a meter with a valid device identifier, **Then** the meter is registered for that location and the user sees a confirmation.
4. **Given** the user leaves the setup after creating the location but before adding a meter, **When** they return, **Then** they can add the meter later from their location without creating the location again.
5. **Given** a user cannot see other users' locations, **When** they use the setup, **Then** they can only create and register against their own locations.

---

### User Story 2 - An administrator adds a location for any user (Priority: P2)

An administrator helps a user who cannot or has not set things up themselves. They open the users page, pick any existing user (for example `roy@sanddata.no`) and choose to add a location for them. The administrator enters the location's name, address, serial number and price zone, and optionally marks it as having a Norgespris agreement and sets whether it is active. After saving, the location exists, is linked to that user and appears in the user's locations. The sensor key for the location is displayed once, with a copy button and a clear warning that it cannot be shown again.

**Why this priority**: Without a location, a user has no data to see. This is the step that unblocks onboarding the one production user today and every user after.

**Independent Test**: As an administrator, add a location for another user who has none, and confirm the location is listed for that user, the dashboard location picker offers it when signed in as that user, and the sensor key was displayed.

**Acceptance Scenarios**:

1. **Given** an administrator viewing a user with no locations, **When** they submit a valid location, **Then** the location is created, linked to that user and shown in the user's locations list without a manual page reload.
2. **Given** a location was just created, **When** the confirmation appears, **Then** the sensor key is visible with a copy button and a warning that it will not be shown again.
3. **Given** the administrator has copied the key and closes the confirmation, **When** they look at the user again, **Then** the key is no longer displayed anywhere.
4. **Given** a user who already has locations, **When** the administrator adds another, **Then** the existing locations are unchanged and the new one is added.

---

### User Story 3 - An administrator adds a meter to a user's location (Priority: P2)

An administrator selects one of a user's locations and registers a meter (reader) for it by entering its device identifier (for example a MAC address) and an optional comment. After saving, the meter is registered for that location and the administrator sees confirmation.

**Why this priority**: A location only produces data once a meter is registered, but a location can exist (P1) before its meter is installed.

**Independent Test**: As an administrator, register a meter on a location that has none and confirm it is accepted and confirmed; repeat the same device on the same location and confirm a clear duplicate message.

**Acceptance Scenarios**:

1. **Given** a user with at least one location, **When** the administrator registers a meter with a valid device identifier, **Then** the meter is registered for that location and the administrator sees a confirmation.
2. **Given** a meter with that device identifier is already registered for the location, **When** the administrator registers it again, **Then** they see a clear message that it already exists and nothing is duplicated.
3. **Given** a user with no locations, **When** the administrator views that user, **Then** adding a meter is not offered until a location exists (adding a location is offered instead).

---

### User Story 4 - Clear feedback when something is rejected (Priority: P3)

When the system rejects a location or meter (invalid input, or a location serial number already in use), the administrator sees the reason next to the form and can correct and resubmit without losing what they typed.

**Why this priority**: Improves the experience of P1 and P2 but they are usable without polished messages.

**Independent Test**: Submit a location with a serial number already used by another location and confirm a specific message is shown and the entered values remain.

**Acceptance Scenarios**:

1. **Given** a form with invalid values, **When** the administrator submits, **Then** each problem is shown against the field it relates to before anything is sent, where the rule is known in advance.
2. **Given** the system rejects the request, **When** the response arrives, **Then** its reason is shown and the form stays open with the entered values.

---

### Edge Cases

- A user such as `roy@sanddata.no` who was created by a migration has no locations: the page must still offer to add one.
- The administrator is adding a location to a user other than themselves: the new location is linked to the chosen user, not to the administrator.
- The sensor key is lost (dialog closed before copying): it cannot be recovered here; the administrator is told a replacement key can be generated by rotating the key. Rotating keys is outside this feature.
- Double submission (double click on save) must not create two locations.
- A location serial number is already used by another location.
- The price zone is not one of the five valid Norwegian zones (NO1–NO5): it cannot be chosen.
- The session expires while the form is open: the administrator is returned to sign-in as elsewhere in the app, not shown a raw error.
- The location was created but linking it to the user failed: the administrator is told the location exists but is not yet linked, and can retry linking without creating a duplicate.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Any signed-in user MUST be able to add a location that belongs to themselves.
- **FR-001a**: Administrators MUST additionally be able to start adding a location from the users page for any existing user, regardless of how that user was created. The location belongs to the chosen user, not the administrator.
- **FR-001b**: A signed-in user with no locations MUST be guided into the setup (location, then meter) when they open the app.
- **FR-002**: The location form MUST collect name, address, serial number and price zone (NO1–NO5), and optionally whether the location has a Norgespris agreement and whether it is active (active by default).
- **FR-003**: The system MUST apply the same length and required-field rules as the backend (name, address and serial number required; at most 100 characters each) before submitting.
- **FR-004**: On success, the new location MUST be linked to the chosen user and shown in that user's locations without a manual reload.
- **FR-005**: The sensor key returned for a new location MUST be shown exactly once, with a copy-to-clipboard control and a prominent warning that it cannot be displayed again.
- **FR-006**: The sensor key MUST NOT be stored in browser storage, written to logs, placed in a URL or shown again after the confirmation is dismissed.
- **FR-007**: Users MUST be able to register a meter for one of their own locations (administrators for any user's location) by entering a device identifier (required, at most 100 characters) and an optional comment (at most 200 characters).
- **FR-008**: Adding a meter MUST NOT be offered for a user who has no locations; adding a location is offered instead.
- **FR-009**: When the system rejects a request, the administrator MUST see its reason, and the form MUST keep the entered values.
- **FR-010**: Acting on another user's behalf MUST be visible and usable only by administrators; other users can act only on their own locations.
- **FR-011**: Submitting MUST be blocked while a request is in progress, to prevent duplicates.
- **FR-012**: If creating the location succeeds but linking it to the user fails, the administrator MUST be told and MUST be able to retry the link without creating another location.

### Key Entities

- **User**: A person who signs in. Has a set of locations they can see. May have been created by an administrator, by a migration, or (future feature) by self-registration.
- **Location**: A place where electricity is measured. Has name, address, serial number, price zone, an optional Norgespris agreement flag and an active flag. Linked to zero or more users.
- **Sensor key**: A secret generated when a location is created, used by the physical sensor. Shown once.
- **Meter (reader)**: A device registered for a location, identified by a device identifier, with an optional comment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An administrator can give an existing user, such as `roy@sanddata.no`, a working location and meter in under 3 minutes without leaving the users page.
- **SC-002**: After onboarding, the user sees the new location in their own location picker on their next sign-in or page refresh.
- **SC-003**: 100% of newly created locations show the sensor key to the administrator exactly once, and 0% show it again afterward.
- **SC-004**: 95% of administrators who hit a rejected submission can correct and resubmit successfully without retyping the other fields.
- **SC-005**: No administrator is required to use API tools or database access to onboard a user's location or meter.

## Assumptions

- **Dependency (backend change required):** today the backend only lets administrators create locations. For a normal user to create a location that belongs to them, the backend must allow a signed-in user to create a location that is automatically linked to the caller. Registering a meter for a linked location is already allowed for normal users. The administrator flow (create a location, link it to a user, register a meter) works with the current backend.
- Because of that dependency, the administrator-on-behalf-of flow (User Stories 2 and 3) can be delivered first, and the self-service flow (User Story 1) follows once the backend change exists.
- Rotating or replacing a lost sensor key is out of scope for this feature.
- Editing or deleting locations and meters is out of scope.
- **Out of scope, separate feature:** public self-registration (a person creating their own account). Today only administrators can create users. Once it exists, a new account lands in the User Story 1 setup.
- Price zones are limited to the five Norwegian zones NO1–NO5.
