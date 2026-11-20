# Feature Specification: The EV Charger in the App

**Feature Branch**: `013-ev-charger`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "EV charger in the frontend — see ../no.sanddata.ams.api/specs/_backlog/ev-charger-frontend.md"

Backend feature: `no.sanddata.ams.api` → `specs/016-zaptec-ev-charger/` (built 2026-11-20), with its contract in
`contracts/endpoints.md`. The charger has its own supply, so its energy is not in the house's meter readings. The API
reads the charger's completed charging sessions from Zaptec, stores them per hour, and adds a per-location setting
that decides whether the car's kWh are counted with the house's usage. The charger is **not priced**: every cost and
the whole bill stay the house's own.

Choices made with Roy on 2026-11-20:

- The car's own figures and the charging sessions are on a new **Car** tab, shown only for a location with a charger
  (like the Heater tab).
- The checkbox "Count the car charger with the house" is at the top of the Car tab. Owners and Admins can change it;
  viewers see it read-only.
- With the checkbox **off**, the usage chart is the house only, exactly as today. With it **on**, the car is drawn as
  its own part of each bar, in kWh.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - An Admin connects a Zaptec charger to a location (Priority: P1)

In the location's admin dialog, an Admin sees whether a charger is connected. To connect one, they open a separate
dialog that lists the chargers the server's Zaptec sign-in can see (charger name and installation name), pick one and
save. The Admin can also replace or remove the connection.

**Why this priority**: Nothing else shows anything until a charger is connected, and nobody should have to look up a
charger id.

**Independent Test**: As Admin, open Hjemme in the admin locations page, connect the charger "Garasje" from the list,
and see the section say it is connected, with the charger and installation names and when it was connected. Remove it,
confirm, and the section says no charger is connected.

**Acceptance Scenarios**:

1. **Given** a location without a charger, **When** an Admin opens its admin dialog, **Then** a charger section says
   no charger is connected and offers Connect.
2. **Given** Connect, **When** the connect dialog opens, **Then** it lists the chargers the server can see, each with
   its name and its installation's name, and the Admin picks one and saves with a button named for the action
   ("Connect charger").
3. **Given** a connected charger, **When** the section is shown, **Then** it gives the charger name, installation
   name, when it was connected, how far its data has been read, and whether it is counted with the house, with
   Replace and Remove.
4. **Given** Replace, **When** the Admin picks another charger and saves, **Then** the new one replaces the old, and
   the section notes that the new charger's history is read back.
5. **Given** Remove, **When** the Admin confirms, **Then** the connection is removed, and the confirmation says that
   charging data already read is kept and that the car is no longer counted with the house.
6. **Given** the server has no Zaptec sign-in, or Zaptec rejects it or cannot be reached, **When** the list or a save
   is asked for, **Then** the dialog shows the API's message (for example that the Zaptec sign-in is not set up on the
   server) and nothing is saved.
7. **Given** a charger that is already connected to another location, **When** the Admin saves it, **Then** the
   dialog says the charger is in use, and nothing is saved.
8. **Given** a user who is not Admin, **Then** there is no charger section anywhere in the app's admin pages.

---

### User Story 2 - The Car tab shows what the car charged (Priority: P1)

A household member of a location with a charger sees a **Car** tab. It shows the kWh charged today and this month, and
the list of completed charging sessions, newest first: when each started and ended, how long it took, and its kWh.

**Why this priority**: It is useful on its own ("the car used 212 kWh this month") and is where the checkbox lives.

**Independent Test**: Charge the car, stop, wait 15 minutes, open the Car tab for Hjemme: the session is at the top of
the list with the same start, end and kWh (± 0,01 kWh) as the Zaptec app, and today's kWh include it.

**Acceptance Scenarios**:

1. **Given** a location with a connected charger, **When** the app is shown, **Then** the tab bar has a Car tab, and
   for a location without a charger it has none.
2. **Given** the Car tab, **When** it is shown, **Then** it gives the kWh charged today and this month. Neither has a
   cost.
3. **Given** a session that ended in the current hour, **When** both figures are shown, **Then** "This month" is never
   less than "Today".
4. **Given** the month's charging began after the 1st (for example the charger was connected on the 18th), **When** the
   month figure is shown, **Then** it says since when.
5. **Given** no charging data today or this month, **When** the figures are shown, **Then** they say there is no
   charging yet, never "0 kWh".
6. **Given** the sessions list, **When** it is shown, **Then** it covers the last 30 days, newest first, with each
   session's date, start and end time, duration and kWh. A session marked as estimated says so.
7. **Given** no completed sessions in the last 30 days, **When** the list is shown, **Then** it says so.
8. **Given** the Car tab, **When** it is shown, **Then** it says, near the figures, that a charge in progress is not
   shown until it has ended, and appears within about 15 minutes after.
