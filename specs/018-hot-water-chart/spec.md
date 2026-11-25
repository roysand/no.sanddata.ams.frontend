# Feature Specification: Hot Water Used, on the Heater Tab

**Feature Branch**: `018-hot-water-chart`

**Created**: 2026-11-25

**Status**: Draft

**Input**: User description: "The hot water chart, on top of API spec 020" (`no.sanddata.ams.api` →
`specs/020-water-heater-consumption/`, deployed and checked in production on 2026-11-25; handover in
`specs/_backlog/water-heater-hot-water-frontend.md`).

Roy showed the OSO app's "Consumption (V40)" chart and asked for the same on the Heater tab: bars of the litres of
40 °C water (V40) used per hour of a day, with a Day / Week / Month / Year switch and the period's total ("Total v40
used 317 L"). OSO keeps no history, so API spec 020 started recording the tank's hot water on 2026-11-24 and now
answers the litres used in each part of a period, with the total and how much of each part was sampled.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See the hot water used today, hour by hour (Priority: P1)

On the Heater tab, a "Hot water used" card shows a bar for each hour of today so far, in litres of 40 °C water, and
the total: "Total V40 used 125 L". A morning shower shows as a tall bar at 07:00; quiet hours show low bars or none.

**Why this priority**: It is the chart Roy asked for, and the day is what he compares with the OSO app.

**Independent Test**: For Hjemme on a day with a shower at about 07:00, open the Heater tab: the card shows today's
hours up to now, a tall bar at 07:00, and a total equal to the bars' sum.

**Acceptance Scenarios**:

1. **Given** today, **When** the card is shown, **Then** it has one bar per hour from 00:00 up to the current hour, in
   Oslo time, an axis for the whole day, and the total for the day so far.
2. **Given** an hour with no recorded samples, **When** the chart is drawn, **Then** that hour is a gap, never a bar of
   0 L; an hour that was recorded with no water used is shown as 0 L.
3. **Given** an hour that was only partly recorded, **When** the chart is drawn, **Then** its bar is marked as partly
   recorded (paler), since it is likely too low, and a short note explains the marking.
4. **Given** the pointer or a tap on a bar, **When** it is shown, **Then** it gives the hour (for example "07:00–08:00"),
   the litres, and how much of the hour was recorded when it was not all of it.
5. **Given** a day the clocks change, **When** it is shown, **Then** it has 23 or 25 hourly bars as the API sends.
6. **Given** the card stays open, **When** 5 minutes pass, **Then** today's figures are read again.

---

### User Story 2 - Switch between day, week, month and year, and step back (Priority: P1)

A switch chooses Day, Week, Month or Year. Arrows step back and forward one period at a time, and the title says which
period is shown: "Today", "Yesterday", "Wed 18 Nov", "This week", "Week 47 · 16–22 Nov", "November", "2026" (the
year is added to a day, week or month of another year).

**Why this priority**: Like the OSO app, the day alone doesn't show a week's showers or a month's total.

**Independent Test**: Switch to Week: seven bars, Monday to Sunday, with the week's total. Step back: the week before,
with its title. The forward arrow is off for the current period.

**Acceptance Scenarios**:

1. **Given** Week, **When** shown, **Then** it has one bar per day, Monday to Sunday (ISO week), the days to come
   without bars, and the week's total so far.
2. **Given** Month, **When** shown, **Then** it has one bar per day of the calendar month, and the month's total.
3. **Given** Year, **When** shown, **Then** it has one bar per calendar month, and the year's total.
4. **Given** the back arrow, **When** pressed, **Then** the previous day, week, month or year is shown, and the forward
   arrow then steps towards now; the forward arrow is off for the current period.
5. **Given** a change of period, **When** shown, **Then** the view starts at the current one (today, this week, this
   month, this year).
6. **Given** a period before the recording began (24 November 2026), **When** shown, **Then** the card says "No hot
   water recorded for {period}. The record starts on 24 Nov 2026." instead of an empty chart, and the back arrow stops
   at the period that holds that date.

---

### User Story 3 - Read the figures in the right light (Priority: P2)

