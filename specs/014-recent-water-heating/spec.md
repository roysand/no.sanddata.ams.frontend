# Feature Specification: Water Heating in the "Last 3 Hours" Chart

**Feature Branch**: `014-recent-water-heating`

**Created**: 2026-11-20

**Status**: Draft

**Input**: User description: "This graph should have the water heater usage shown", about the "Last 3 hours" card on
Now, which draws the meter's power as the average kW per 5 minutes against the same 3 hours yesterday.

Backend feature: `no.sanddata.ams.api` → `specs/017-water-heater-power/` (merged and checked in production on
2026-11-20), with its contract in `contracts/endpoints.md` and the hand-over note
`specs/_backlog/water-heater-power-frontend.md`. The API gives the heater's average power per 5 minutes in a time
window. Each step starts on whole 5 minutes of the clock and says how many of its seconds were sampled. A step without
samples is left out.

Follows spec 010, which split water heating out of the usage chart per hour and per day.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The chart shows water heating under the power line (Priority: P1)

A household member opens Now. For a location with a water heater, the "Last 3 hours" chart shows, under the line of
the house's power, how much of it was water heating in each 5 minutes. Selecting a point gives the house's power, and
below it the water heating and everything else.

**Why this priority**: This is what Roy asked for. When the house's power jumps, it shows at once whether the water
heater is the cause.

**Independent Test**: For Hjemme, while the heater is heating at about 2 kW:

- The chart shows an orange area about 2 kW high under the blue line for the minutes it has heated, and only a thin
  band (standby) before that.
- Selecting a 5-minute point during heating reads, for example, "19:40 · 7,4 kW · Water heating 2,0 kW · Everything
  else 5,4 kW · yesterday 6,1 kW".
- Open a location without a water heater, and the chart looks exactly as today.

**Acceptance Scenarios**:

1. **Given** a location with a water heater and heater figures in the window, **When** the chart is shown, **Then**
   each 5 minutes with a heater figure shows water heating as an area under the house's power line, and the legend
   has "Water heating".
