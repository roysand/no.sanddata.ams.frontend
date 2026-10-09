# Feature Specification: Location Editing and Sharing

**Feature Branch**: `feature/admin-location-meter-onboarding` (spec directory `002-location-editing-sharing`)

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Location editing and sharing. Admin creates users and allocates them to locations. Each user-location link has a role: owner (the user the admin allocates) or viewer (other users given rights to see the location data and usage/cost). Owners can edit all non-system fields of a location (starting with name and address) and also meter fields such as comment, but never API/sensor keys or other system fields (serial number, zone, price agreement), which stay admin-only. If an owner sets the active flag to false, show a warning. Admin gets a menu item listing all users with their locations, and another menu item listing all locations in the system. Admin can add/remove viewers on a location. Sensor key rotation is out of scope (in backlog.md)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An owner edits their location (Priority: P1)

After an administrator has onboarded a user and handed over the sensor key, the user (the owner of the location) can correct and maintain their own location. From their locations view they open a location and change its name and address, and the active flag. Fields that belong to the system (serial number, price zone, Norgespris agreement, sensor key) are visible where useful but cannot be changed by the owner. The owner can also edit the comment on the location's meters.

**Why this priority**: Today a typo in a name or address can only be fixed by an administrator. This is the core of the feature and the part users notice first.

**Independent Test**: Sign in as an owner, change the name and address of a location, and confirm the new values appear in the location picker and locations view after saving. Confirm system fields are not editable.

**Acceptance Scenarios**:

1. **Given** an owner viewing one of their locations, **When** they change the name and/or address and save, **Then** the new values are stored and shown everywhere the location appears without a manual reload.
2. **Given** the edit form, **When** the owner looks at it, **Then** serial number, price zone and Norgespris agreement are not editable, and no sensor key is shown or changeable.
3. **Given** an owner editing a location, **When** they set the active flag to off and save, **Then** they first see a warning explaining the consequence and must confirm before the change is saved.
4. **Given** the warning is shown, **When** the owner cancels, **Then** the location stays active and nothing is changed.
5. **Given** invalid values (empty name or address, more than 100 characters), **When** the owner submits, **Then** the problem is shown against the field and the entered values are kept.
6. **Given** an owner viewing a meter on their location, **When** they change its comment (at most 200 characters) and save, **Then** the new comment is shown.
7. **Given** a user who is only a viewer of a location, **When** they look at it, **Then** no edit actions are offered.

---

### User Story 2 - An administrator shares a location with other users (Priority: P2)

An administrator opens a location and adds other existing users as viewers, so several people can see the same location's data, usage and cost. The administrator can also remove a viewer again. The owner stays the owner. Viewers see the location in their location picker and the dashboard as for their own locations, but cannot edit it.

**Why this priority**: Sharing is the second requirement of the feature, but it only matters once locations are being maintained, and it depends on the owner/viewer distinction being in place.

**Independent Test**: As an administrator, add a second user as viewer of a location. Sign in as that user and confirm the location and its usage and cost are visible and not editable. Remove the viewer and confirm the location disappears for them.

**Acceptance Scenarios**:

1. **Given** a location with an owner, **When** the administrator adds another user as viewer, **Then** that user sees the location in their location picker and can view its data, usage and cost.
2. **Given** a viewer, **When** the administrator removes them, **Then** the location is no longer visible to that user after their next page refresh or sign-in.
3. **Given** a location, **When** the administrator views its users, **Then** the owner and every viewer are listed with their role.
4. **Given** a user who is already linked to the location, **When** the administrator tries to add them again, **Then** nothing is duplicated and a clear message is shown.
5. **Given** an ordinary user (not administrator), **When** they use the app, **Then** they cannot add or remove viewers.

---

### User Story 3 - An administrator sees all users and their locations (Priority: P2)

The administrator has a menu item that lists all users together with the locations each user owns or can view, and the role in each case. From here the administrator can allocate a location to a user as owner (as in feature 001) and open a user's locations.

**Why this priority**: Without an overview, an administrator cannot tell who has access to what, which is needed to share safely.

**Independent Test**: As an administrator, open the menu item and confirm every user is listed with their locations and roles, including users with no locations.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they open the users-with-locations menu item, **Then** all users are listed with their owned and viewed locations and the role for each.
2. **Given** a user with no locations, **When** the list is shown, **Then** the user is still listed, with an indication that they have none and an option to add one.
3. **Given** a long list of users, **When** the administrator searches by name or email, **Then** the list narrows accordingly.
4. **Given** an ordinary user, **When** they use the app, **Then** the menu item is not shown.

---

### User Story 4 - An administrator sees all locations in the system (Priority: P2)

A second administrator menu item lists every location in the system, with its name, address, owner, viewers, and whether it is active. The administrator can open a location to edit all of its fields, including the system fields, manage viewers (User Story 2) and add meters.

**Why this priority**: Gives the administrator a location-centred view complementing the user-centred one, and is the natural entry point for sharing.

**Independent Test**: As an administrator, open the menu item, confirm all locations appear with owner and viewer counts, and open one to change a system field such as the price zone.

**Acceptance Scenarios**:

