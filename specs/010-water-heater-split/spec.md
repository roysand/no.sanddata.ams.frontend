# Feature Specification: Show Water Heating Apart from the Rest

**Feature Branch**: `010-water-heater-split`

**Created**: 2026-11-20

**Status**: Built 2026-11-20 (awaiting API spec 012, PR #39, for the manual checks)

**Input**: Backend feature `no.sanddata.ams.api` → `specs/012-water-heater-energy/`, with its contract in
`contracts/endpoints.md` and field meanings in `data-model.md`. The hourly and daily cost items and the monthly bill
each gain an optional `waterHeater` part: kWh, cost, sampled minutes and capped, plus the first and last hour on the
bill. Follows spec 009, which added the Heater tab.

User description: "Implement the heater's kWh and cost per day. These values I want integrated with the other numbers
so I can see what is heating of water and the rest of the electricity used (mostly heating and a little cooking,
washing and drying clothes)."

Choices made with Roy on 2026-11-19:

- The split is shown in the usage chart (Now and History), the monthly bill, the Heater tab and the CSV export.
- The cost is the heater's share of the price per kWh only.
- Heating in the cheapest hours is on hold.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - The usage chart shows water heating inside each bar (Priority: P1)

A household member opens the usage chart on Now or History, in kWh or in kr, for a day, week, month or year.

For a location with a water heater, each hour or day of the current period shows two parts: water heating and
everything else. The total height, the labels and the comparison with the previous period stay as they are today.
Selecting a point shows its total, and below it "Water heating" and "Everything else", each in the chosen unit.

**Why this priority**: The chart is where use is read every day. Seeing at a glance how much of a cold day went to hot
water is the point of the feature.

**Independent Test**: For Hjemme, open the day view of today in kWh:

- Hours where the heater ran show a distinct water heating part at the bottom of the hour.
- Selecting such an hour shows, for example, "3,4 kWh · Water heating 2,1 kWh · Everything else 1,3 kWh".
- Switch to kr and the same hour shows the costs, which add up to the hour's cost.
- Open a location without a heater, and the chart looks exactly as today.

**Acceptance Scenarios**:

1. **Given** a location with heater data in the period, **When** the chart is shown in kWh, **Then** each slot of the
   current period shows its water heating part and the rest. Together they are as tall as today's single value.
2. **Given** the chart in kr, **When** it is shown, **Then** the parts are the costs. A slot whose heater cost is
   unknown, for example because there is no price yet, shows no split for that slot, and its total is as today.
3. **Given** a selected slot with a heater part, **When** the detail line is shown, **Then** it gives the total, the
   water heating and everything else, in the chosen unit. Everything else is the total minus water heating.
4. **Given** a slot without a heater part, such as before the heater was connected, a location without a heater, or
   a sampling outage, **When** it is shown, **Then** it shows the total only, and the detail line says nothing about
   water heating. It never says "Water heating 0".
5. **Given** the previous period that is drawn for comparison, **When** it is shown, **Then** it stays a single
   total, as today.
6. **Given** a location that has no heater data anywhere in the shown period, **When** the chart is shown, **Then**
   it has no water heating legend entry and looks as today.
7. **Given** a slot where only part of the time was sampled, **When** its detail line is shown, **Then** it notes
   that water heating is "partly measured": more than 2 minutes, or 1 %, of the slot's time so far was not
   sampled.

---

### User Story 2 - The bill says how much was water heating (Priority: P1)

A household member opens the bill for a month: the expected bill on Now, or a past month in History. Below the total
it says how many kWh and kr went to water heating since the start of the month, or since the heater was connected.
The bill's amounts and lines are not changed.

**Why this priority**: Cost is judged on the bill. Roy asked to see "what is heating of water and the rest" there.

**Independent Test**: Open the November 2026 bill for Hjemme. Below the total it says, for example, "Water heating:
104,6 kWh, 94 kr since 19 November". The bill's total and lines are the same as before the change.

**Acceptance Scenarios**:

1. **Given** a bill with a heater part, **When** it is shown, **Then** a "Water heating" line below the total gives
   the kWh and the cost.
   - The line says the period it covers: "this month so far", or "since {date}" when the first heater hour is after
     the start of the month.
   - It is visibly not a bill line and is not added to any sum.
2. **Given** the current month, whose bill is an estimate, **When** the line is shown, **Then** it says that it is
   measured so far, not expected for the whole month, so it is not mistaken for part of the estimate.
3. **Given** a bill without a heater part, **When** it is shown, **Then** there is no water heating line.
4. **Given** a heater part whose cost is unknown, **When** it is shown, **Then** the line gives the kWh and leaves the
   cost out, rather than showing 0 kr.

---

### User Story 3 - The Heater tab shows today's and this month's water heating (Priority: P2)

On the Heater tab, below the live state from spec 009, a household member sees how much energy and money water
heating has taken today and this month. Today's figure is given with the share of the day's total use.

**Why this priority**: It is the natural place to look for the heater's numbers, but the chart and the bill already
answer the main question.

**Independent Test**: Open the Heater tab for Hjemme. It shows, for example:

- "Today: 4,2 kWh · 3,80 kr · 31 % of today's use"
- "This month: 104,6 kWh · 94 kr"

These figures match the chart's day view and the bill.

**Acceptance Scenarios**:

1. **Given** heater data today, **When** the tab is open, **Then** it shows today's water heating kWh, cost and share
   of the day's total kWh so far.
2. **Given** heater data this month, **When** the tab is open, **Then** it shows the month's water heating kWh and
   cost, the same figures as on the bill.
3. **Given** no heater data today or this month (just connected, or an outage), **When** the tab is open, **Then**
   that figure is replaced by "No measurements yet", not by zeros.
4. **Given** the tab is open, **When** time passes, **Then** the figures update at the same pace as the day's figures
   elsewhere in the app.

---

### User Story 4 - The CSV export includes water heating (Priority: P2)

A household member exports hourly or daily figures as CSV from History. Each row now also has the water heating kWh
and cost, everything else, and the sampled minutes, so the split can be worked with in a spreadsheet.

**Why this priority**: Useful for a closer look, but it is a secondary path.

**Independent Test**: Export the hourly CSV for 20 November 2026 for Hjemme and open it in Numbers or Excel. Every
row has the new columns. For each row, water heating + everything else equals the usage and the cost columns. Rows
before the heater was connected have the new columns empty.

**Acceptance Scenarios**:

1. **Given** an hourly or daily export, **When** it is made, **Then** each row has these new columns after the
   existing ones, in the same number style as the rest of the file:
   - Water heating (kWh)
   - Water heating cost (kr)
   - Everything else (kWh)
   - Everything else cost (kr)
   - Water heating sampled minutes
2. **Given** a row without a heater part, **When** it is exported, **Then** its new columns are empty, not 0.
3. **Given** a row whose heater cost is unknown, **When** it is exported, **Then** the cost cells are empty and the
   kWh cells are filled.
4. **Given** an export for a location without a heater, **When** it is made, **Then** the new columns are present but
   empty. This keeps the file layout the same for every location.

---

### Edge Cases

- **Capped hours**: the measured heater kWh was more than the meter's kWh. Water heating is then the whole hour and
  everything else is 0, never negative. The detail line may note "capped", but nothing more is needed.
- **The current hour and today**: the water heating part grows during the hour, as the hour's own figures do.
- **Rounding**: water heating and everything else are rounded separately for display. Their displayed values may
  differ from the displayed total by one in the last digit. The total is always the existing, unchanged figure, and
  everything else is computed as total − water heating before rounding.
- **Clock-change days**: a day has 23 or 25 hours, and its sampled minutes are judged against that day's length.
- **Week, month and year views**: these are daily slots, so the parts are the day sums from the API. The year view's
  monthly slots are the sums of their days.
- **The all-locations overview page**: unchanged in this version.
- **An older API without the `waterHeater` field**: everything is shown as today. Nothing breaks.
- **Heater removed**: past slots keep their split, and later slots have none.
- **Sampling outage in the middle of a day**: the day shows the partial water heating with "partly measured". The
  missing minutes are not guessed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST read the optional water heater part from the hourly figures, the daily figures and the
  monthly bill. When the part is absent or null, the app MUST behave exactly as before.
- **FR-002**: In the usage chart, each slot of the current period with a heater part MUST be shown as water heating
  plus everything else, in kWh or kr. The slot's total value, its label and the previous-period comparison MUST be
  unchanged.
- **FR-003**: Everything else MUST be computed as total − water heating, so the two parts always add up to the
  displayed total. A slot without a heater part, or without a known heater cost in kr, MUST show its total only.
- **FR-004**: The chart's detail for a selected slot MUST give water heating and everything else when the slot has a
  heater part, and MUST say "partly measured" when more than 2 minutes, or 1 %, of the slot's time so far was not
  sampled. The small margin absorbs rounding to whole minutes and the age of the newest sample.
- **FR-005**: The chart MUST show a water heating legend entry only when the shown period has a heater part
  somewhere.
- **FR-006**: The monthly bill, both the expected bill and a past month, MUST show a "Water heating" line below the
  total when the bill has a heater part.
  - The line gives the kWh and the cost, and the period it covers.
  - It MUST NOT be presented as a bill line and MUST NOT change any amount.
  - For the current month, it MUST say that it is measured so far, not projected.
- **FR-007**: The Heater tab MUST show today's water heating kWh, cost and share of today's total kWh, and this
  month's water heating kWh and cost. A missing figure MUST say "No measurements yet".
- **FR-008**: The hourly and daily CSV exports MUST add five columns after the existing ones:
  - water heating kWh and cost
  - everything else kWh and cost
  - water heating sampled minutes

  The cells MUST be empty when there is no heater part, or no heater cost.

- **FR-009**: Wherever a figure is absent, the app MUST NOT show a zero water heating value. "Unknown" and "none"
  must never look alike.
- **FR-010**: Everything else MUST never be shown as negative.
- **FR-011**: The chart, the bill and the CSV export MUST NOT add requests: the split comes with the figures they
  already fetch. The Heater tab MAY fetch today's hourly figures and the month's bill, the same ones the Now page uses,
  so the two pages share them.

### Key Entities

- **Water heater part of an hour or day**: kWh, cost (or none), sampled minutes and capped. It comes with each hourly
  or daily cost item.
- **Water heater part of a bill**: kWh, cost (or none), sampled minutes, capped, and the first and last hour with
  measurements. It is never an estimate.
- **Everything else**: not sent by the API. It is the total minus water heating, in kWh or kr.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For every slot, bill and CSV row with a heater part, water heating + everything else equals the total,
  to 0,001 kWh and to the øre before display rounding.
- **SC-002**: For a location without a heater, the chart, the bill and the Heater tab look the same as before.
  Existing tests pass unchanged. The CSV differs only by the five new, empty columns.
- **SC-003**: A household member can answer "how much of today's use was water heating?" in under 10 seconds, from
  either the chart or the Heater tab.
- **SC-004**: The Heater tab's month figure equals the bill's water heating line, and the tab's today figure equals
  the sum of today's hourly parts in the chart.
- **SC-005**: Opening the chart or the bill makes no new requests compared with before the change. The Heater tab
  only adds requests the Now page already makes, and gets them from the cache when Now was opened first.
- **SC-006**: The chart, the bill line and the Heater tab figures stay readable at 375 px width, in light and dark
  mode.

## Assumptions

- The API's spec 012 is deployed before this is released. Until then the field is absent, and FR-001 keeps the app as
  today.
- The cost is the heater's share of the hour's price per kWh. The capacity charge and the fixed fees are not split, so
  the bill line is "part of the energy cost", not "part of the total". The line's wording must not suggest it is a
  share of the whole bill.
- Only the current period is split in the chart. Splitting the previous period too would double the visual load for
  little gain.
- In kr, the comparison pricing model, meaning what the hour would cost on the other model, is not split. The API
  provides the actual cost only.
- "Today" on the Heater tab is the Oslo calendar day so far. "This month" is the bill's water heating part.
- The all-locations overview page, any alerts, and controlling the heater (heating in cheap hours) are out of scope.
