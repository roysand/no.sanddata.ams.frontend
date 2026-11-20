# Feature Specification: Warnings Inside the App

**Feature Branch**: `012-in-app-warnings`

**Created**: 2026-11-20

**Status**: Built 2026-11-20 (manual check T028 still open)

**Input**: The "Warnings" idea in `backlog.md`: "Warn the household when it matters … A first version could show the
warnings inside the app only." User description: "write the spec for warnings inside the app".

Choices made with Roy on 2026-11-20:

- **Which warnings:** three in the first version.
  - **Close to the next capacity step:** this hour risks lifting the month's grid capacity charge.
  - **Unusual usage now:** much higher than usual for this time of the week, for example a heater left on at the
    cabin.
  - **Over the Norgespris limit:** the month is expected to use more than the Norgespris monthly limit (5 000 kWh,
    1 000 for a holiday home), above which kWh are priced at spot price. This was added later the same day, with its
    own choices:
    - it warns once the expected bill projects the month over the limit
    - it shows in the same banner, after the other two.
  - Expensive hours tomorrow is left out of this version, also as a follow-up to passing the limit.
- **Where:** a banner at the top of every page, for the selected location, like the key reminder banner from spec 011.
- **Who:** everyone with access to the location, owners and viewers.
- **How:** worked out in the app from the figures it already reads. There is no API change. Push notifications, which
  would move the rules to the API, are later.
- **The capacity rule:** warn when the current hour, at its pace so far, would lift the month's average of the three
  highest daily peaks into the next step, and say how many kW to stay under this hour.
- **The usage rule:** warn when the last 15 minutes average at least twice the usual power for this hour and weekday
  (the median of the last four weeks), and at least 1 kW above it.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Stay below the next capacity step (Priority: P1)

The grid charge for the month depends on the average of the three highest daily peaks: the highest hour of each of
the three days with the most use. When the hour going on now is on its way to becoming one of those peaks and lifting
the average into the next step, a banner says so, while there is still time to act. For example: "This hour may lift
the capacity step above 10 kW. Stay under 4,2 kW for the rest of the hour". The step costs a fixed amount for the whole
month, so one careless hour can cost hundreds of kroner.

**Why this priority**: This is the warning that saves the most money, and it can only be acted on while the hour is
still going on.

**Independent Test**: For a location in the 5–10 kW step:

- with this month's top peaks at 9,5 and 9,2 kW
- and the current hour at 6 kWh after 30 minutes, which is a pace of 12 kWh for the hour

The banner shows, and names the next step and the limit for the rest of the hour. When the pace drops so that the hour
stays below the limit, the banner goes away within a minute.

**Acceptance Scenarios**:

1. **Given** this hour's pace would make the month's average reach the next step's lower limit, **When** any page is
   shown, **Then** a banner says that this hour may lift the step, names the next step, and gives the kW to stay under
   for the rest of the hour.
2. **Given** the pace would keep the average in the current step, **When** a page is shown, **Then** there is no
   capacity warning.
3. **Given** the first minutes of an hour (less than 10 minutes in), **When** the pace is worked out, **Then** no
   warning is given yet, because a few minutes are too few to judge an hour by.
4. **Given** the location is in the top step, or has no capacity steps set (no grid tariff), **When** a page is shown,
   **Then** there is no capacity warning: there is no next step to stay below.
5. **Given** the hour ends, **When** the next hour starts, **Then** the warning goes until the new hour's pace calls for
   it again.
6. **Given** the warning shows, **When** the user follows it, **Then** it leads to the Now page, where the current hour
   and the capacity card are.

---

### User Story 2 - Notice unusual usage right now (Priority: P1)

When the location uses much more power than usual for this time of the week, a banner says so. For example: "Hytta uses
3,8 kW now, about 4× the usual 0,9 kW for a Saturday at this hour". This catches a heater, oven or tap left on, which
matters most at a location nobody is at.

**Why this priority**: Roy asked for it alongside the capacity warning. It protects the cabin when no one is there, and
needs nothing new from the API.

**Independent Test**: For a location whose median power on Saturdays 14–15 over the last four weeks is 0,9 kW:

- At 3,8 kW for the last 15 minutes, the banner shows with both figures.
- At 1,7 kW, there's no warning: less than 2×.
- At 0,3 kW usual and 0,9 kW now, there's no warning: 3× the usual, but less than 1 kW above it.

**Acceptance Scenarios**:

1. **Given** the last 15 minutes average at least twice the usual power for this hour and weekday, and at least 1 kW
   above it, **When** any page is shown, **Then** a banner names the location, the power now and the usual power, and
   about how many times higher it is.
