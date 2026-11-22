# Feature Specification: Norgespris Limit Warnings for Every Location

**Feature Branch**: `015-norgespris-limit-warnings`

**Created**: 2026-11-22

**Status**: Draft

**Input**: User description: "Norgespris limit warnings, on top of API spec 018" (`no.sanddata.ams.api` →
`specs/018-norgespris-limit-status/`, merged 2026-11-22 and being built).

On Norgespris, a location pays a fixed price per kWh up to a monthly limit: 5 000 kWh for a home, 1 000 kWh for a
holiday home. Every kWh above it is priced at spot terms, which in winter can be several times as much. Roy has
Norgespris at both Hjemme and the cabin. The cabin has been over its limit; Hjemme has not.

Spec 012 added one Norgespris warning: for the selected location, once the expected bill projects the month over the
limit. It works the limit out from the bill, so it can only warn once the month is already projected over it, and it
says nothing about the cabin while Hjemme is selected. API spec 018 now sends, for every location, the limit, the kWh
so far, the projection, the Norgespris price and when the limit resets, and the spot energy price per hour.

Choices made with Roy on 2026-11-22:

- **Which warnings**, all in the existing warning banner:
  - **Over the limit**: once the month's kWh reach the limit. It can't be dismissed and stays until the limit resets on
    the 1st of the next month.
  - **Approaching the limit**: from 90 % of the limit until it is reached.
  - **Projected over the limit**: spec 012's warning, kept for a month projected over the limit that is still below
    90 % of it.
  - **Expensive hours tomorrow**: only for a location over its limit or projected over it, because only then does
    the spot price change the bill. An hour is expensive when its spot energy price is at least **4 × the Norgespris
    price**, both including VAT and without grid fees, taxes or markup: 2,00 kr at a Norgespris price of 0,50 kr.
- **For which locations**: **every** location the user can see, not only the selected one, so the cabin's warnings show
  while Hjemme is selected. The capacity and usage warnings stay about the selected location.
- **The car charger**: when a location counts its car charger with the house, the charger is on the house's agreement
  and its kWh count toward the house's limit. The API includes them in the figures; the app does nothing extra.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See that a location is over its Norgespris limit (Priority: P1)

Once a location's kWh this month reach its Norgespris limit, a banner says so on every page, whichever location is
selected: for example "Cabin is over its Norgespris limit: 1 084 of 1 000 kWh. The kWh above it are priced at spot
price until 1 December." It can't be dismissed and stays until the limit resets at midnight on the 1st.

**Why this priority**: From that moment every kWh costs the spot price, often several times the Norgespris price. It is
the one fact about the month that changes the bill most, and it applies until the month ends.

**Independent Test**: With Hjemme selected and the cabin at 1 084 of 1 000 kWh:

- The banner shows the cabin's over-the-limit warning on Now, History and the other pages.
- It names the cabin, the kWh so far, the limit and the reset date.
- It has no close button.

**Acceptance Scenarios**:

1. **Given** a location whose kWh so far this month are at or above its limit, **When** any page is shown, **Then** the
   banner says the location is over its Norgespris limit, with its kWh so far, its limit, and that the kWh above it
   are priced at spot price until the 1st of the next month.
2. **Given** the warning, **When** the user looks for a way to hide it, **Then** there is none: it shows as long as the
   location is over its limit.
3. **Given** midnight on the 1st (Oslo time), **When** the status is read again, **Then** the limit has reset, and the
   warning goes away within the status's refresh time.
4. **Given** the warning is for a location other than the selected one, **When** the user follows it, **Then** that
   location is selected and its Now page is shown, where its expected bill is.
5. **Given** the warning, **When** it is shown, **Then** it stands out as urgent, as spec 012's passed-limit warning
   does.

---

### User Story 2 - Know in time that a location is approaching its limit (Priority: P1)

From 90 % of the limit, a banner says how close the location is and, at the month's pace, how long it has: for
example "Cabin: 912 of 1 000 kWh this month. At this pace the limit is reached in about 4 days." When the month is
projected over the limit but still below 90 % of it, spec 012's warning stays: "Cabin is expected to use 1 240 kWh
this month, above the Norgespris limit of 1 000 kWh."

**Why this priority**: This is the warning that gives time to act: lowering the heat at the cabin, or charging the car
on its own agreement. Once over the limit it is too late for the month.