The card says what V40 means and why its total can be a little higher than the OSO app's.

**Why this priority**: Roy compares with the OSO app; a total higher than OSO's could look like an error.

**Acceptance Scenarios**:

1. **Given** the card, **When** shown, **Then** a short note says "Litres of water at 40 °C (V40), worked out from the
   tank's hot water. Small draws, such as a hand wash, are counted, so the total can be higher than the OSO app's."
2. **Given** a period whose figures can't be read (an error other than "not found"), **When** shown, **Then** the card
   says the hot water used can't be shown right now, and the rest of the tab is shown as before.

---

### Edge Cases

- **No heater**: the Heater tab already says no heater is connected and makes no requests; the card is not shown.
- **Today just after midnight**: the day has its first hour only, or none yet; with no bars, the card says no hot water
  is recorded yet today, never "0 L".
- **A period wholly recorded as 0 L**: shown as 0 L bars and "Total V40 used 0 L".
- **A total with gaps**: the total is the sum of the bars with litres; partly recorded bars are included as sent.
- **Figures may still be tuned** by the API's calibration; the card shows what is sent, with no promise to match OSO.
- **Phone width**: at 375 px the switch, the arrows and the title fit; a month's 31 bars stay readable; the axis shows
  fewer labels where needed (every 3 hours, every 5 days).
- **Dark mode**: the bars and the partly recorded marking are clear in both modes.
- **Switching location**: the card follows the selected location and starts at today.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The Heater tab MUST show a "Hot water used" card with a bar chart of the litres of 40 °C water used in
  each part of the chosen period: hours for a day, days for a week or a month, months for a year, in Oslo time.
- **FR-002**: The card MUST show the period's total as "Total V40 used {n} L", equal to the sum of the bars.
- **FR-003**: A part with no recorded samples MUST be a gap, never 0 L; a part partly recorded MUST be marked, with a
  note explaining the marking.
- **FR-004**: The card MUST offer Day, Week, Month and Year, start at the current period, step back and forward one
  period with arrows, disable the forward arrow at the current period, and title the period shown.
- **FR-005**: The back arrow MUST stop at the period that holds 24 November 2026; a period with no recorded hot water
  MUST say so instead of showing an empty chart or 0 L.
- **FR-006**: Each bar MUST give its time span and litres on hover or tap, and how much of it was recorded when not all.
- **FR-007**: The current period MUST be read again every 5 minutes while the card is open; past periods need not be.
- **FR-008**: The card MUST explain V40 and that its total may be higher than the OSO app's.
- **FR-009**: A failure to read the figures MUST be shown in the card only, without hiding the rest of the tab.
- **FR-010**: The chart MUST be usable by keyboard and screen reader: the switch and arrows are buttons with names, and
  the chart has a text summary of the period and its total.

### Key Entities

- **Hot water used in a period** (from the API): the period (day, week, month or year) and its start and end, the
  total litres or none, and for each part so far its start, its litres or none, and its recorded minutes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For a day with showers, the hours with showers are within a few litres of the OSO app's bars, and the
  card's total equals the sum of its bars to the litre.
- **SC-002**: Roy can go from today's chart to last week's total in at most 3 taps.
- **SC-003**: A part without records is never shown as 0 L.
- **SC-004**: At 375 px, in light and dark mode, the card fits without sideways scrolling and a month's bars can each
  be tapped.
- **SC-005**: The card shows its first chart within 1 second of opening the Heater tab on a normal connection.

## Assumptions

- API spec 020 is deployed (2026-11-25). Its request, fields and errors are in its contract,
  `specs/020-water-heater-consumption/contracts/endpoints.md` in the API repository.
- The card sits on the Heater tab between the live heater card and the heater's energy card.
- The look follows the app's own charts (as "Usage" on Now), not the OSO app's colours; the bars are in the water
  heater's colour.
- "Partly recorded" means less than 90 % of the part was sampled; the exact share is a plan detail.
- Showers or baths as units, and the hot water's cost, are out of scope: the API gives litres only.
- The API's handover note `specs/_backlog/water-heater-hot-water-frontend.md` is removed from the API repository once
  this spec is taken up.