2. **Given** the usage is below either limit, **When** a page is shown, **Then** there is no usage warning.
3. **Given** fewer than three of the last four weeks have readings for this hour and weekday (a new location, or a long
   outage), **When** the usual is worked out, **Then** no usage warning is given, because there is no reliable usual
   yet.
4. **Given** the newest reading is more than 6 minutes old, so the power now is unknown, **When** a page is shown,
   **Then** no usage warning is given.
5. **Given** the usage drops back below the limits, **When** the figures refresh, **Then** the warning goes within a
   minute.
6. **Given** the warning shows, **When** the user follows it, **Then** it leads to the Now page, with the recent usage
   chart.

---

### User Story 3 - Know when the month goes over the Norgespris limit (Priority: P2)

For a location on Norgespris, the price is fixed up to a monthly limit: 5 000 kWh, or 1 000 kWh for a holiday home.
The kWh above it are priced at spot price, which in winter is often much more. When the expected bill projects the
month's use above the limit, a banner says so: for example "Hytta is expected to use 1 240 kWh this month, above the
Norgespris limit of 1 000 kWh. The kWh above it are priced at spot price". Once the limit is actually passed, it says
that instead.

**Why this priority**: For a holiday home with electric heating, 1 000 kWh is reached quickly in a cold month, and
the cost per kWh then jumps. The warning gives days to lower the heat, where the other two warnings give minutes. It is
P2 because the expected bill already shows the amounts; this makes them noticed.

**Independent Test**: For a holiday home on Norgespris:

- With an expected bill whose month is projected at 1 240 kWh, of which 1 000 kWh are within the limit, the banner shows
  the projection and the limit.
- With 840 kWh projected, all within the limit, there's no warning.
- With 1 050 kWh already used, the banner says the limit has been passed.

**Acceptance Scenarios**:

1. **Given** a Norgespris location whose expected bill projects more kWh for the month than are within the limit,
   **When** any page is shown, **Then** a banner gives the projected kWh for the month and the limit, and says that the
   kWh above it are priced at spot price.
2. **Given** the kWh used so far are already above the limit, **When** the banner is shown, **Then** it says the limit
   has been passed this month, and that the rest of the month is priced at spot price.
3. **Given** the projection stays within the limit, **When** a page is shown, **Then** there is no Norgespris warning.
4. **Given** a location on spot price, or one without a Norgespris agreement, **When** a page is shown, **Then** there
   is no Norgespris warning.
5. **Given** the expected bill can't be loaded, or has no projection yet (no readings this month), **When** a page is
   shown, **Then** there is no Norgespris warning.
6. **Given** the warning shows, **When** the user follows it, **Then** it leads to the Now page, where the expected bill
   is.

---

### User Story 4 - The warnings fit in with the rest of the app (Priority: P2)

All warnings appear in the same banner area as the key reminders. They are about the selected location only, and they
never get in the way of the page.

**Why this priority**: The warnings are only useful if they are calm enough to keep. A banner that nags is soon ignored.

**Independent Test**:

- With both warnings and a key reminder due, all three appear together without hiding the page title.
- Switching to another location shows that location's warnings, or none.
- A user with no locations sees nothing.

**Acceptance Scenarios**:

1. **Given** more than one warning, **When** the banner is shown, **Then** all are shown, in this order:
   - the capacity warning, which can still be acted on this hour
   - the usage warning
   - the Norgespris warning, which is about the month.
2. **Given** an administrator who also has a key reminder, **When** the page is shown, **Then** the warnings and the key
   reminders are shown together in one banner area, and the warnings come first.
3. **Given** the user switches location, **When** the page is shown, **Then** only the selected location's warnings are
   shown.
4. **Given** the figures behind a warning can't be loaded, **When** the page is shown, **Then** that warning is not
   shown, with no error. The page works as before.
5. **Given** a narrow phone screen, **When** warnings are shown, **Then** each fits on at most two lines, and the page
   content starts right after them.

---

### Edge Cases

- **Inactive location:** it is never selected on the dashboard, so it gets no warnings.
- **A location with several meters:** the warnings use the location's total, as the rest of the app does.
- **Clock changes:** "this hour" and "this weekday" follow Oslo time, as the rest of the app does. The 25-hour day's
  repeated hour is compared with its own readings.
- **The first day of a month:** there are no peaks yet. The current hour alone can't lift a three-peak average into the
  next step unless it is three times that step's limit, and the rule handles that by itself.
- **A day already among the top three peaks:** only the day's highest hour counts as its peak. An hour today that
  doesn't beat today's peak so far can't lift the average, so it gets no warning.
- **The water heater:** its use is part of the location's use, and counts as normal. It is not singled out.
- **The overview page for several locations:** it shows no banner of its own in this version. The banner follows the
  selected location.