9. **Given** the figures and the list, **When** the tab is open, **Then** they refresh by themselves at least every 15
   minutes.

---

### User Story 3 - Count the car with the house (Priority: P1)

At the top of the Car tab, a checkbox "Count the car charger with the house" decides whether the car's kWh are added
to the house's usage. It is one setting for the whole location, shared by everyone who sees it.

**Why this priority**: It is the feature Roy asked for: seeing the house and the car as one household's electricity.

**Independent Test**: As owner of Hjemme, tick the checkbox. The Now and History usage charts in kWh grow by the car's
part on the hours and days the car charged. Untick it, and the charts are exactly as before.

**Acceptance Scenarios**:

1. **Given** an owner or Admin, **When** they change the checkbox, **Then** it is saved for the location at once, and
   the usage figures across the app follow without a page reload.
2. **Given** saving fails, **When** the answer comes back, **Then** the checkbox goes back to what it was, and the
   API's message is shown.
3. **Given** a viewer, **When** the Car tab is shown, **Then** the checkbox shows the current setting but cannot be
   changed, with a note that only the owner can change it.
4. **Given** the checkbox, **When** it is shown, **Then** a short line under it says that the car is counted in kWh
   only: costs and the bill stay the house's own.

---

### User Story 4 - The car in the usage chart and the bill (Priority: P2)

With the checkbox on, the usage chart on Now and History, in kWh, shows the car as its own part of each hour or day,
next to water heating and everything else. The selected point's detail line gives the car's kWh. The bill's kWh show
the car too, and the CSV export carries the car's kWh.

**Why this priority**: The tab already gives the totals; this places the car in time and alongside the house.

**Independent Test**: With the checkbox on, open History, the day view of a day the car charged. The charging hours
show a car part at the top of the bar, the detail line reads for example "4,6 kWh · Car charging 3,2 kWh · Water
heating 0,4 kWh · Everything else 1,0 kWh", and the bar's height is the house plus the car. Switch to kr: no car part,
and the bars are the house's cost as before.

**Acceptance Scenarios**:

1. **Given** the checkbox on and a slot with car charging, **When** the chart is shown in kWh, **Then** the slot's bar
   is the house plus the car, with the car as its own part, and a legend entry "Car charging".
2. **Given** the checkbox off, **When** the chart is shown, **Then** it is exactly as today: no car part, no legend
   entry, house-only totals.
3. **Given** the chart in kr, **When** it is shown, **Then** it never shows a car part, whatever the setting, and its
   bars are the house's cost.
4. **Given** a slot without charging, **When** it is shown, **Then** it has no car part, and its detail line says
   nothing about the car (never "Car charging 0 kWh").
5. **Given** a day with charging hours that had no house reading, **When** that day is shown in a week, month or year
   view, **Then** its car part includes those hours. In the day view those hours have no bar; the Car tab notes how
   many hours of charging are not in the hour-by-hour chart.
6. **Given** the previous period drawn for comparison, **When** the checkbox is on, **Then** it is compared on the
   same basis (house plus car), so the comparison is fair.
7. **Given** the bill of a month with charging, **When** it is shown, **Then** a line gives the car's kWh for the
   month so far (and since when, if it began after the 1st) and whether it is counted with the house. No amount on
   the bill changes.
8. **Given** a CSV export with charging data, **Then** each row has a "Car charging (kWh)" column (empty when there was
   none) and a "Counted with the house" flag, and the existing usage and cost columns are unchanged.

---

### Edge Cases

- **Charger removed**: the Car tab disappears with the connection. Sessions already read are kept by the API, but there
  is nowhere to see them until a charger is connected again. The checkbox is off after a removal.
- **A charge in progress**: not shown anywhere until it has ended (Zaptec gives completed sessions only). The Car tab
  explains this; the Now card's current hour shows the car only if a session ended in that hour.
- **A session that crosses midnight or the month's end**: its kWh are counted in the hours they were used, so each
  day's and month's figures hold their own part. In the list it is one session, shown under the day it ended.
- **Estimated sessions**: Zaptec's estimate is shown as such in the list; the figures count them like any other.
- **Costs**: never derived from the car. No price per kWh is ever computed as cost ÷ (house + car).
- **The month figure and the running hour**: the bill counts only finished hours, so the month adds today's car kWh
  after the bill's last hour, as the Heater tab does (PR #45).
- **An older API without the charger fields**: the app behaves as today: no Car tab, no checkbox, house-only figures.
- **A location with both a heater and a charger**: the tab bar has five tabs and must still fit a 375 px wide phone.
- **Warnings, capacity step, standby, heatmap, cheapest time and Norgespris**: these stay about the house's meter,
  whatever the setting. The capacity step is the house's own supply; the car has its own.

## Requirements _(mandatory)_

### Functional Requirements

**Admin connection**

- **FR-001**: The admin location dialog MUST show, to Admins only, whether a charger is connected, with the charger
  and installation names, when it was connected, how far its data has been read and whether it is counted with the
  house.