**Independent Test**: For the cabin (limit 1 000 kWh):

- At 912 kWh, projected at 1 240 kWh, with 8 days left of the month (41 kWh a day), the banner shows 912 of 1 000 kWh
  and about 2 days until the limit.
- At 912 kWh, projected at 980 kWh, it shows 912 of 1 000 kWh and that the month is expected to end at 980 kWh.
- At 600 kWh, projected at 1 240 kWh, it shows spec 012's projection warning.
- At 600 kWh, projected at 900 kWh, there's no warning.

**Acceptance Scenarios**:

1. **Given** a location at 90 % of its limit or more, but below it, **When** any page is shown, **Then** the banner
   gives the kWh so far and the limit.
2. **Given** that warning and a projection over the limit, **When** it is shown, **Then** it also says in about how many
   days the limit is reached at the month's projected pace, rounded to whole days, or "today" or "tomorrow".
3. **Given** that warning and a projection within the limit, **When** it is shown, **Then** it says what the month is
   expected to end at instead.
4. **Given** a location below 90 % of its limit and projected over it, **When** any page is shown, **Then** the banner
   shows the projection and the limit, as spec 012 does.
5. **Given** a location below 90 % and projected within its limit, or without a projection yet, **When** a page is
   shown, **Then** there is no Norgespris warning for it.
6. **Given** one location, **When** the banner is shown, **Then** it has at most one limit warning for it: over,
   approaching or projected over, in that order of precedence.

---

### User Story 3 - Know tomorrow's expensive hours when over the limit (Priority: P2)

For a location over its limit or projected over it, once tomorrow's prices are published, the banner lists tomorrow's
hours whose spot energy price is at least 4 × the Norgespris price: for example "Cabin, tomorrow: spot price is high
07–09 and 17–20, up to 2,60 kr/kWh. Use less then if you can."

**Why this priority**: It helps only once the limit matters, and it is about tomorrow, so it is less urgent than the
limit itself.

**Independent Test**: For the cabin over its limit, with a Norgespris price of 0,50 kr and tomorrow's spot energy
prices published:

- Hours 07, 08, 17, 18 and 19 at 2,00 kr or more: the banner lists "07–09 and 17–20" and the highest price among them.
- No hour at 2,00 kr or more: no expensive-hours warning.
- Hjemme, well within its limit, with the same prices: no expensive-hours warning.

**Acceptance Scenarios**:

1. **Given** a location over or projected over its limit, and tomorrow's prices published, **When** any page is shown,
   **Then** the banner lists tomorrow's hours whose spot energy price is at least 4 × the location's Norgespris price,
   as ranges of consecutive hours, with the highest spot energy price among them.
2. **Given** a location within its limit and not projected over it, **When** a page is shown, **Then** there is no
   expensive-hours warning for it, whatever the prices.
3. **Given** tomorrow's prices are not yet published, **When** a page is shown, **Then** there is no expensive-hours
   warning, and it appears within the prices' refresh time once they are.
4. **Given** midnight, **When** tomorrow becomes today, **Then** the warning for that day goes away.
5. **Given** more than three ranges, **When** the warning is shown, **Then** it lists the first three and how many more
   hours there are, so it stays within two lines on a phone.
6. **Given** an hour without a spot energy price, **When** the hours are compared, **Then** it is not counted as
   expensive.

---

### User Story 4 - The warnings stay calm with several locations (Priority: P2)

With several locations, the banner still reads at a glance: each warning names its location, the selected location's
warnings come first, and nothing else on the page moves.

**Why this priority**: The warnings are only useful if they are calm enough to keep.

**Independent Test**: With Hjemme selected, a capacity warning at Hjemme, and the cabin over its limit with expensive
hours tomorrow, the banner shows the capacity warning first, then the cabin's limit warning, then its expensive hours.

**Acceptance Scenarios**:

1. **Given** warnings for several locations, **When** the banner is shown, **Then** the order is:
   - the selected location's capacity and usage warnings (spec 012), as before
   - the limit warnings, the selected location first, then the others by name
   - the expensive-hours warnings in the same location order.
2. **Given** a key reminder for an administrator, **When** the page is shown, **Then** the warnings still come before
   it, as in spec 012.