1. **Given** an administrator, **When** they open the all-locations menu item, **Then** every location is listed with name, address, owner, number of viewers and active status.
2. **Given** a location in the list, **When** the administrator opens it, **Then** they can edit name, address, serial number, price zone, Norgespris agreement and the active flag.
3. **Given** the administrator changes the serial number to one already used, **When** they save, **Then** a specific rejection message is shown and the entered values are kept.
4. **Given** an ordinary user, **When** they use the app, **Then** the menu item is not shown.

---

### Edge Cases

- A viewer opens a direct link to an edit view: they see a not-allowed message rather than a form.
- A user is removed as owner or the owner link is missing: a location always has exactly one owner; the administrator cannot remove the owner without first allocating a new one.
- An owner sets the location inactive and later wants it active again: they can, with no warning needed when activating.
- Two people edit the same location at the same time: the later save wins, and the user is shown the saved values afterward.
- The session expires while editing: the user is returned to sign-in as elsewhere in the app.
- The administrator removes a viewer who currently has the shared location selected in the dashboard: the dashboard moves to another location they can see, or to the empty state.
- A user with the maximum of 4 self-created locations (feature 001) is made viewer of other locations: viewer access does not count towards that limit.
- A save is double-clicked: only one update is sent.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every link between a user and a location MUST carry a role, either owner or viewer. A location has exactly one owner.
- **FR-002**: The user a location is allocated to by an administrator, or the user who creates it themselves (feature 001), MUST be its owner.
- **FR-003**: Owners MUST be able to edit the name and address of their locations, with the same required-field and 100-character rules as when creating a location.
- **FR-004**: Owners MUST be able to change the active flag of their locations. Setting it to inactive MUST first show a warning and require confirmation.
- **FR-005**: Owners MUST be able to edit the comment (at most 200 characters) of meters on their locations.
- **FR-006**: Owners MUST NOT be able to change system fields (serial number, price zone, Norgespris agreement) or see or change the sensor key. These remain editable by administrators only.
- **FR-007**: Viewers MUST be able to see the location, its data, usage and cost, and MUST NOT be offered any edit action.
- **FR-008**: Administrators MUST be able to add an existing user as viewer of any location and remove a viewer again.
- **FR-009**: Adding a user who is already linked to a location MUST NOT create a duplicate and MUST show a clear message.
- **FR-010**: Administrators MUST have a menu item listing all users with the locations they own or view, including the role, with search by name or email. Users with no locations MUST be listed.
- **FR-011**: Administrators MUST have a menu item listing all locations in the system with name, address, owner, number of viewers and active status, and MUST be able to open each to edit all fields including system fields.
- **FR-012**: Both administrator menu items MUST be hidden from, and not usable by, non-administrators.
- **FR-013**: Changes MUST show without a manual reload, in the locations lists, the location picker and the dashboard.
- **FR-014**: When the system rejects a change, the reason MUST be shown and the entered values kept. Submitting MUST be blocked while a request is in progress.
- **FR-015**: Viewer access MUST NOT count towards the limit of 4 self-created locations from feature 001.
- **FR-016**: Sensor key rotation and viewing of an existing sensor key are not part of this feature.

### Key Entities

- **User**: A person who signs in. Has access to zero or more locations, each with a role.
- **Location**: A place where electricity is measured. Has editable fields (name, address, active flag) and system fields (serial number, price zone, Norgespris agreement, sensor key).
- **Location access**: The link between a user and a location. Carries the role owner or viewer. A location has one owner and any number of viewers.
- **Meter (reader)**: A device registered for a location, with a device identifier and an editable comment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An owner can correct the name or address of a location in under 1 minute without contacting an administrator.
- **SC-002**: An administrator can give another user access to a location in under 1 minute, and that user sees it on their next page refresh or sign-in.
- **SC-003**: 100% of attempts by owners to change system fields or by viewers to change anything are refused, in the interface and by the system.
- **SC-004**: 100% of owners who set a location inactive are shown the warning before the change is saved.
- **SC-005**: An administrator can find out who has access to a given location, or which locations a given user can see, in under 30 seconds.
- **SC-006**: No administrator needs database or API tools to share or reassign a location.

## Assumptions

- **Dependency (backend change required):** the backend needs an endpoint for updating a location (owner: name, address, active flag; administrator: all fields), an endpoint for updating a meter's comment, a role on the user-location link, endpoints to add and remove viewers, and endpoints listing all users with their locations and all locations. Authorisation for these must be enforced by the backend, not only hidden in the interface.
- Existing user-location links, created before roles existed, are treated as owner links.
- Sharing is done by administrators only. Owners cannot invite viewers themselves.
- A location has exactly one owner; changing the owner is done by an administrator allocating the location to another user.
- Deleting locations and meters is out of scope.
- Sensor key rotation is out of scope and tracked in `backlog.md`.
- "Usage and cost" refers to the existing dashboard views of consumption and cost; this feature only controls who may see them, and does not add new views.
- Builds on `001-location-meter-onboarding`: the add-location and add-meter flows and the 4-location self-service limit stay as specified there. The 001 statement that editing locations and meters is out of scope is superseded for the fields described here.
