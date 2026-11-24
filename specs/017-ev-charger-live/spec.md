# Feature Specification: The Car Charger's State Right Now

**Feature Branch**: `017-ev-charger-live`

**Created**: 2026-11-24

**Status**: Draft

**Input**: User description: "The car charger's state right now, on top of API spec 021" (`no.sanddata.ams.api` →
`specs/021-ev-charger-live/`, merged and deployed 2026-11-24; handover in `specs/_backlog/ev-charger-live-frontend.md`).

Spec 013 put the car charger on its own Car tab, from Zaptec's **finished** sessions, so a charge in progress shows
nowhere until about 15 minutes after it ends. On 2026-11-24 the car was charging and the app showed nothing. API spec
021 now answers the charger's state right now: no car, connected but not charging, charging, finished, offline, with
the power, the charge's kWh so far, when the car was plugged in, when charging started, and when the values were read.
The API reads Zaptec at most every 3 minutes per charger and only when someone asks.

Chosen with Roy on 2026-11-24:

- The **Car tab** shows the charger's state with its details: no car, connected but not charging, charging, finished
  charging, offline, and when it was last updated.
- The **Now page** shows a line while the car is charging: "Car charging now: 4,4 kW · 13,0 kWh this charge · since
  16:37".
- An update **every 3 minutes** is enough.
- The Car tab's state tile has a **picture**: a car with a cable to the charger. While the car charges, a green line
  runs along the cable from the charger to the car, and starts again from the charger when it reaches the car (Roy's
  sketch, 2026-11-24).

## Clarifications

### Session 2026-11-25

- Roy: while the car charges, the Now page also shows a tile, below "Last 3 hours" and above "What Norgespris has
  saved", with the same state and figures as the Car tab, in place of the line in "Right now", which is removed; the
  drawing waits for now: "Charging · 4,5 kW · 25,0 kWh this charge · charging since
  16:37 · plugged in at 15:52 · updated 1 minute ago" (FR-013).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the charger's state on the Car tab (Priority: P1)

At the top of the Car tab, above "Charging", a card says what the charger is doing right now, with its details and when
it was last updated, for example:

- **Charging** · 4,4 kW · 13,0 kWh this charge · charging since 16:37 · plugged in at 15:52 · updated 1 min ago
- **Connected, not charging** · 13,0 kWh this charge · plugged in at 15:52 · updated 2 min ago
- **Finished charging** · 24,6 kWh this charge · plugged in at 15:52 · updated 1 min ago
- **No car connected** · updated 1 min ago
- **Offline** · last reported 14:10 · updated 1 min ago

**Why this priority**: It is what Roy asked for: a charge in progress is seen while it happens, not 15 minutes after.

**Independent Test**: While the car charges at Hjemme, open the Car tab: it says charging, with about the power and kWh
the Zaptec app shows, when charging started and when it was updated. Unplug the car: within about 3 minutes it says no
car connected.

**Acceptance Scenarios**:

1. **Given** a car charging, **When** the Car tab is open, **Then** it shows "Charging", the power in kW, the charge's
   kWh so far, when charging started, when the car was plugged in, and how long ago it was updated.
2. **Given** a car connected but not charging (waiting or paused), **When** the Car tab is open, **Then** it shows
   "Connected, not charging", the charge's kWh so far if there are any, when the car was plugged in, and no power.
3. **Given** a charge finished with the car still connected, **When** the Car tab is open, **Then** it shows "Finished
   charging", the charge's kWh, when the car was plugged in, and no power.
4. **Given** no car connected, **When** the Car tab is open, **Then** it shows "No car connected" and no figures.
5. **Given** the charger is offline, **When** the Car tab is open, **Then** it shows "Offline" with when the charger
   last reported, if known, and no figures.
6. **Given** a state the app doesn't know, **When** the Car tab is open, **Then** it shows "Status unknown", with the
   charge's kWh if there are any.
7. **Given** the tab stays open, **When** 3 minutes pass, **Then** the state is asked for again, and "updated … ago"
   moves on between updates.
