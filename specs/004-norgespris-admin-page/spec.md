# Feature Specification: Admin Page for Norgespris Rates

**Feature Branch**: `004-norgespris-admin-page`

**Created**: 2026-11-13

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/007-norgespris-rates/` (contract in its `contracts/endpoints.md`, PR #21). User description: "The Norgespris rate will most probably change on 1 January. The Admin must be able to see all rates, add a new rate with a start date, and delete one that has not started. The rate in effect today is highlighted. A rate that starts today or earlier needs an explicit warning and confirmation, because costs shown for past hours are recalculated."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the Norgespris rates (Priority: P1)

An Admin opens "Norgespris" from the Administration menu and sees every rate in a table: start date, rate, tax and total per kWh. The rate in effect today is highlighted and labelled, rates that start in the future are labelled "Upcoming", and older rates are shown as superseded.

**Why this priority**: The Admin must be able to check what the system currently uses and what is planned before changing anything.

**Independent Test**: Sign in as Admin, open the page with three rates (one old, one in effect, one upcoming) and confirm each is labelled correctly and exactly one is highlighted.

**Acceptance Scenarios**:

1. **Given** rates with the statuses Superseded, InEffect and Upcoming, **When** the Admin opens the page, **Then** they are listed oldest first with the start date as `dd.mm.yyyy`, and the one in effect is highlighted and labelled "In effect".
2. **Given** the list is loading or fails, **When** the page renders, **Then** it shows "Loading…" or the server's error message instead of an empty table.
3. **Given** a regular user, **When** they look at the menu or open the address directly, **Then** there is no Norgespris entry and they are sent back to the dashboard.
4. **Given** a rate, **Then** its total per kWh (rate plus tax) is shown with up to four decimals, for example `0,4000 kr/kWh`.

---

### User Story 2 - Add a rate in advance (Priority: P1)

An Admin adds the new rate before it starts: a start date, a rate per kWh and a tax per kWh. After saving, the table shows the new rate as "Upcoming" and nothing about today's costs changes.

**Why this priority**: This is the 1 January task the whole feature exists for.

**Independent Test**: Open "Add rate", enter a date next month, a rate and a tax, save, and see the new row labelled "Upcoming".

**Acceptance Scenarios**:

1. **Given** the add dialog, **When** the Admin enters a future date, rate `0,50` and tax `0` and saves, **Then** the request is sent with `confirmPastDate: false`, the dialog closes and the table shows the new rate as Upcoming.
2. **Given** empty fields, a negative amount, an amount above 100, or more than four decimals, **When** the Admin saves, **Then** a message under the field says what is wrong and nothing is sent.
3. **Given** the server refuses the request (for example another rate already starts on that date), **When** it answers `409`, **Then** its message is shown in the dialog and the dialog stays open.
4. **Given** amounts typed with a comma (`0,5`), **When** the Admin saves, **Then** they are read as `0.5`.

---

### User Story 3 - Correct a mistake safely (Priority: P2)

An Admin deletes a rate that has not started, or adds a rate that starts today or earlier to correct the newest rate. For a start date of today or earlier the dialog shows a warning that costs shown for past hours will be recalculated, and the Admin must tick a confirmation before it can be saved.

**Why this priority**: The first two stories deliver the 1 January change; this one makes a wrong entry recoverable.

**Independent Test**: Delete an upcoming rate and see it disappear; pick yesterday's date in the add dialog and see the warning, the blocked save, then the successful save after confirming.

**Acceptance Scenarios**:

1. **Given** an upcoming rate, **When** the Admin deletes it and confirms, **Then** it is removed from the table. Rates that are in effect or superseded have no delete action.
2. **Given** a start date of today or earlier (Norwegian date), **When** it is selected, **Then** the dialog shows the recalculation warning and a confirmation checkbox, and saving is refused until the box is ticked.
3. **Given** the box is ticked and the date is the newest, **When** the Admin saves, **Then** the request is sent with `confirmPastDate: true`.
4. **Given** a future date, **Then** no warning and no confirmation box is shown.
5. **Given** the server answers `409` to a delete or an add (for example the rate has started, or the date is not newer than the newest rate), **Then** its message is shown and the dialog stays open.
6. **Given** a rate is added or deleted, **Then** cost figures already loaded elsewhere in the app are refreshed the next time they are shown, so old numbers are not kept.

---

### Edge Cases

- **Today is decided in Norway.** Whether a start date counts as "today or earlier" uses the Oslo calendar date, not the browser's time zone.
- **Start date is today.** It counts as past: the warning and confirmation apply.
- **Double submit.** The save and delete buttons are disabled while a request is in flight.
- **A rate removed by someone else.** Deleting an unknown rate answers `404`; the message is shown and the list is refreshed.
- **Narrow screens.** The page is used on a phone like the other admin pages: the table scrolls inside its card and dialogs fit the screen.
- **No rates returned.** An empty list shows "No rates yet" instead of an empty table (should not occur, since the API seeds one).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web app MUST provide an Admin-only page at `/admin/norgespris`, linked from the Administration section of the menu, under the existing admin route guard.
- **FR-002**: The page MUST list all rates from `GET /api/admin/norgespris` with start date, rate, tax, total and status, highlighting the one in effect and labelling upcoming ones.
- **FR-003**: The page MUST offer an add dialog with start date, rate per kWh and tax per kWh, validated before sending (required, at least 0, at most 100, at most four decimals; comma or dot as decimal separator), mirroring the API's rules.
- **FR-004**: When the chosen start date is today or earlier in Norway, the dialog MUST show the recalculation warning and require the Admin to confirm before saving, and MUST then send `confirmPastDate: true`; otherwise it MUST send `false`.
- **FR-005**: The page MUST offer a delete action, with a confirmation, only on rates with status Upcoming.
- **FR-006**: The app MUST show the server's message when a request fails and keep the dialog open.
- **FR-007**: After a successful add or delete, the rate list and the cost-related data already loaded (current, hourly, daily and price figures) MUST be refreshed.
- **FR-008**: Every call MUST go through the shared API client with the user's token; no rate logic is decided in the browser beyond the validation and the warning (the API stays the authority).

### Key Entities

- **Norgespris rate**: id, start date (a calendar date), rate and tax per kWh, total per kWh, and a status computed by the server from today's date in Norway: Superseded, InEffect or Upcoming.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can add the 1 January rate in under one minute from the menu.
- **SC-002**: A rate that starts today or earlier can never be sent without the Admin having ticked the confirmation.
- **SC-003**: A regular user finds no way to reach the page.
- **SC-004**: After adding or deleting a rate, no stale cost figure from before the change is shown when the Admin returns to the dashboard.

## Assumptions

- The backend endpoints in the API repository (PR #21) are deployed before this page is used; the page does not work without them.
- The API's error responses carry a message and a status code but not the error code, so the page relies on the status and shows the message.
- Rates are NOK per kWh. Amounts are shown in the Norwegian format with up to four decimals.
- The page lives in the existing `admin` slice, next to Users and Locations.
- Spot prices, the location's Norgespris-agreement flag and the dashboard layout are unchanged.
