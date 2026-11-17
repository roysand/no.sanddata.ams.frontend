# Feature Specification: Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions

**Feature Branch**: `007-capacity-charge-and-cap`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/008-full-electricity-price/` stories 6 and 7 (API PR #24 and
PR #25; contract in its `contracts/endpoints.md`, section "Addendum 2026-11-17 (stories 6 and 7)") and the backlog note
`specs/_backlog/full-price-and-norgespris-saving-in-ui.md`. Follow-up to frontend spec 006 (full price display, PR #20).
User description: "Show the Norgespris monthly cap, the electricity-tax and VAT exemptions, and the monthly grid
capacity charge (kapasitetsledd) in the UI. Also fix the 'monthly charges are not included' wording now that the
capacity charge is shown separately (only the supplier monthly fee is left out)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the capacity charge of the month (Priority: P1)

The grid company charges a monthly capacity charge (kapasitetsledd) based on the average of the three highest hourly
peaks on three different days of the month. On the dashboard a card shows, for the selected location, the month's
step (for example 5–10 kW), the amount in kr including VAT, the three peaks behind it (date, hour and kW) and how far
the average is below the next step. The current month is marked as provisional, because a new peak can still raise
it. The household can step back to earlier months to compare them with their bills.

**Why this priority**: The capacity charge is a large part of the grid bill (420 kr in the October 2026 reference
bill) and the only part the household can lower by spreading its consumption. The peaks and the distance to the next
step tell them what to avoid.

**Independent Test**: With a capacity response for October 2026 (peaks 6.2, 5.1 and 4.9 kW, average 5.4 kW, step 5–10
kW, 420 kr, 4.6 kW to the next step), open the dashboard, go back to October and see these figures; the card does not
say provisional.

**Acceptance Scenarios**:

1. **Given** the capacity response for the current month, **When** the card renders, **Then** it shows the step in kW,
   the amount in kr including VAT, the average of the peaks, and the word "Provisional" with a short note that a higher
   peak later in the month can raise the step.
2. **Given** the peaks, **Then** each is listed with its date, the hour it started (Oslo time) and its kW, highest
   first.
3. **Given** `kwToNextStep`, **Then** the card says how many kW the average is below the next step (for example "4,6 kW
   below the next step"); for the top step (no upper limit) it says nothing about a next step.
4. **Given** the household goes to the previous month, **Then** the card shows that month without "Provisional"; it
   cannot go past the current month.
5. **Given** `set` is false (no grid tariff, no step table for the month, or no consumption), **Then** the card says
   the capacity charge is not available for the month instead of showing zeros; an administrator gets a link to the
   page where the steps are entered, other users see "Ask an administrator".
6. **Given** fewer than three days with readings, **Then** the card lists the peaks it has and says the average is over
   that many days.
7. **Given** a VAT-exempt location (`vat` is 0), **Then** the amount is shown without the words "including VAT" and the
   card says no VAT applies to this location.
8. **Given** the request fails, **Then** the card shows the server message; while loading it shows a skeleton.

---

### User Story 2 - The texts say what is and is not included (Priority: P1)

Spec 006 added notes saying the monthly charges (the supplier monthly fee and the grid fixed fee) are not included, and
that the saving does not take the Norgespris monthly limit into account. Both are now out of date: the grid's monthly
charge is the capacity charge, shown on its own card, and the saving applies the monthly limit. The notes are
corrected so they do not contradict the numbers.

**Why this priority**: Wrong notes next to correct numbers undermine trust in the whole page, and the fix is small.

**Independent Test**: Open the right-now card, the "What is in the price" dialog and the saving card; none mentions the
"grid fixed fee", none says the monthly limit is ignored, and the price notes point to the capacity charge card.

**Acceptance Scenarios**:

1. **Given** the right-now card and the "What is in the price" dialog, **Then** they say the supplier monthly fee is not
   included and that the grid capacity charge is a monthly amount shown separately.
2. **Given** the saving card, **Then** it says the comparison applies the Norgespris monthly limit (5 000 kWh, 1 000 for
   a holiday home), and still says the monthly charges are not part of it.
3. **Given** any screen, **Then** the term "grid fixed fee" no longer appears.

---

### User Story 3 - See when an hour is above the Norgespris monthly limit (Priority: P2)

Norgespris covers at most 5 000 kWh a month (1 000 kWh for a holiday home); kWh above it are on spot terms. When the
limit is reached in an hour, that hour is split: part at the Norgespris price, part at the spot price. The right-now
card, the "What is in the price" dialog and the last-hours list show this, so a household on Norgespris understands why
the price jumped late in the month.

**Why this priority**: It only happens to households with large consumption, but when it does the price changes
without any other explanation.

**Independent Test**: With a current-hour response where the Norgespris side has `cap` = 1,2 kWh within and 0,8 kWh
above, open the dialog and see both sets of parts with their kWh; on the right-now card see a note that the monthly
limit was reached.

**Acceptance Scenarios**:

1. **Given** the current hour has a `cap` with some kWh above the limit, **Then** the right-now card says the
   Norgespris monthly limit is reached and that consumption above it is on spot terms for the rest of the month.
2. **Given** the same hour, **When** the dialog opens, **Then** the Norgespris column shows the parts within the limit
   and the parts above the limit, each with its kWh, and the rate shown on the card is the blended rate sent by the API.
3. **Given** the whole hour is above the limit (`kwhWithinCap` is 0), **Then** the dialog shows only the above-limit
   parts and says the whole hour is on spot terms.
4. **Given** the last-hours card (usage and cost over the last three hours), **When** any of its hours is split or
   above the limit, **Then** the card says that part of the period is priced above the Norgespris monthly limit.
5. **Given** `cap` is null, **Then** nothing about the limit is shown.
6. **Given** the location is on spot and the comparison column (Norgespris) has a `cap`, **Then** the dialog shows the
   split in the comparison column the same way.

---

### User Story 4 - Administrator enters the capacity steps of a grid tariff (Priority: P2)

On the grid tariff page an administrator opens a tariff and maintains its capacity step tables. A table has a start
date and a list of steps (lower kW, upper kW or open, monthly amount). Tables are added and deleted as a whole, with the
same dated rules as the grid rates: a start date of today or earlier needs a confirmation, a table that has started
cannot be deleted, and the list shows each table as Superseded, In effect or Upcoming.

**Why this priority**: Without the steps the capacity card in Story 1 has nothing to show. The API can be fed by other
means meanwhile, so it is P2.

**Independent Test**: Add a table starting 2026-07-01 with the Elvia steps for a tariff; it appears with status In
effect and its steps; deleting it is refused with the server's message.

**Acceptance Scenarios**:

1. **Given** a grid tariff, **When** the administrator opens its capacity steps, **Then** the tables are listed oldest
   first with their start date, status and steps (lower kW, upper kW or "and above", monthly amount).
2. **Given** the add dialog, **Then** the administrator enters a start date and rows of steps; the first row starts at
   0, each row starts where the previous ends (filled in, not typed), the last row always has no upper limit ("and
   above"), each upper limit is above its lower limit, and amounts are entered in kr per month excluding VAT. At most 50
   rows.
3. **Given** the dialog, **Then** it explains that grid companies publish the amounts including VAT and that they must
   be divided by 1,25; it may offer to enter amounts including VAT and convert them, showing the result before saving.
4. **Given** a start date of today or earlier, **Then** saving needs the same past-date confirmation as the grid rates.
5. **Given** the API answers 400 or 409 (steps not starting at 0, gaps, date exists, not the newest, confirmation
   required), **Then** the dialog shows the server's message and keeps the input.
6. **Given** an upcoming table, **Then** it can be deleted after a confirmation; a table that has started has no delete
   action, and a 409 from the API is shown if it happens anyway.
7. **Given** a non-administrator, **Then** the page is not reachable (existing admin route rules).

---

### User Story 5 - Administrator sets the exemptions, the holiday-home flag and the monthly limits (Priority: P3)

On the Location pricing page an administrator sets for each location whether it is exempt from the electricity tax,
exempt from VAT, and whether it is a holiday home (which lowers its Norgespris monthly limit). On the Taxes and VAT
page the two monthly limits (home and holiday home, in kWh per month) are maintained as dated values like the other
national rates.

**Why this priority**: Few locations are exempt, and the limits change rarely; the API has sensible values already.
It completes the admin coverage of the backend feature.

**Independent Test**: Mark a location as a holiday home and VAT exempt, save, reload; the list shows both flags. Add a
holiday-home limit of 1 000 kWh from a future date; it is listed as Upcoming.

**Acceptance Scenarios**:

1. **Given** the Location pricing list, **Then** each location shows its three flags (electricity tax exempt, VAT
   exempt, holiday home) in a compact form.
2. **Given** the edit dialog, **Then** it has three switches or checkboxes with a one-line explanation each, prefilled
   with the current values; saving sends them with the grid tariff and the markup.
3. **Given** the Taxes and VAT page, **Then** it lists two more kinds, "Norgespris monthly limit (home)" and "Norgespris
   monthly limit (holiday home)", in kWh per month, with the same add, delete and status rules as the other kinds.
4. **Given** a limit value of 0, a negative value or more than 99 999, **Then** the form rejects it before sending.

---

### Edge Cases

- **Old API.** Against an API without stories 6 and 7: the capacity card shows the server's error or "not available",
  `cap` is absent and nothing is marked, the admin flags are absent and the dialog keeps working without them.
- **Step table starting mid-month.** The API applies a table from the first whole month; the UI shows what the API
  sends and does not recompute.
- **Top step.** Upper limit null is shown as "and above" and has no "below the next step" text.
- **Daylight saving.** Peak hours are shown in Oslo time; the date of a peak is the Oslo date the API sends.
- **Rounding.** kW with one decimal, amounts with two decimals and the Norwegian decimal comma; the amount is shown as
  sent, never recomputed in the browser.
- **Current month with no readings yet** (first day after midnight): `set` false, shown as not available, not as an
  error.
- **Location switch.** Changing the selected location refetches the capacity card for the shown month.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST show a capacity charge card for the selected location with the month, the step, the
  amount (including VAT unless the location is VAT exempt), the average and the peaks (date, Oslo hour, kW).
- **FR-002**: The capacity card MUST mark the current month as provisional and MUST let the user move to earlier
  months, never past the current month.
- **FR-003**: The capacity card MUST show the kW to the next step when there is one, and MUST show a "not available"
  state when the charge is not set, with an administrator link to where the steps are entered.
- **FR-004**: The price notes on the right-now card, the "What is in the price" dialog and the saving card MUST say
  that the supplier monthly fee is not included and that the capacity charge is shown separately; the term "grid fixed
  fee" MUST NOT appear.
- **FR-005**: The saving card MUST state that the Norgespris monthly limit is applied, not that it is ignored.
- **FR-006**: When an hour on Norgespris terms is split or above the monthly limit, the right-now card, the dialog and
  the last-hours card MUST show it; the dialog MUST show the parts within and above the limit with their kWh.
- **FR-007**: The grid tariff admin MUST list, add and delete capacity step tables under the same dated rules as the
  grid rates, with client checks that mirror the API rules (start at 0, contiguous, increasing, open step last, at most
  50 steps, values from 0 to 99 999 with at most 4 decimals).
- **FR-008**: The Location pricing admin MUST show and edit the electricity-tax-exempt, VAT-exempt and holiday-home
  flags.
- **FR-009**: The Taxes and VAT admin MUST handle the two Norgespris monthly limit kinds in kWh per month (greater than
  0, at most 99 999).
- **FR-010**: Every call MUST go through the shared API client; the browser MUST NOT recompute any price, charge, step
  or limit.

### Key Entities

- **Capacity charge (month)**: month, provisional, set, the up to three peaks (date, hour, kW), the average, the step
  (lower kW, upper kW or open), the amount excluding VAT, the VAT, the amount and the kW to the next step.
- **Capacity step table**: a grid tariff's dated list of steps (lower kW, upper kW or open, monthly amount excluding
  VAT) with a status (Superseded, In effect, Upcoming).
- **Monthly limit split**: for one hour, the kWh within and above the Norgespris monthly limit and the price parts of
  each.
- **Location pricing flags**: electricity tax exempt, VAT exempt, holiday home.
- **Monthly limit rate**: a dated national value in kWh per month, one kind for homes and one for holiday homes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the October 2026 reference bill (holiday home on Elvia), the capacity card shows the same step and
  amount as the bill (5–10 kW, 420 kr).
- **SC-002**: A household member can find which three hours set this month's capacity charge in one look at the
  dashboard, without opening anything.
- **SC-003**: No screen contradicts the numbers: zero occurrences of "grid fixed fee" or of "the monthly limit is not
  taken into account".
- **SC-004**: When an hour crosses the Norgespris monthly limit, 100% of the places that show that hour's price explain
  why it changed.
- **SC-005**: An administrator can enter a full Elvia step table (10 rows) in under 3 minutes.

## Assumptions

- API PR #24 and PR #25 are deployed before this feature is used; against an older API the dashboard keeps working and
  the new parts are simply absent.
- The capacity card is shown to every signed-in user linked to the location, like the saving card; it sits on the
  dashboard next to the saving card.
- Browsing months goes back as far as the API returns data; there is no month picker beyond previous/next.
- Entering the step amounts including VAT and converting them is a convenience in the dialog only; the API receives
  amounts excluding VAT.
- How much of the monthly limit has been used so far this month is not shown: the API does not return it. If wanted, it
  is a separate backend change.
- The price chart (`/prices`) already shows the rate of the next kWh given the month's consumption; it needs no change
  beyond what Story 2 does to the notes.
- The dashboard does not read the exemption flags (they are admin data); exemptions show up only through the numbers
  the API sends (taxes and VAT parts, capacity VAT 0).
