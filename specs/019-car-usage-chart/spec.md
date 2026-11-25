# Feature Specification: A Usage Chart for the Car, on the Car Tab

**Feature Branch**: `019-car-usage-chart`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description (Roy, 2026-11-25): "The tile Usage on the page Now I want the same on the Car page. I want
to replace the 'sessions last 30 days' with a graph like the tile usage."

The Now page's "Usage" tile charts the house's kWh for a day, a week, a month or a year, against the period before,
with the total, the change in per cent, and arrows to step back. The Car tab shows the car charger's state right now
(spec 017), today's and this month's charging (spec 013), and a list of the completed sessions of the last 30 days.
Roy wants the list replaced by the same chart as "Usage", for the car's charging.

The car's kWh per hour and per day are already in the figures the app reads for the house: the Car tab's "Today" and
"This month" come from them. No API change is needed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Chart the car's charging like the house's usage (Priority: P1)

On the Car tab, below "Charging", a "Car usage" tile charts the car's kWh with the same switch, arrows, total,
comparison and look as "Usage" on Now: today hour by hour against yesterday, a week day by day, a month day by day,
a year month by month.

**Why this priority**: It is what Roy asked for: see when and how much the car charges, as he sees the house.

**Independent Test**: For Hjemme on a day the car charged in the evening, open the Car tab: the tile shows today's
hours with the charging hours raised, the day's total so far equal to the "Today" figure above, and yesterday as the
faint comparison. Switch to Month: a bar per day, the month's total equal to "This month".

**Acceptance Scenarios**:

1. **Given** the Car tab, **When** it is shown, **Then** a "Car usage" tile replaces "Sessions, last 30 days", below
   the "Charging" card.
2. **Given** Day, **When** shown, **Then** the car's kWh per hour today so far are drawn, with "Today so far" and the
   total in kWh, and without yesterday: the car isn't charged every day, so a day has no comparison (Roy,
   2026-11-25).
3. **Given** Week, Month or Year, **When** shown, **Then** this period and the one before are drawn as bars side by
   side, each with its value, as on Now.
4. **Given** a week, month or year with charging in the period before, **When** shown, **Then** the change in per
   cent against it is shown as on Now ("▲ 12% vs last week").
5. **Given** the arrows, **When** pressed, **Then** the chart steps back and forward one period, never past now, and
   stops only where the meter has no readings, so days without charging don't block the way back.
6. **Given** a point is tapped or chosen with the arrow keys, **When** shown, **Then** it gives that hour, day or
   month's kWh and the period before's, as on Now.
7. **Given** the car counted with the house or not, **When** charted, **Then** the car's kWh are the same: the chart
   shows the car's own charging either way.

---

### User Story 2 - The tab without the session list (Priority: P1)

The session list goes. The Car tab reads: the charger now, "Charging" (today and this month), then "Car usage".

**Acceptance Scenarios**:

1. **Given** the Car tab, **When** shown, **Then** "Sessions, last 30 days" is not shown and its figures are no
   longer asked for.
2. **Given** the note in "Charging" about finished charges, **When** shown, **Then** it no longer mentions sessions
   and still says the finished charge shows about 15 minutes after it ends, in the figures and the chart.

---

### Edge Cases

- **No charging in the period**: "Nothing to chart yet" for the current period and "No charging in {period}" for an
  earlier one, never a chart of zeros.
- **In kWh only**: the switch between kWh and NOK on Now is left out: the API prices the car on the bill only (spec
  016), not per hour or day.
- **A charge in progress** is not in the chart until about 15 minutes after it ends, as in "Charging"; the live
  figures (spec 017) are never added (FR-008 of spec 017).
- **Charging hours without a house reading**: they are left out of the hour-by-hour figures, as the "Charging" card
  already says; the day, week, month and year figures include them.
- **The period choice** is remembered on its own: choosing Month on the Car tab doesn't change Now's chart, and the
  other way round.
- **No charger**: the tab already says none is connected and asks for nothing; the tile is not shown.
- **Phone width and dark mode**: as "Usage" on Now, in the car's colour.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Car tab MUST show a "Car usage" tile with the car's charged kWh for a day, a week, a month or a year,
  drawn, compared, totalled and stepped through as the "Usage" tile on Now.
- **FR-002**: The tile MUST replace "Sessions, last 30 days"; the session list MUST NOT be shown or asked for.
- **FR-003**: The tile MUST show kWh only, and the car's own kWh whether or not the car is counted with the house.
- **FR-004**: The tile's figures MUST agree with "Charging": today's total with "Today", this month's with "This
  month".
- **FR-005**: The tile's period choice MUST be remembered apart from Now's chart.
- **FR-006**: A period without charging MUST say so instead of drawing zeros.
- **FR-007**: The note in "Charging" MUST be reworded without the sessions.
- **FR-008**: The tile MUST be usable by keyboard and screen reader as "Usage" on Now is.

### Key Entities

- **The car's kWh per hour, day or month** (from the house's hourly and daily figures): the car charger's kWh in each
  part of the period, and in the period before.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Today's and this month's totals in the tile equal "Today" and "This month" in "Charging" to 0,1 kWh.
- **SC-002**: The tile behaves as "Usage" on Now: the same switch, arrows, comparison and tap-for-details, so Roy needs
  nothing new to read it.
- **SC-003**: At 375 px, in light and dark mode, the tile fits without sideways scrolling.
- **SC-004**: Opening the Car tab makes no request for the session list.

## Assumptions

- The car's kWh per hour and per day come with the house's figures (spec 013), with or without the car counted with
  the house; the hour-by-hour figures leave out hours without a house reading.
- The tile reuses the Now tile's look and behaviour; it is drawn in the car's colour, which the Now chart already uses
  for car charging.
- The sessions endpoint and its figures stay in the API, unused by the app; the estimated mark on sessions goes with
  the list.
- Roy chose to drop the list (2026-11-25); bringing it back later, for example as a detail behind a tapped day, is out
  of scope.
