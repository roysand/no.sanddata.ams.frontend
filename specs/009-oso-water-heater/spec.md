# Feature Specification: Connect and Show the OSO Water Heater

**Feature Branch**: `009-oso-water-heater`

**Created**: 2026-11-19

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/011-oso-water-heater/` (API PRs #35 to #38, deployed
2026-11-19; contract in its `contracts/endpoints.md`, field meanings in its `data-model.md`). Backlog item "OSO water
heater" in `backlog.md`. User description: "A UI in the frontend for the OSO water heater: an Admin page for
connecting, replacing and removing the heater per location (key and device id, with the shortened id shown
afterwards), plus a card on the dashboard with the live state: hot water left, temperatures, heating on/off, power,
special mode, reading age."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - An administrator connects the water heater to a location (Priority: P1)

An administrator opens a location in the Admin locations page and finds a "Water heater" section. When no heater is
connected, it says so and offers "Connect". The administrator pastes the OSO subscription key and the heater's device
id (both from the OSO app or website) and saves. The API checks them with OSO before saving, so a typo is reported at
once. Afterwards the section shows that a heater is connected, its shortened device id (for example
`4b8814…49499d`) and when it was connected; the key is never shown again. The administrator can replace the key or
device id, and remove the connection.

**Why this priority**: Without it the heater can only be connected with curl or the API docs, and the dashboard card
(user story 2) has nothing to show.

**Independent Test**: As an administrator, open a location without a heater, connect with a key and device id that
the API accepts, and see "Connected", the shortened id and the date. Try again with a key the API rejects and see
the API's message ("OSO rejected the key or device id…") next to the form, with nothing changed.

**Acceptance Scenarios**:

1. **Given** a location without a heater, **When** the administrator opens it, **Then** the Water heater section says
   "No water heater connected" and offers "Connect".
2. **Given** the connect form, **When** the key or device id is empty, the key contains spaces, or the device id is
   not hexadecimal (0-9, a-f), **Then** the form shows the problem under the field and sends nothing.
3. **Given** a valid form, **When** the administrator saves, **Then** a "Checking with OSO…" state is shown until the
   answer comes (it can take up to 10 seconds), and the save button cannot be pressed twice.
4. **Given** the API accepts the pair, **When** the answer comes, **Then** the section shows "Connected", the
   shortened device id and the connection date, and the form is closed and cleared.
5. **Given** the API refuses (OSO rejected the pair, the device is already at another location, OSO is unavailable,
   or the server has no encryption key), **When** the answer comes, **Then** the API's message is shown in the form,
   the typed values stay so the administrator can fix them, and the section still shows what it showed before.
6. **Given** a connected heater, **When** the administrator chooses "Replace", **Then** the same form opens empty (the
   old key is never filled in), and saving replaces the old key and device id after the same check.
7. **Given** a connected heater, **When** the administrator chooses "Remove" and confirms, **Then** the section shows
   "No water heater connected". The confirmation says that the stored power history is kept.
8. **Given** the key field, **When** the administrator types, **Then** it is a password-style field (hidden by
   default) and the browser is asked not to save it.

---

### User Story 2 - The household sees the water heater on the dashboard (Priority: P1)

A household member opens the dashboard for a location with a connected heater and sees a "Water heater" card: how
much hot water there is (litres of 40 °C water out of the maximum, and showers and baths left), the tank temperature,
whether it is heating right now and at what power, and any special mode (holiday or supercharge, with when it ends).
The card says how old the reading is ("updated 2 minutes ago") and refreshes by itself. Locations without a heater
show no card at all.

**Why this priority**: This is what the household gets from the connection: knowing whether there is hot water for a
shower without walking to the heater or opening the OSO app.

**Independent Test**: With a state response for a heater (333 of 360 litres, 3 showers, 1 bath, top 70,1 °C, not
heating, 0,0117 kW, normal mode, 94 seconds old), open the dashboard and see these figures and "updated 1 minute
ago". For a location whose state answers "no water heater connected", see no card.

**Acceptance Scenarios**:

1. **Given** a location with a heater, **When** the dashboard loads, **Then** the Water heater card shows the litres
   of 40 °C water available and the maximum (for example "333 of 360 l"), a bar for how full it is, and the showers
   and baths left.
2. **Given** the temperatures, **When** the card renders, **Then** it shows the top temperature as the main figure
   and the middle and bottom ones as details. A temperature the API gives as missing is left out, never shown as
   0 °C.
3. **Given** the heater is heating, **When** the card renders, **Then** it says "Heating" with the power in kW; when
   it is not, it says "Not heating" (the small standby power is not presented as heating).
4. **Given** a holiday or supercharge mode, **When** the card renders, **Then** it names the mode and when it ends in
   Oslo time; with no special mode, nothing about modes is shown.
5. **Given** the reading time, **When** the card renders, **Then** it shows how old the reading is in words ("updated
   2 minutes ago"); when the API marks the reading as stale (over 15 minutes), the card says the reading is old, and
   when the heater is offline, it says so.
6. **Given** the card is open, **When** time passes, **Then** the state is fetched again about once a minute, and the
   age text moves on between fetches.
7. **Given** a location without a heater (the API answers 404), **When** the dashboard loads, **Then** no Water
   heater card is shown and nothing else on the dashboard changes.
8. **Given** OSO is unavailable or has rejected the stored key (the API answers 502 or 503), **When** the card
   renders, **Then** it shows the API's message in place of the figures (for example that an Admin must reconnect the
   heater), keeps the rest of the dashboard working, and tries again at the next refresh.
9. **Given** OSO's undocumented codes and the stored energy in kWh, **When** the card renders, **Then** they are not
   shown in this version.

---

### Edge Cases

- **Slow OSO.** Connecting and the first card load may take a few seconds; both show a waiting state, never a blank
  card or a frozen button.
- **Switching location on the dashboard.** The card follows the selected location; a heater at one location is never
  shown for another.
- **Two dashboards at once / tab in the background.** The card refreshes only while the dashboard is open, so a tab
  left open does not keep OSO busy more than once a minute.
- **The key never leaves the form.** It is not kept in any store, URL, log or local storage, and the form is cleared
  after saving or closing.
- **A regular user.** The Water heater section is part of the Admin pages only; the dashboard card is shown to
  everyone who can see the location (owner, viewer, Admin).
- **Inactive location.** The API answers 404 for the state, so no card is shown.
- **A reading in the future** (clock skew): shown as "updated just now".

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Admin location view MUST have a Water heater section that shows whether a heater is connected, and
  when one is, its shortened device id and connection date, never the key.
- **FR-002**: An administrator MUST be able to connect a heater by entering the OSO subscription key and device id,
  replace them, and remove the connection after a confirmation.
- **FR-003**: The connect form MUST check before sending that both fields are filled in, the key has no spaces and
  the device id is hexadecimal, at most 200 characters each (mirroring the API's rules).
- **FR-004**: While a connection is being checked the form MUST show a waiting state and MUST NOT allow a second
  submit; a refusal MUST show the API's message and keep the typed values.
- **FR-005**: The key field MUST be hidden by default, MUST NOT be saved by the browser, and the key MUST NOT be kept
  anywhere after the form closes.
- **FR-006**: The app MUST show a Water heater card for the selected location when it has a connected heater, and no
  card when the API says there is none. (Changed 2026-11-19: the card is on its own page behind a Heater tab in the
  bottom bar, shown only for a location with a heater, instead of on the dashboard; see research R9.)
- **FR-007**: The card MUST show litres of 40 °C water available and maximum, showers and baths left, the tank
  temperatures (top as main figure), heating or not with power in kW, any special mode with its end time in Oslo
  time, and the reading's age; offline and stale readings MUST be marked.
- **FR-008**: The card MUST refresh about once a minute while its page is open.
- **FR-009**: When the API cannot read the heater (502/503), the card MUST show the API's message and MUST NOT affect
  the rest of the dashboard.
- **FR-010**: Values the API gives as missing MUST be left out, never shown as 0.

### Key Entities

- **Water heater connection** (Admin): location, shortened device id, connected and last changed times.
- **Water heater state** (dashboard): reading time and age, stale and online flags, heating and power, set point,
  temperatures, hot water (litres, showers, baths), special mode with start and end.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An administrator can connect the heater at Hjemme from the app in under a minute, without curl or the
  API docs.
- **SC-002**: A wrong key or device id is reported in the form, with the reason, in 100% of attempts, and never
  leaves a half-saved connection.
- **SC-003**: The household can tell from the dashboard, in one glance, whether there is hot water for a shower; the
  figures match the OSO app at the same moment.
- **SC-004**: The card's figures are never more than about 3 minutes older than OSO's own reading while the dashboard
  is open.
- **SC-005**: An OSO outage never breaks or hides the other dashboard cards.

## Assumptions

- The API endpoints of spec 011 are deployed (2026-11-19). The frontend calls only those; it never talks to OSO.
- The API's error body carries the message but not the error code (`{"errors": {"generalErrors": [message]}}`), so
  the UI tells cases apart by HTTP status (404 = no heater or not visible, 502/503 = heater unreadable) and shows the
  message as it comes. No new API field is needed for this version.
- One heater per location, as the API allows.
- Control of the heater (cheapest hours, pausing at capacity peaks) and the heater's kWh and cost history are later
  features; neither is in this version.
- Oslo time and Norwegian number formatting follow the shared helpers already used on the dashboard.