- **FR-002**: An Admin MUST be able to connect a charger by picking it from the list of chargers the server can see,
  in its own dialog with Cancel and a named save button at the bottom.
- **FR-003**: An Admin MUST be able to replace a connected charger in the same way, and to remove the connection
  after confirming.
- **FR-004**: When the server has no Zaptec sign-in, Zaptec rejects it, Zaptec is unavailable, or the charger is in
  use by another location, the app MUST show the API's message and save nothing.

**Car tab**

- **FR-005**: The tab bar MUST show a Car tab when, and only when, the selected location has a connected charger.
- **FR-006**: The Car tab MUST show the kWh charged today and this month, without cost. "This month" MUST never be
  less than "Today"; when the month's charging began after the 1st, it MUST say since when.
- **FR-007**: Missing charging data MUST be shown as "no charging yet", never as 0 kWh.
- **FR-008**: The Car tab MUST list completed sessions of the last 30 days, newest first, with date, start, end,
  duration and kWh, and MUST mark estimated sessions.
- **FR-009**: The Car tab MUST say that a charge in progress appears only after it has ended, within about 15 minutes.
- **FR-010**: The Car tab's figures and list MUST refresh by themselves at least every 15 minutes while it is open.

**The checkbox**

- **FR-011**: The Car tab MUST show the checkbox "Count the car charger with the house" with the location's current
  setting, and a line saying the car is counted in kWh only.
- **FR-012**: Owners and Admins MUST be able to change it; the change MUST be saved at once and every usage figure in
  the app MUST follow without a reload. On failure the checkbox MUST return to its previous state and show the
  API's message.
- **FR-013**: Viewers MUST see the checkbox read-only with a note that only the owner can change it.

**Usage figures**

- **FR-014**: With the checkbox on, the usage chart in kWh (Now and History, every period) MUST draw each slot as the
  house plus the car, with the car as its own part and a "Car charging" legend entry; the selected slot's detail line
  MUST give the car's kWh.
- **FR-015**: With the checkbox off, the usage chart MUST be exactly as today.
- **FR-016**: In kr, the chart MUST never show the car and MUST stay the house's cost.
- **FR-017**: With the checkbox on, the previous period MUST be compared on the same basis as the current one.
- **FR-018**: Day, week, month and year totals MUST include charging hours that had no house reading; the Car tab
  MUST note how many hours of the month's charging are not shown hour by hour (plan research R4).
- **FR-019**: The bill MUST show the car's kWh for the month so far and whether they are counted with the house, and
  MUST NOT change any amount.
- **FR-020**: The CSV export MUST add the car's kWh and whether it was counted, and MUST keep its existing columns
  unchanged.
- **FR-021**: No cost, price per kWh, Norgespris figure, capacity step, warning, standby, heatmap or cheapest-time
  figure MAY include the car.
- **FR-022**: When the API does not send the charger fields, the app MUST behave as it does today.

### Key Entities

- **Charger connection**: which Zaptec charger belongs to a location (charger and installation names), when it was
  connected, how far its data has been read, and the "counted with the house" setting. One per location.
- **Car part of a slot**: the car's kWh in an hour, a day or the month so far; whether it is estimated; whether it is
  counted with the house; for days and the month, how many charging hours had no house reading; for the month, the
  first and last charging hour.
- **Charging session**: one completed charge, with start, end, kWh and whether Zaptec estimated it.
- **Total usage**: the house's kWh plus the car's when counted, otherwise the house's kWh. Costs are never based on it.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An Admin can connect a charger to a location in under 1 minute, without typing an id.
- **SC-002**: A finished charge appears on the Car tab within 15 minutes of ending, with kWh within ± 0,01 kWh of the
  Zaptec app.
- **SC-003**: After the checkbox is changed, every usage chart shows the new basis within 5 seconds, without a reload.
- **SC-004**: With the checkbox off, the Now and History charts, the bill and every cost are identical to before this
  feature.
- **SC-005**: With the checkbox on, every cost, the bill's amounts, the capacity step and the warnings are identical
  to with it off.
- **SC-006**: "This month" on the Car tab is never less than "Today".
- **SC-007**: With both a heater and a charger, all five tabs fit a 375 px wide screen without scrolling sideways.

## Assumptions

- The API from its spec 016 is deployed before this is released; until then the app behaves as today (FR-022).
- One charger per location, as the API allows.
- The sessions list covers the last 30 days (the API's default); paging further back is out of scope for this version.
- The current hour on the Now card follows the checkbox for kWh only, and shows the car only if a session ended in
  that hour.
- A Car tab icon from the existing icon set is used; no new dependency.
- The Zaptec sign-in is set up on the server; the app never asks for a Zaptec password.
- Charging cost (pricing the car's kWh) is out of scope, as in the API.