8. **Given** the state can't be read (the charger service is unavailable), **When** the Car tab is open, **Then** the
   card says the charger's state is unavailable right now, the rest of the tab is shown as before, and it tries again
   at the next update.

---

### User Story 3 - See the charge flow in a picture (Priority: P2)

At the top of the state tile, a drawing shows the car from the front and the charger post beside it, joined by a
cable. While the car charges, a green line runs along the cable from the charger to the car, about once every 1,5
seconds, and starts again from the charger each time it reaches the car. The charger's lightning bolt is green.

**Why this priority**: It makes the state readable at a glance; the text says the same, so the tab works without it.

**Independent Test**: With a charge running, open the Car tab: the green line moves from the charger to the car and
repeats. Unplug the car: within about 3 minutes the line stops and the cable is gone.

**Acceptance Scenarios**:

1. **Given** the state is charging, **When** the tile is shown, **Then** the green line runs from the charger to the
   car, over and over, and the lightning bolt is green.
2. **Given** connected, not charging or finished charging, **When** the tile is shown, **Then** the cable joins car
   and charger, with no green line moving and a grey bolt.
3. **Given** no car connected, **When** the tile is shown, **Then** the car is faded and no cable is drawn.
4. **Given** offline, status unknown or unavailable, **When** the tile is shown, **Then** the whole picture is faded
   and nothing moves.
5. **Given** the device asks for reduced motion, **When** the car charges, **Then** the cable is shown green and still.
6. **Given** a screen reader, **When** it reaches the picture, **Then** it reads one short description of the state,
   such as "A car charging from the charger".

---

### User Story 2 - See a running charge on the Now page (Priority: P1)

> **Changed 2026-11-25** (Roy): the line in "Right now" is removed; the Now page shows the "Car charging" tile of
> FR-013 instead. The scenarios below hold for that tile.

While the car charges, the Now page shows a line in the "Right now" card: "Car charging now: 4,4 kW · 13,0 kWh this
charge · since 16:37". In every other state, there is no line.

**Why this priority**: Roy looks at the Now page most; a charge running alongside the house is worth seeing there.

**Independent Test**: While the car charges at Hjemme, open Now: the line shows the power, the kWh and when charging
started. When the charge ends, the line is gone within about 3 minutes.

**Acceptance Scenarios**:

1. **Given** a car charging, **When** the Now page is open, **Then** the "Right now" card shows "Car charging now:
   {kW} · {kWh} this charge · since {time}".
2. **Given** any other state (no car, connected, finished, offline, unknown) or an unavailable state, **When** the Now
   page is open, **Then** no car line is shown.
3. **Given** a location without a car charger, **When** the Now page is open, **Then** the state is never asked for
   and no line is shown.
4. **Given** the car line, **When** it is shown, **Then** the house's power, cost and price figures are unchanged: the
   car's power is not added to or taken from them.

---

### Edge Cases

- **A charge that started on an earlier day**: "since" and "plugged in at" give the date as well as the time, for
  example "since 23.11. 23:10", as the app writes dates elsewhere; times from today give only the time.
- **No kWh sent while connected**: the kWh are left out, never shown as 0 kWh unless the API says 0 (a new charge).
- **A new charge**: the kWh start again from 0 kWh with the new charge.
- **Never counted twice**: the live kWh are not added to the Car tab's "Today" or "This month", nor to any usage,
  cost or bill figure. The finished charge shows in those, and in the session list, about 15 minutes after it ends.
- **The Car tab's hint** "A charge in progress shows here about 15 minutes after it ends." is reworded so it still holds
  for the figures and sessions, and points to the state card above.
- **No access or a location that is gone**: nothing is shown and the app stops asking.
- **Signed out**: handled as elsewhere in the app.
- **Switching location**: the card and the line follow the selected location; a location without a charger shows
  neither.
- **Phone width**: at 375 px the state card's details wrap, and the Now line may wrap to two lines.
- **Rounding**: power and kWh are shown with one decimal ("4,4 kW", "13,0 kWh"), in the app's number format.
- **Times** are shown in Oslo time.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Car tab MUST show, above the "Charging" card, the charger's state right now: "Charging", "Connected,
  not charging", "Finished charging", "No car connected", "Offline" or "Status unknown".
