# Feature Specification: Admin Pages for the Electricity Price Data

**Feature Branch**: `005-pricing-admin-pages`

**Created**: 2026-11-16

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/008-full-electricity-price/` (contract in its `contracts/endpoints.md`, PR #23). User description: "The new price data is natural to have an administrator frontend for": the grid tariff and supplier markup of each location, the grid tariffs with their day and night rates, and the national electricity tax, Enova fee and VAT, all with start dates. The display of the prices (labels, the parts, the Norgespris saving) is a separate feature.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set the grid tariff and supplier markup of each location (Priority: P1)

An Admin opens "Location pricing" from the Administration menu and sees every location with its grid tariff, its supplier markup and whether it is complete. A location without a grid tariff is marked "Not set": its prices leave out the grid part until one is chosen. The Admin chooses a tariff and types the markup for a location and saves.

**Why this priority**: After the backend is deployed this is the first thing that must be done for every location, and until it is done the prices stay too low.

**Independent Test**: With one location without a tariff, open the page, see "Not set", choose a tariff and a markup, save, and see the row become complete.

**Acceptance Scenarios**:

1. **Given** locations with and without a grid tariff, **When** the Admin opens the page, **Then** every location is listed with its tariff name or "Not set", its markup, and a clear "Incomplete" mark on those without a tariff.
2. **Given** the edit dialog, **When** the Admin picks a tariff (or "None"), types a markup such as `0,02` and saves, **Then** the request is sent with the tariff id (or null) and the markup as a number, and the row is updated.
3. **Given** an invalid markup (empty, negative, above 100, more than four decimals), **When** the Admin saves, **Then** a message under the field says what is wrong and nothing is sent.
4. **Given** the dialog, **Then** it says that the change recalculates the costs shown for past hours.
5. **Given** no grid tariffs exist yet, **Then** the dialog offers only "None" and points the Admin to the Grid tariffs page.
6. **Given** a regular user, **Then** the page is not in the menu and the address is not available.

---

### User Story 2 - Maintain the grid tariffs and their rates (Priority: P1)

An Admin opens "Grid tariffs" and sees each tariff with its rates: start date, day rate, night and weekend rate, and status. The Admin creates a tariff and adds a rate with a start date, a day rate and a night and weekend rate, ahead of the date it takes effect.

**Why this priority**: A location cannot be given a tariff until one exists, and the rates change when the grid company changes them.

**Independent Test**: Create a tariff, add a rate starting today (confirming the warning), see it listed as "In effect", then add a rate for next month and see it as "Upcoming".

**Acceptance Scenarios**:

1. **Given** tariffs with rates, **When** the Admin opens the page, **Then** each tariff shows its rates oldest first with the one in effect highlighted and upcoming ones marked.
2. **Given** the new tariff dialog, **When** the Admin enters a name and saves, **Then** it appears with no rates; a taken name shows the server message and keeps the dialog open.
3. **Given** the add rate dialog, **When** the Admin enters a future start date and valid rates, **Then** the rate is sent with `confirmPastDate: false` and appears as Upcoming.
4. **Given** the add rate dialog, **Then** it states that the rates are entered **excluding taxes and VAT**, because the taxes are added separately.
5. **Given** a start date of today or earlier (Norwegian date), **Then** the dialog shows the recalculation warning and needs a ticked confirmation before it sends `confirmPastDate: true`; for a future date there is none.
6. **Given** an upcoming rate, **When** the Admin deletes it with a confirmation, **Then** it is removed; a rate that has started has no delete action.
7. **Given** the server refuses (for example the date is taken, or not newer than the newest rate), **Then** its message is shown and the dialog stays open.

---

### User Story 3 - Maintain the electricity tax, the Enova fee and VAT (Priority: P2)

An Admin opens "Taxes and VAT" and sees the three values with their start dates. When the state changes a value, the Admin adds a new row with a start date. VAT is entered and shown as a percentage.

**Why this priority**: These change once a year or so, so this is needed less often than the first two stories, and Scalar would do for a first change.

**Independent Test**: Add an electricity tax row starting next January and see it listed as Upcoming under the tax; add a VAT row of `25` and see it shown as 25 %.

**Acceptance Scenarios**:

1. **Given** the existing rows, **When** the Admin opens the page, **Then** they are shown in three sections (Electricity tax, Enova fee, VAT), oldest first, with the one in effect highlighted.
2. **Given** an add dialog for a section, **When** the Admin enters a future date and a value, **Then** it is sent for that kind with `confirmPastDate: false`.
3. **Given** the VAT section, **When** the Admin types `25` (a percentage), **Then** it is sent as the fraction `0.25`, and rows are shown as `25 %`.
4. **Given** the fee sections, **Then** amounts are in kr per kWh with at most four decimals, comma or dot.
5. **Given** a start date of today or earlier, **Then** the same warning and confirmation as for tariff rates apply.
6. **Given** an upcoming row, **Then** it can be deleted with a confirmation; started rows cannot.

---

### User Story 4 - Tidy the Norgespris page (Priority: P3)

The Norgespris rate no longer has a tax part: the electricity tax and the Enova fee are added separately by the price calculation. The Norgespris page and its add dialog stop showing and asking for a tax.

**Why this priority**: A leftover Tax field would invite entering the taxes twice. It is small and only tidies up.

**Independent Test**: Open the add dialog on the Norgespris page and see only a start date and a rate; the table shows the rate only.

**Acceptance Scenarios**:

1. **Given** the Norgespris page, **Then** the table has a Valid from, a Rate and a Status column and no Tax or Total column.
2. **Given** the add dialog, **Then** it has a start date and a rate, and the request sends a tax of 0.

---

### Edge Cases

- **Today is decided in Norway.** "Today or earlier" uses the Oslo date, not the browser time zone, as for the Norgespris page.
- **Percentages.** VAT is typed as a percentage with up to two decimals (`25`, `25,5`), because the API takes a fraction with four decimals; it is converted without rounding errors.
- **Many locations.** The location list scrolls inside its card on a phone; edit is a dialog, not an inline form.
- **No data.** An empty list shows "No tariffs yet" or "No rows yet" rather than an empty table.
- **Double submit.** Save and delete buttons are disabled while a request is in flight.
- **Stale lists.** After an add, edit or delete the list is refreshed, and so are the cost and price queries, because costs change with these values.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The web app MUST provide three Admin-only pages, "Location pricing" (`/admin/location-pricing`), "Grid tariffs" (`/admin/grid-tariffs`) and "Taxes and VAT" (`/admin/price-rates`), linked from the Administration section of the menu and under the existing admin route guard.
- **FR-002**: The Location pricing page MUST list every location with its grid tariff name or "Not set", its markup and a complete or incomplete mark, from `GET /api/admin/location-pricing`.
- **FR-003**: The edit dialog MUST let the Admin choose a tariff or none and type a markup, validated before sending (required, at least 0, at most 100, at most four decimals, comma or dot), and send `PUT /api/admin/location-pricing/{locationId}`; it MUST say that past hours are recalculated.
- **FR-004**: The Grid tariffs page MUST list every tariff with its rates (start date, day rate, night and weekend rate, status), highlighting the rate in effect and marking upcoming ones, and let the Admin create a tariff and add a rate (`POST /api/admin/grid-tariffs`, `POST /api/admin/grid-tariffs/{id}/rates`).
- **FR-005**: The add rate dialog MUST state that rates are excluding taxes and VAT, and validate the same limits as the API.
- **FR-006**: The Taxes and VAT page MUST list the electricity tax, the Enova fee and VAT in separate sections with their rows and status, and let the Admin add a row (`POST /api/admin/price-rates`); VAT MUST be typed and shown as a percentage and sent as a fraction.
- **FR-007**: When a chosen start date is today or earlier in Norway, every add dialog MUST show the recalculation warning and require the Admin to confirm it, and MUST then send `confirmPastDate: true`; otherwise `false`.
- **FR-008**: Rows that have not started MUST be deletable with a confirmation (`DELETE /api/admin/price-rates/{id}`, `DELETE /api/admin/grid-tariffs/{id}/rates/{rateId}`); rows that have started MUST have no delete action.
- **FR-009**: The app MUST show the server message when a request fails and keep the dialog open.
- **FR-010**: After a successful change the lists MUST be refreshed, and the cost and price queries invalidated.
- **FR-011**: The Norgespris page MUST no longer show or ask for a tax and MUST send a tax of 0.
- **FR-012**: Every call MUST go through the shared API client; the API stays the authority for every rule.

### Key Entities

- **Location pricing**: location id and name, grid tariff id and name (or none), supplier markup per kWh, and whether it is complete.
- **Grid tariff**: id, name, and its rates (start date, day rate, night and weekend rate, status).
- **Price rate**: id, kind (ElectricityTax, EnovaFee or Vat), start date, value, status.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An Admin can give a location its grid tariff and markup in under 30 seconds from the menu.
- **SC-002**: A row that starts today or earlier can never be sent without the Admin having ticked the confirmation.
- **SC-003**: A regular user finds no way to reach any of the three pages.
- **SC-004**: After adding or changing a value, no stale cost figure from before the change is shown when the Admin returns to the dashboard.
- **SC-005**: Every location that still lacks a grid tariff is visible at a glance on the Location pricing page.

## Assumptions

- The backend endpoints from PR #23 in the API repository are deployed before these pages are used.
- The API sends the message and status of an error, not the error code, so the pages rely on the status and show the message.
- Grid tariffs cannot be renamed or deleted in this feature, as the API offers neither.
- Rates and fees are in NOK per kWh; VAT is the only percentage.
- The pages live in the existing `admin` slice, next to Users, Locations and Norgespris.
- Showing the full price, its parts and the Norgespris saving elsewhere in the app is a separate feature (`specs/_backlog` in the API repository).