- **Reminders outside the app:** e-mail and push are out of scope.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST show a capacity warning for the selected location when all of these hold:
  - more than 10 minutes of the current hour have passed
  - the location has a next capacity step
  - the hour's use at its pace so far, extended to the whole hour, would make the month's average of the three highest
    daily peaks reach at least the next step's lower limit.
- **FR-002**: The capacity warning MUST name where the next step starts (its lower limit in kW), and the highest
  average power to keep for the rest of the hour so the hour stays below the limit. It is given in kW, rounded down
  to one decimal.
- **FR-003**: The app MUST show a usage warning for the selected location when the average power over the last 15
  minutes is at least twice the usual power, and at least 1 kW above it.
  - **The usual power** is the median of the same hour and weekday over the last four weeks.
  - **No warning** is given when fewer than three of those weeks have readings, or when the newest reading is more than
    6 minutes old.
- **FR-004**: The usage warning MUST give the power now, the usual power, and how many times higher it is, rounded to
  a whole number.
- **FR-005**: The warnings MUST be shown in a banner at the top of every page, for anyone who may see the location,
  owners and viewers.
  - The banner shares its area with the key reminders.
  - The warnings come first: capacity, then usage, then Norgespris.
- **FR-006**: Each warning MUST lead to the Now page of its location.
- **FR-007**: A warning MUST go away by itself within a minute of its condition no longer holding. There is nothing to
  dismiss.
- **FR-008**: If the figures behind a warning can't be loaded, the app MUST leave that warning out, show no error, and
  work as before.
- **FR-009**: The warnings MUST be worked out from figures the app already reads, so they add no new kind of request.
  They may add requests for those same figures on pages that don't load them today.
- **FR-010**: For a location on Norgespris, the app MUST show a Norgespris warning when the current month's expected
  bill projects more kWh than are within the Norgespris limit.
  - **The limit and the projection** are taken from the expected bill: the kWh within the limit (the Norgespris
    credit's kWh) and all the month's kWh (the energy's kWh).
  - **The text:** the warning gives the projected kWh and the limit. When the kWh used so far already exceed the limit,
    it says the limit has been passed instead.
  - **Not shown** for spot-price locations, without a projection, or when the bill can't be loaded.

### Key Entities

- **Capacity warning**: the location, the next step (its lower and upper kW), and the power to stay under for the rest
  of the hour. It is derived from this month's daily peaks, the current step and the current hour's use so far.
- **Usage warning**: the location, the power now (the last 15 minutes), the usual power for this hour and weekday, and
  the ratio. It is derived from the recent per-minute readings and the last four weeks of hourly use.
- **Norgespris warning**: the location, the month's projected kWh, the limit, and whether it is already passed. It is
  derived from the current month's expected bill.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: When the current hour's pace would raise the capacity step, the warning appears within one minute of
  that being true, and while at least 20 minutes of the hour remain whenever the pace was clear by then.
- **SC-002**: The capacity warning's limit, when kept for the rest of the hour, keeps the month in its current step.
  It is checked against the capacity charge figures after the hour.
- **SC-003**: Over a normal week at Hjemme, the usage warning appears at most a few times. A test with a 2 kW heater
  switched on at an otherwise quiet hour makes it appear within two minutes.
- **SC-004**: Pages that already read these figures make no extra requests for the warnings.
- **SC-005**: The banner, with up to three warnings and three key reminders, reads well at 375 px, in light and dark
  mode.
- **SC-006**: The Norgespris warning gives the same projected kWh and limit as the expected bill's Norgespris lines.
  It appears on the first page view after the bill's projection crosses the limit.

## Assumptions

- **The capacity charge** follows the grid company's rule as the app shows it today: the average of the three highest
  daily peaks in the month, where a day's peak is its highest hourly kWh. The month's current step and the next one
  come from the figures the capacity card already reads.
- **The pace:** an hour's use so far, extended to 60 minutes, is a fair forecast after 10 minutes. Heating and the water
  heater run evenly within an hour.
- **The usual:** the median of four weeks is robust against a single unusual day. Readings already arrive about once a
  minute.
- **The Norgespris limit:** the expected bill's Norgespris credit covers only the kWh within the limit, while its
  energy line covers all the month's kWh. So the month is projected over the limit exactly when the credit has fewer
  kWh, and the credit's kWh are then the limit. Both quantities include the projection for the rest of the month.
- **Fixed rules:** the thresholds (10 minutes, 2×, 1 kW, 15 minutes, 3 of 4 weeks) are fixed in this version, not
  settings.
- **Out of scope:**
  - warnings about expensive hours tomorrow (left out by Roy, also as a follow-up to passing the Norgespris limit)
  - warning before the projection reaches the Norgespris limit (for example within 10 %). That needs the API to send the
    limit; today it can only be read from the bill once the projection is over it.
  - e-mail and push
  - silencing a warning
  - a history of past warnings.
