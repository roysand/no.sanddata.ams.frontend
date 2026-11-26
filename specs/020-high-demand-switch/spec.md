# Feature Specification: A High Demand Switch on the Heater Tab

**Feature Branch**: `020-high-demand-switch`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "A High Demand switch on the Heater tab, Admin only, on top of API spec 022"
(`no.sanddata.ams.api` → `specs/022-oso-high-demand/`, deployed 2026-11-26; handover in
`specs/_backlog/oso-high-demand-frontend.md`).

High Demand makes the OSO water heater heat the tank extra for a while, as the OSO app's "High Demand" button does: for
example before guests or a bath. The Heater tab already shows the mode when it is on ("Supercharge until …", from the
heater's state). API spec 022 now lets an Admin turn it on and off from the app. It is the app's first control of the
heater.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Turn High Demand on and off (Priority: P1)

On the Heater tab, an Admin sees a "High Demand" switch with "Heats the tank extra for 24 hours". Turning it on makes
the heater heat extra, and the tab says "High Demand until {day and time}". Turning it off ends it early.

**Why this priority**: It is what Roy asked for: heat extra from the app without opening the OSO app.

**Independent Test**: As Roy (Admin) on Hjemme, turn the switch on: within a few seconds the tab shows High Demand
until about 24 hours from now, and the heater's set point rises. Turn it off: the tab shows normal mode.

**Acceptance Scenarios**:

1. **Given** an Admin on the Heater tab with High Demand off, **When** they turn the switch on, **Then** the heater is
   asked to turn High Demand on, and once it answers, the tab shows "High Demand until {day and time}" from the
   heater's new state, without waiting for the next update.
2. **Given** High Demand on, **When** the Admin turns the switch off, **Then** the heater is asked to turn it off, and
   the tab shows the heater's new state.
3. **Given** a switch in progress, **When** it waits for the heater (up to about 10 seconds), **Then** the switch is
   disabled and says it is switching; it can't be pressed twice.
4. **Given** the heater answered but its new state couldn't be read, **When** the switch is done, **Then** the tab
   reads the heater's state again; no error is shown.
5. **Given** the heater still reports the old mode for a moment, **When** the switch is done, **Then** the tab shows
   what the heater reports, and the switch follows it at the next update.
6. **Given** High Demand turned on in the OSO app, **When** the Admin opens the tab, **Then** the switch shows it on.

---

### User Story 2 - Only Admins can switch (Priority: P1)

Only a user with the Admin role sees the switch. Owners and viewers see the mode as today, without a switch.

**Why this priority**: The API allows the switch to Admins only; a switch that can't work must not be shown.

**Acceptance Scenarios**:

1. **Given** an owner or viewer who is not an Admin, **When** they open the Heater tab, **Then** there is no switch,
   and High Demand still shows as "High Demand until …" when it is on.
2. **Given** an Admin, **When** they open the Heater tab of any location with a heater, **Then** the switch is shown.

---

### User Story 3 - A switch that fails says what happened (Priority: P1)

**Acceptance Scenarios**:

1. **Given** the heater service is down or slow, **When** a switch fails, **Then** the card says "Couldn't reach the
   heater. It may or may not have switched; the state below is read again.", the heater's state is read again, and the
   Admin can try again. The app never retries by itself.
2. **Given** OSO no longer offers High Demand, **When** a switch fails for that reason, **Then** the switch is disabled
   with "OSO no longer offers High Demand." until the page is opened again.
3. **Given** the heater's OSO key is rejected or unreadable, **When** a switch fails, **Then** the card says the heater
   must be reconnected under Admin → Locations.
4. **Given** any other failure, **When** it happens, **Then** the card shows the API's message and the switch goes back
   to the heater's state.

---

### Edge Cases

- **The name**: the tab calls the mode "High Demand", as the OSO app and the switch do, instead of "Supercharge", for
  everyone.
- **Turning it on while on**: the switch is on, so the Admin can only turn it off; restarting the 24 hours is not
  offered.
- **Another special mode** (Holiday or Blue Battery) on: the switch shows off; turning High Demand on is left to the
  heater (OSO decides what wins), and the tab shows what the heater then reports.
- **The heater offline or the state unavailable**: the switch is disabled while there is no current state to show.
- **The OSO app may disagree** for a while after turning it off (seen by Roy on 2026-11-26): the tab shows what the
  heater's status reports.
- **Phone width and dark mode**: the switch and its text fit at 375 px in both modes.
- **Location switched while switching**: the answer updates only the location it was made for.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Heater tab MUST show Admins a "High Demand" switch that shows on when the heater reports High Demand,
  and off otherwise.
- **FR-002**: Turning the switch on MUST ask the heater to turn High Demand on; off MUST ask it to turn it off.
- **FR-003**: The switch MUST say that High Demand lasts 24 hours, and the tab MUST show "High Demand until {Oslo day
  and time}" while it is on.
- **FR-004**: After a switch, the tab MUST show the heater's state from the answer at once, or read it again when the
  answer has none.
- **FR-005**: While a switch is in progress, the switch MUST be disabled and say so; a failed switch MUST NOT be
  retried by the app.
- **FR-006**: Users who are not Admins MUST NOT see the switch, and MUST still see the mode.
- **FR-007**: Each failure MUST show the message of User Story 3, and a failure whose outcome is unknown MUST read the
  heater's state again.
- **FR-008**: The mode MUST be called "High Demand" everywhere on the tab.

### Key Entities

- **High Demand**: on or off, and until when, from the heater's state; switched by an Admin through the API.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An Admin turns High Demand on or off in one tap, and the tab shows the new state within 10 seconds.
- **SC-002**: A non-Admin never sees the switch.
- **SC-003**: After a failure, the Admin always sees what happened and the heater's current state.
- **SC-004**: At 375 px, in light and dark mode, the switch and its texts fit without sideways scrolling.

## Assumptions

- API spec 022 is deployed (2026-11-26); its requests, answer and errors are in
  `specs/022-oso-high-demand/contracts/endpoints.md` in the API repository.
- High Demand switched through the API lasts 24 hours; no duration is chosen.
- The formal test against the real heater was not run on the API side; Roy tests the switch in daily use. If the
  heater doesn't follow, the switch is hidden again.
- Other heater controls (profiles, holiday mode, on and off), a shorter duration, and prices next to the switch are out
  of scope.
- The API's handover note is removed from the API repository once this spec is taken up.