- **FR-002**: With the state, the Car tab MUST show the details the API sends for it: the power in kW (only while
  charging), the charge's kWh so far, when charging started, when the car was plugged in, and, when offline, when the
  charger last reported.
- **FR-003**: The Car tab MUST say how long ago the state was updated ("updated 2 min ago"), and this text MUST move on
  between updates.
- **FR-004**: _Replaced by FR-013 on 2026-11-25._ The Now page MUST NOT show a car line in the "Right now" card.
- **FR-005**: The app MUST ask for the state every 3 minutes while a page that shows it is open, and MUST NOT ask for a
  location without a car charger.
- **FR-006**: When the state can't be read, the Car tab MUST say it is unavailable right now and the Now page MUST show
  no car line; the app MUST try again at the next update. The rest of both pages MUST be shown as before.
- **FR-007**: A state the app doesn't know MUST be shown as "Status unknown".
- **FR-008**: The live figures MUST NOT be added to any usage, cost, bill or Norgespris figure, nor to the Car tab's
  "Today" or "This month".
- **FR-009**: Times MUST be shown in Oslo time, with the date for a time before today.
- **FR-010**: The Car tab's hint about a charge in progress MUST be reworded to fit the new state card.
- **FR-013**: While the car charges, the Now page MUST show a "Car charging" tile below "Last 3 hours" and above
  "What Norgespris has saved": the figures on three lines with a small drawing on their right (as the Car tab's, moving
  while charging): (the charging speed, the charge's kWh, and the times) and the age; without the state's heading (the
  title says it). In every other state, while loading and when the state is unavailable, the tile MUST NOT be shown.
  The power reads "{kW} charging speed" on both tiles (Roy, 2026-11-25).
- **FR-011**: The state tile MUST show a drawing of a car joined by a cable to a charger. While charging, a green line
  MUST run along the cable from the charger to the car and start again from the charger, without end; in other
  states the drawing MUST follow User Story 3.
- **FR-012**: The drawing MUST be the app's own: no car maker's photo, logo or model name. It MUST look right in light
  and dark mode and MUST NOT move when the device asks for reduced motion.

### Key Entities

- **Charger state now** (from the API, per location): the state, whether it is online, the power in kW, the charge's
  kWh so far, when the car was plugged in, when charging started, when the charger last reported, and when the values
  were read. Shown only; nothing is kept.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: During a charge, the Car tab and the Now line show the power and kWh the Zaptec app shows, within one
  update (about 3 minutes).
- **SC-002**: When the car is unplugged or the charge ends, the Car tab's state and the Now line follow within about
  3 minutes.
- **SC-003**: With the Car tab or the Now page open for an hour, the app asks for the state at most 21 times.
- **SC-004**: The Car tab's "Today" and "This month", the bill and the house's figures on Now are the same, to the
  decimal, with and without this feature.
- **SC-005**: At 375 px, in light and dark mode, the state card and the Now line are readable without sideways
  scrolling, and the whole drawing fits in the tile.
- **SC-006**: Asked "is the car charging?", someone looking at the Car tab for the first time answers correctly from
  the picture alone.

## Assumptions

- API spec 021 is deployed (2026-11-24). The field names, states and error codes are in its contract,
  `specs/021-ev-charger-live/contracts/endpoints.md` in the API repository.
- "Updated … ago" is from when the API read the charger; the charger's own last report is shown only when offline.
- An unavailable state is shown as unavailable, not as the last state read, so an old state never looks current.
- Starting, stopping or limiting a charge is out of scope: the state is read only.
- The live state on the History page, in charts and in the CSV export is out of scope.
- The car line on Now sits in the "Right now" card, below the house's figures; the Car tab card is its own card at
  the top of the tab, with the drawing above the state and its details.
- The drawing follows the preview agreed with Roy on 2026-11-24 (`picture-preview.html` in this folder): a generic car seen from the front, a dark charger
  post on its right with a lightning bolt, and a cable curving down between them, as in his sketch, but drawn for the
  app instead of a photo.
