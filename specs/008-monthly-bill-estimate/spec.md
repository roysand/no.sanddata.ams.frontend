# Feature Specification: Show the Bill for the Month, Estimated and Final

**Feature Branch**: `008-monthly-bill-estimate`

**Created**: 2026-11-19

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/010-monthly-bill-estimate/` (API PRs #27 to #32; contract in
its `contracts/endpoints.md`, field meanings in its `data-model.md`). Item 3 of the feature backlog agreed on
2026-11-18. User description: "Monthly bill estimate in the frontend. (1) An 'Expected bill' card on the dashboard
for the current month: the estimated total, how much is known so far vs projected, the provisional capacity step,
marked as an estimate, and how many days of data the projection is based on. The Strøm and Nettleie parts with their
lines can be expanded. (2) A bill for a finished month that can be read line by line next to the invoice, reached
from the History page with a month picker. (3) The Admin location pricing page gets a supplier monthly fee field, and
a location without the fee is shown as incomplete. Lines that are not set are shown as 'not set', never as 0, and the
bill is marked incomplete. Ground truth: the July 2026 invoice for Roy's Norgespris holiday home totals 673,55 kr."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See what this month's bill will probably be (Priority: P1)

A household member opens the dashboard in the middle of the month and sees an "Expected bill" card for the selected
location: the expected total for the month in kr, how much of it is already used and charged ("so far") and how much
the rest of the month will probably add ("expected for the rest of the month"). The card says plainly that it is an
estimate and how many days of recent use it is based on, so the household can judge how certain it is. The capacity
step in the estimate is marked as provisional, because a higher peak later in the month can raise it. The household
can open the Strøm part and the Nettleie part to see the lines behind the total.

**Why this priority**: This is the number other electricity apps show first, and the reason for the backend feature.
Today the app shows what hours and days cost, but not what the month will cost in total, and the hourly figures leave
out the monthly fee and the capacity charge.

**Independent Test**: With a bill response for November 2026 (status Estimate, total 673,54 kr of which 412,30 kr so
far and 261,24 kr projected, projection based on 7 days, capacity 5–10 kW provisional), open the dashboard and see
these figures, the word "Estimate" and "based on the last 7 days"; open Strøm and Nettleie and see their lines.

**Acceptance Scenarios**:

1. **Given** the bill of the current month, **When** the card renders, **Then** it shows the expected total in kr
   including VAT, the amount so far and the amount expected for the rest of the month, and marks the total as an
   estimate.
2. **Given** the projection is based on 7 days or more, **Then** the card says the rest of the month is estimated from
   the last 7 days of use; **given** fewer days (a new location or few readings), **Then** it says how many days (for
   example "based on 2 days of use") and that the estimate is uncertain; **given** 0 days, **Then** it says there is
   no use yet to estimate from and that the expected amount covers only what is known and the fixed amounts.
3. **Given** the capacity part of the bill, **Then** the card shows the step (for example "5–10 kW") and says it is
   provisional, because a higher peak later in the month can raise it.
4. **Given** the card, **When** the household opens Strøm or Nettleie, **Then** it shows the part's subtotal and each
   line with its name, quantity and amount; each line also shows its so-far and projected amounts when it has a
   projected amount.
5. **Given** a Norgespris location, **Then** the card explains in one sentence that the supplier bills spot price and
   the grid company credits the difference down to the Norgespris rate, so the Strøm part is higher and the Nettleie
   part lower than the net cost.
6. **Given** the request is loading, **Then** the card shows a skeleton; **given** it fails, **Then** it shows the
   server message.
7. **Given** the bill is incomplete (user story 4), **Then** the card says so with the reason, as described there.

---

### User Story 2 - Check a finished month against the invoice (Priority: P1)

A household member opens the History page, picks a month that has ended, and sees the bill the way the invoice is
laid out: the Strøm part (supplier) and the Nettleie part (grid), each with its lines and subtotal, and the total.
Each line shows its quantity (kWh, or 1 month), its price per unit, its VAT rate and its amount, so the household can
put the app's bill next to the invoice and check it line by line.

**Why this priority**: It is how the household learns to trust the estimate: when last month's bill matches the
invoice, this month's estimate is credible. It also catches wrong pricing settings (a missing markup, an old tariff).

**Independent Test**: With a bill response for July 2026 built from the reference invoice in "Reference data for the
tests", open History, go to July 2026 and confirm that every invoice line is shown with the same quantity, price,
VAT rate and amount, the subtotals 417,33 kr and 256,22 kr, and the total 673,55 kr, and that the bill is marked as
final.

**Acceptance Scenarios**:

1. **Given** the History page, **When** it opens, **Then** a "Bill" section shows the previous month (the last
   finished month), with buttons to step to the previous and next month.
2. **Given** a finished month, **Then** the bill is marked as final, is not called an estimate, and shows no so-far
   or projected split.
3. **Given** the Strøm part, **Then** it lists, in this order, the supplier monthly fee, the energy at spot price and
   the supplier markup; **given** the Nettleie part, **Then** it lists the grid energy for weekdays 06–22, the grid
   energy for nights and weekends, the capacity charge, the electricity tax, the Enova fee and, for a Norgespris
   location only, the Norgespris credit.
4. **Given** a line in kWh, **Then** its quantity is shown in kWh with two decimals and its price in øre per kWh with
   two decimals (as on the invoice); **given** a monthly line, **Then** its quantity is "1 month" and its price is in
   kr per month.
5. **Given** a line, **Then** its VAT rate is shown as a percentage (25 % or 0 %), and its amount in kr with two
   decimals including VAT.
6. **Given** the Norgespris credit, **Then** it is shown as a negative amount that lowers the Nettleie part, with
   0 % VAT; **given** a month where the credit is a charge (spot below the Norgespris rate on balance), **Then** it is
   shown as a positive amount.
7. **Given** each part and the total, **Then** the amount excluding VAT and the VAT are shown beside the amount
   including VAT, as the invoice shows them.
8. **Given** the household steps forward to the current month, **Then** the same section shows the current month as
   an estimate (as in user story 1, with so far and projected per line); the next-month button is disabled on the
   current month.
9. **Given** the household steps back to a month without readings, **Then** the section says there are no readings
   for that month instead of showing zeros, and the previous-month button is disabled, so stepping stops at the first
   month with data.
10. **Given** the server refuses a month that has not started, **Then** the section shows the server message; the
    buttons never lead to such a month.

---

### User Story 3 - An administrator sets the supplier monthly fee (Priority: P2)

An administrator opens the location pricing page and sets, per location, the supplier's monthly fee next to the
supplier markup: an amount in kr per month excluding VAT (27,20 kr for Fjordkraft in July 2026, which is 34,00 kr
including VAT). The list of locations shows the fee, and a location without a fee is marked as incomplete, as one
without a grid tariff is today.

**Why this priority**: The bill needs the fee, and until it is set every bill is incomplete. It is one field on an
existing dialog, and the bill views can be built and tested without it.

**Independent Test**: As an administrator, open the pricing dialog of a location, enter 27,20 as the monthly fee and
save; confirm the list shows 27,20 kr and the location is no longer incomplete (if it has a grid tariff), and that the
location's bill now shows a monthly fee line of 34,00 kr.

**Acceptance Scenarios**:

1. **Given** the location pricing dialog, **Then** it has a field "Supplier monthly fee (kr per month excluding VAT)"
   filled with the current value, or empty when it is not set.
2. **Given** a value from 0 to 10 000 kr, **When** the administrator saves, **Then** it is saved; **given** a value
   outside that range or not a number, **Then** the dialog shows a message before sending, and a refusal from the
   server (invalid monthly fee) is shown on the field.
3. **Given** the field is left empty on a location where the fee is already set, **When** the dialog is saved,
   **Then** the fee is kept (the server keeps a value that is not sent); the dialog says that 0 is entered for a
   supplier without a fee.
4. **Given** the list of locations, **Then** it has a column with the monthly fee, "Not set" where there is none, and
   a location is marked incomplete unless it has both a grid tariff and a monthly fee; the explanation above the list
   says both are needed.
5. **Given** the markup field, **Then** its help text says the markup is added to every kWh, also under Norgespris
   (it says the opposite today).
6. **Given** a regular user, **Then** the page and the field are not available, as today.

---

### User Story 4 - A bill with missing settings says so (Priority: P2)

When a setting the bill needs is missing (the supplier monthly fee, the grid tariff, or the capacity steps for the
month), the line it belongs to is shown as "Not set", never as 0 kr, and the bill is marked as incomplete with a short
reason, so the household does not mistake a too-low total for the real one. An administrator gets a link to the
pricing page where it is set; other users are told to ask an administrator.

**Why this priority**: Every bill is incomplete until the fee is set in production (see the API's July bill check),
so the views must handle it from day one, but it is a state of the views in user stories 1 and 2, not a view of its
own.

**Independent Test**: With a bill response where the monthly fee line has `set: false` and `isComplete: false`, open
the card and the History bill; confirm the fee line says "Not set", the total is labelled as incomplete ("without the
lines that are not set"), and an administrator sees a link to the pricing page.

**Acceptance Scenarios**:

1. **Given** a line that is not set, **Then** it shows "Not set" in place of its price and amount, and is not counted
   in its part or the total (as the server does).
2. **Given** a bill that is incomplete, **Then** the total carries the word "Incomplete" and a note listing the lines
   that are not set; an administrator sees a link to the location pricing page, other users "Ask an administrator".
3. **Given** a line that is set but not complete (some hours could not be priced, for example a missing spot price),
   **Then** the line is marked as possibly too low, and the bill is marked incomplete with that reason.
4. **Given** fewer priced hours than hours with readings, **Then** the bill says how many hours could not be priced.

---

### User Story 5 - The other cost texts point to the bill (Priority: P3)

The Now card, the usage chart, the price breakdown and the CSV export say that their costs leave out the supplier's
monthly fee and the capacity charge. That stays true for hourly and daily costs, but the household can now see the
full month. Where these notes appear, they say where the full monthly amount is shown.

**Why this priority**: Wording only; the figures are right without it.

**Independent Test**: Open the Now card and the usage chart and confirm their notes mention the expected bill.

**Acceptance Scenarios**:

1. **Given** the notes about what is not included on the Now card, the usage chart, the price breakdown and the CSV
   export, **Then** each still says what is left out and adds that the expected bill for the month includes it.

---

### Edge Cases

- **First day of the month**: the projection comes from the last 7 days of the previous month; the card shows a small
  "so far" and a large projected amount, and says what it is based on as usual.
- **New location with no readings**: the projection is 0 kWh based on 0 days; the card shows the fixed amounts only
  and says there is no use yet to estimate from.
- **Last day of the month**: the projected part is small; the card still says estimate until the month has ended.
- **Month change while the app is open**: after midnight on the first, the card moves to the new month the next time
  it refreshes, and the History bill's "previous month" is the month that just ended.
- **Norgespris location above its monthly cap**: no extra text is needed; the credit quantity is lower than the energy
  quantity and the lines show it.
- **VAT-exempt location**: VAT is 0 % on every line; amounts are not labelled "including VAT" and the VAT column is 0.
- **Spot location**: no Norgespris credit line and no Norgespris explanation.
- **Negative total of a part**: shown with a minus sign; it does not break the layout.
- **No location selected or no active location**: the card and the History bill are not shown, as other cards
  behave.
- **Server refusal for an invalid or not-started month**: the server message is shown; the views never ask for such
  a month.
- **The estimate has no assumed spot price** (no spot prices in the last 7 days): nothing extra is shown; the lines
  that could not be priced are handled as in user story 4.

## Requirements _(mandatory)_

### Functional Requirements

**Expected bill card (dashboard)**

- **FR-001**: The dashboard MUST show an "Expected bill" card for the selected location and the current Oslo month,
  placed near the capacity card.
- **FR-002**: The card MUST show the expected total, the amount so far and the amount expected for the rest of the
  month, all in kr including VAT (excluding VAT where the location is exempt), and mark the total as an estimate.
- **FR-003**: The card MUST say how many days of use the projection is based on, rounded to whole days, and MUST call
  the estimate uncertain when that is fewer than 7 days.
- **FR-004**: The card MUST show the capacity step of the month and say it is provisional.
- **FR-005**: The card MUST let the household expand the Strøm part and the Nettleie part to see their subtotals and
  lines, closed by default.
- **FR-006**: The card MUST refresh on the same schedule as the other cards of the current month, so the so-far
  amount grows during the day without a reload.

**Bill of a month (History page)**

- **FR-007**: The History page MUST show a "Bill" section for the selected location, opening on the previous Oslo
  month, with previous and next buttons; next MUST be disabled on the current month.
- **FR-008**: The previous button MUST be disabled when the shown month has no readings, so stepping back stops at
  the first month with data.
- **FR-009**: For a finished month, the section MUST show the bill as final, with each part's lines in the order of
  the invoice (Strøm: monthly fee, energy at spot price, markup; Nettleie: grid energy weekdays 06–22, grid energy
  nights and weekends, capacity charge, electricity tax, Enova fee, Norgespris credit for Norgespris locations).
- **FR-010**: Each line MUST show its name, its quantity (kWh with two decimals, or "1 month"), its price per unit
  (øre per kWh with two decimals, or kr per month), its VAT rate in percent and its amount in kr with two decimals.
- **FR-011**: Each part and the total MUST show the amount excluding VAT, the VAT and the amount including VAT.
- **FR-012**: For the current month, the same section MUST show the bill as an estimate with the so-far and
  projected amount of each line and of the total.
- **FR-013**: The Norgespris credit MUST be shown with its sign: negative when it lowers the bill, positive when it is
  a charge.

**Missing settings and incomplete bills (both views)**

- **FR-014**: A line that is not set MUST be shown as "Not set", never as 0 kr, and MUST NOT be counted in the shown
  subtotals or total.
- **FR-015**: An incomplete bill MUST be marked "Incomplete" next to its total with the reasons: the lines that are
  not set, the lines that are not complete, and the number of hours with readings that could not be priced.
- **FR-016**: An incomplete bill MUST offer administrators a link to the location pricing page, and tell other users
  to ask an administrator.

**Administration**

- **FR-017**: The location pricing dialog MUST have a supplier monthly fee field in kr per month excluding VAT,
  accepting 0 to 10 000 with at most four decimals (as the API), checked before sending; the rule mirrors the server's and the
  server remains the authority.
- **FR-018**: A server refusal of the fee (invalid monthly fee) MUST be shown on the field.
- **FR-019**: An empty fee field MUST leave the stored fee unchanged; the dialog MUST say that 0 is entered for a
  supplier without a monthly fee.
- **FR-020**: The location pricing list MUST show each location's monthly fee, "Not set" when there is none, and
  mark a location incomplete unless both the grid tariff and the fee are set; its explanation MUST say so.
- **FR-021**: The markup field's help text MUST say the markup is added to every kWh, also under Norgespris.

**Texts**

- **FR-022**: The notes on the Now card, the usage chart, the price breakdown and the CSV export that say the monthly
  fee or the capacity charge is not included MUST add that the expected bill for the month includes them.

**General**

- **FR-023**: Amounts MUST use the app's Norwegian number format (decimal comma) and month names, and month
  boundaries MUST follow Oslo time.
- **FR-024**: Both views MUST show a loading state while the bill is fetched and the server's message when it fails.

### Key Entities _(include if feature involves data)_

- **Monthly bill**: the bill of one location and one month: its status (estimate or final), its pricing model (spot
  or Norgespris), whether it is complete, the hour counts (in the month, passed, with readings, priced), the
  projection (from when, how many hours and kWh, how many days it is based on), the capacity step and whether it is
  provisional, the Strøm part, the Nettleie part and the total.
- **Bill part**: Strøm or Nettleie: its lines and its sums (so far, projected, excluding VAT, VAT, amount).
- **Bill line**: one invoice line: its kind, unit (kWh or month), quantity, price per unit, VAT rate, whether its
  setting is set, whether all its hours were priced, and its amounts (so far, projected, total, excluding VAT, VAT).
- **Location pricing** (changed): gains the supplier monthly fee (kr per month excluding VAT, or not set).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For the July 2026 reference bill, a household can find every line of the invoice in the app with the
  same quantity, price per unit, VAT rate and amount as the response gives, and the total 673,55 kr, in under a
  minute from opening the History page.
- **SC-002**: On the dashboard, the expected total for the month, the so-far amount and what the estimate is based on
  are visible without opening anything.
- **SC-003**: In 100 % of tested bills with a line not set, no "0,00 kr" is shown for that line, and the total is
  marked incomplete.
- **SC-004**: The amounts shown for every line, part and total equal the server's amounts rounded to the øre; the view
  never adds up its own totals differently from the server.
- **SC-005**: An administrator can set the monthly fee of a location in one dialog, and the location stops being
  marked incomplete (when it has a grid tariff) as soon as the dialog closes.
- **SC-006**: No regular user can reach the fee field.

## Assumptions

- The backend feature is merged and deployed (API PRs #27 to #32); the bill endpoint and the changed pricing
  endpoints behave as its contract says. The markup change under Norgespris (its user story 1) changes figures the
  app already shows but needs no frontend change apart from the help text (FR-021).
- The server gives all amounts at full precision; the app only rounds for display (two decimals in kr, two decimals
  in øre for kWh prices). Shown subtotals come from the server, not from adding rounded lines, so a sum of shown
  lines can differ from the shown subtotal by an øre, as on an invoice.
- Line names are the app's English names for the invoice lines (for example "Monthly fee", "Energy at spot price",
  "Markup", "Grid energy, weekdays 06–22", "Grid energy, nights and weekends", "Capacity charge", "Electricity tax",
  "Enova fee", "Norgespris credit"); the Norwegian invoice name may be shown beside each to help the comparison.
- The electricity tax and the Enova fee are each one line with the total kWh; the invoice splits each into day and
  night lines at the same rate, so the household adds the invoice's two lines to compare.
- The location has no "first reading" date in the app, so the first month with data is found by stepping back until
  a month has no readings (FR-008).
- The capacity card stays as it is; the bill shows only the step and the amount, not the peaks.
- Uncertainty is shown as so far versus projected and the number of days the projection is based on, not as a range,
  as decided for the backend.
- Fjordkraft and Elvia are the reference for the layout; other suppliers' layouts are out of scope.

## Reference data for the tests

The July 2026 invoice of Roy's Norgespris holiday home (Fjordkraft with the grid part from Elvia), from the API's spec 010. Test bills for July 2026 use these figures; the app must show them as follows.

**Strøm, 417,33 kr**

| Line                 | Quantity   | Price          | VAT  | Amount |
| -------------------- | ---------- | -------------- | ---- | ------ |
| Monthly fee          | 1 month    | 34,00 kr/month | 25 % | 34,00  |
| Energy at spot price | 240,31 kWh | 155,52 øre/kWh | 25 % | 373,74 |
| Markup               | 240,31 kWh | 3,99 øre/kWh   | 25 % | 9,59   |

**Nettleie, 256,22 kr**

| Line                             | Quantity   | Price           | VAT  | Amount  |
| -------------------------------- | ---------- | --------------- | ---- | ------- |
| Grid energy, weekdays 06–22      | 95,58 kWh  | 36,24 øre/kWh   | 25 % | 34,64   |
| Grid energy, nights and weekends | 144,73 kWh | 21,24 øre/kWh   | 25 % | 30,74   |
| Capacity charge, 5–10 kW         | 1 month    | 420,00 kr/month | 25 % | 420,00  |
| Electricity tax                  | 240,31 kWh | 8,91 øre/kWh    | 25 % | 21,41   |
| Enova fee                        | 240,31 kWh | 1,25 øre/kWh    | 25 % | 3,01    |
| Norgespris credit                | 240,31 kWh | −105,52 øre/kWh | 0 %  | −253,58 |

**Total 673,55 kr** (488,12 kr excluding VAT and 185,43 kr VAT).