3. **Given** the Norgespris figures can't be loaded, **When** a page is shown, **Then** there are no Norgespris
   warnings and no error. Everything else works as before.
4. **Given** a viewer of a location, **When** a page is shown, **Then** they see its Norgespris warnings, like the
   owner and administrators.
5. **Given** a user with only one location, **When** the banner is shown, **Then** it reads as before, naming the
   location.

---

### Edge Cases

- **Inactive location**: the API leaves it out, so it gets no warnings.
- **A location without Norgespris**: the API leaves it out, so it gets no Norgespris warnings.
- **No readings yet this month**: kWh so far 0 and no projection, so no warning.
- **The car charger counted with the house**: the API includes the car's kWh in the figures, so the warnings include
  them too. When the owner changes the setting, the warnings follow within the status's refresh time.
- **A Norgespris price change on the 1st**: the price used is the one the API sends for now.
- **Negative spot prices**: never expensive.
- **The 23- and 25-hour days**: hour ranges are in Oslo time, as the price chart shows them.
- **Over the limit by a fraction**: "over" means kWh so far at or above the limit, shown rounded to whole kWh.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The app MUST read the Norgespris status of every location the user can see (API spec 018) and refresh it
  every few minutes while the app is open.
- **FR-002**: For a location whose kWh so far are at or above its limit, the banner MUST show an urgent warning with
  the kWh so far, the limit, and the reset date. It MUST NOT be dismissable.
- **FR-003**: For a location at or above 90 % of its limit and below it, the banner MUST show the kWh so far and the
  limit and, from the projection, either about how many days until the limit is reached or what the month is
  expected to end at.
- **FR-004**: For a location below 90 % of its limit and projected over it, the banner MUST show the projection and the
  limit, as spec 012 does. Spec 012's warning MUST use the API's figures instead of the bill's lines.
- **FR-005**: A location MUST have at most one limit warning at a time, with over before approaching before projected.
- **FR-006**: For a location over or projected over its limit, once tomorrow's prices are published, the banner MUST
  list tomorrow's hours whose spot energy price is at least 4 × the location's Norgespris price, as ranges of
  consecutive Oslo hours with the highest price, at most three ranges plus a count of the rest.
- **FR-007**: The Norgespris warnings MUST be shown for every location the user can see, on every page. Following one
  MUST select its location and open its Now page.
- **FR-008**: The banner MUST order the warnings as in User Story 4, each naming its location.
- **FR-009**: When the Norgespris figures or tomorrow's prices can't be loaded, the affected warnings MUST be left out
  with no error.
- **FR-010**: The app MUST read tomorrow's prices only for locations over or projected over their limit.
- **FR-011**: The capacity and usage warnings MUST stay as spec 012 specifies.

### Key Entities

- **Norgespris status** (from the API, one per location with Norgespris): limit, kWh so far, projected kWh, Norgespris
  price including VAT, reset time.
- **Limit warning**: over, approaching or projected, for one location, with the figures it shows.
- **Expensive hours**: for one location and tomorrow, the ranges of hours at or above 4 × its Norgespris price and the
  highest spot energy price among them.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: With Hjemme selected, a user sees within 5 minutes that the cabin has gone over its limit, on any page.
- **SC-002**: The approaching warning shows from the first refresh after a location reaches 90 % of its limit.
- **SC-003**: The kWh, limit and projection in the warnings match the location's expected bill, rounded to whole kWh.
- **SC-004**: The expensive hours listed match the price chart's tomorrow, hour by hour, for the 4 × rule.
- **SC-005**: On a 375 px wide phone, each warning fits on at most two lines, as in spec 012.
- **SC-006**: With the API's Norgespris figures unavailable, every page works as before, with no error shown.

## Assumptions

- API spec 018 is deployed before this is released. The field names come from its plan and are settled in this spec's
  plan.
- "Tomorrow's prices are published" means the API returns spot energy prices for tomorrow, as the price chart already
  checks (spec for tomorrow's prices, PR #26); usually around 13:00.
- The days until the limit use the month's projection: the projected kWh for the rest of the month spread evenly over
  the days left.
- The 90 % and 4 × thresholds are fixed in the app. Making them settings is out of scope.
- Out of scope: web push (backlog "Warnings"), and the car charging cost on the bill (backlog "Car charging cost": the
  car's kWh × the Norgespris price including VAT, always shown), which is a later spec.