2. **Given** a selected point with a heater figure, **When** its detail line is shown, **Then** it gives the house's
   power, the water heating and everything else (the house's power minus water heating, never below 0), all in kW.
3. **Given** a 5-minute step without a heater figure (before the heater was connected, or a sampling outage), **When**
   it is shown, **Then** it has no water heating area, and its detail line says nothing about water heating. It never
   says "Water heating 0 kW".
4. **Given** a step where noticeably less than the full 5 minutes was sampled (except the step going on now), **When**
   its detail line is shown, **Then** it notes that water heating is "partly measured".
5. **Given** a step where the heater's power is above the house's power (the two are measured separately), **When** it
   is drawn, **Then** the water heating area reaches the house's line and no further. The detail line gives the
   heater's own power, and "everything else" is 0.
6. **Given** a location without a water heater, or a window without any heater figures, **When** the chart is shown,
   **Then** it has no water heating area or legend entry, and looks as today.
7. **Given** yesterday's dashed line, **When** it is shown, **Then** it stays a single total, as today.

---

### User Story 2 - The steps line up with the clock (Priority: P1)

The heater's steps start on whole 5 minutes of the clock (17:35, 17:40, …). The house's steps start where the 3-hour
window happens to start (17:37, 17:42, …), so the two would be offset by up to 4 minutes. The chart's 5-minute steps
must start on whole 5 minutes, so water heating sits exactly under the house's power.

**Why this priority**: Without it, every water heating step is drawn up to 4 minutes off from the power it belongs
to, and the split in the detail line mixes two different 5 minutes.

**Independent Test**: Open Now at 20:37:

- The chart's first label is 17:40 and its steps are 17:40, 17:45, … The last of the 36 steps, 20:35, is going on now.
- The totals at the top (kWh, kr and the comparison with yesterday) are as close to today's as before.

**Acceptance Scenarios**:

1. **Given** any time of the day, **When** the chart is shown, **Then** its steps start on whole 5 minutes in Oslo
   time, and it covers 3 hours of them, up to and including the step going on now.
2. **Given** the totals at the top and the comparison with yesterday, **When** the window moves to whole 5 minutes,
   **Then** they are still computed over the same elapsed time today and yesterday, so the comparison stays like for
   like.
3. **Given** a location without a water heater, **When** the chart is shown, **Then** its steps line up with the
   clock too. Every location gets the same chart.

---

### User Story 3 - How much of the 3 hours was water heating (Priority: P2)

Below the totals, the card says how much of the 3 hours' kWh was water heating, for example "Water heating: 3,1 kWh of
21,17 kWh (15 %)".

**Why this priority**: The chart shows when the heater ran, and this line puts a number on it. The card is useful
without it.

**Independent Test**: For Hjemme after an hour of heating at about 2 kW, the line reads about 2 kWh. Add the heater
steps by hand (kW × sampled minutes ÷ 60) and the figures match.

**Acceptance Scenarios**:

1. **Given** heater figures in the window, **When** the card is shown, **Then** it gives the water heating kWh so far
   and its share of the house's kWh over the same time.
2. **Given** no heater figures in the window, **When** the card is shown, **Then** the line is not shown. It never
   says "0 kWh".
3. **Given** the water heating kWh is above the house's kWh, **When** the share is shown, **Then** it reads at most
   100 %.

---

### Edge Cases

- **The step going on now** covers only part of 5 minutes, for both the house and the heater. It is not marked
  "partly measured" for that reason alone.
- **Heater removed** while the window still has its samples: the location no longer has a heater, so no heater figures
  are asked for and the chart looks as it did before the heater.
- **A heater figures request that fails**: the chart is shown without water heating, with a short note that water
  heating could not be loaded. The house's power and totals are never held back by it.
- **The night the clocks change**: whole 5 minutes are the same in UTC and Oslo time, so the steps stay whole. The
  window is 3 hours of elapsed time, as today.
- **The car charger**: not shown here. Zaptec gives completed sessions only, so there is no live car power.
- **Refresh**: the heater figures refresh together with the house's power, once a minute.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: For a location with a water heater, the "Last 3 hours" chart MUST show the heater's average power per 5
  minutes as an area under the house's power line, with a "Water heating" legend entry.
- **FR-002**: A 5-minute step without a heater figure MUST show no water heating area. A missing figure MUST NOT be
  drawn or described as 0 kW.
- **FR-003**: The water heating area MUST NOT be drawn above the house's power line for the same step.
- **FR-004**: The selected step's detail line MUST give the house's power, the water heating and everything else in
  kW (everything else = house − heater, never below 0). It MUST note "partly measured" when more than 2 minutes of a
  finished step was not sampled.
- **FR-005**: The chart's 5-minute steps MUST start on whole 5 minutes of the clock and cover 3 hours up to and
  including the step going on now, for every location.
- **FR-006**: The totals and the comparison with yesterday MUST stay computed over the same elapsed time today and
  yesterday.
- **FR-007**: Yesterday's line MUST stay a single total. No heater figures are needed for yesterday.
- **FR-008**: The card MUST give the water heating kWh in the window and its share of the house's kWh (at most 100 %)
  when there are heater figures, and nothing otherwise.
- **FR-009**: A failure to load the heater figures MUST NOT hide or delay the house's power. The chart then shows a
  short note instead of water heating.
- **FR-010**: A location without a water heater MUST NOT ask for heater figures, and its chart MUST look as today
  apart from the steps lining up with the clock (FR-005).
- **FR-011**: The heater figures MUST refresh as often as the house's power: once a minute.

### Key Entities

- **Water heater power step**: start (on whole 5 minutes), average kW over its sampled time, and sampled seconds. It
  comes from the API and is never stored.
- **Chart step**: 5 minutes on whole 5 minutes of the clock, holding the house's power, yesterday's power, and the
  water heating (or none).
- **Water heating in the window**: the kWh the heater used in the steps so far (Σ kW × sampled time), and its share of
  the house's kWh over the same time.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: During steady heating at a known power, the water heating area is within 2 % of that power in fully
  sampled steps.
- **SC-002**: Every water heating step is drawn under the house's power step that covers the same 5 minutes. There is
  no offset at any time of day.
- **SC-003**: With a water heater, the card is complete (power, totals and water heating) in no more than 1 second
  more than without one, on the same connection.
- **SC-004**: For a location without a water heater, the card shows the same totals as before this feature within
  0,01 kWh and 1 øre over the same window.
- **SC-005**: The water heating kWh in the card matches the sum of the steps (kW × sampled time) to 0,01 kWh.

## Assumptions

- The API from its spec 017 is deployed (done 2026-11-20). If it were missing, the request would fail and FR-009 keeps
  the card as today.
- Whether a location has a water heater comes from the location list, as for the Heater tab (spec 009).
- One request per refresh asks for the heater figures of today's 3-hour window, in the same window as the house's
  power.
- Yesterday's heater figures are not shown. The comparison with yesterday stays a total, as in the usage chart
  (spec 010).
- "Partly measured" uses the same margin as spec 010: more than 2 minutes (or 1 %, whichever is more) of a finished 5-minute step not sampled.
- The car charger is out of scope (no live data).
