# Feature Specification: What the Car Charging Costs, on the Bill

**Feature Branch**: `016-car-charging-cost`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Car charging cost on the bill, on top of API spec 019" (`no.sanddata.ams.api` →
`specs/019-ev-charger-cost/`, merged and deployed 2026-11-23; handover in `specs/_backlog/ev-charger-cost.md`).

Spec 013 put the car charger's kWh on the bill as a small note below the total: "Car charging so far this month:
212,7 kWh · not counted with the house". The car has never been priced. API spec 019 now sends, with the bill's car
figures, what the car's kWh so far have cost and which rule priced them.

Roy's charger at Hjemme has its own meter in the garage. Spec 013's setting "Count the car charger with the house" says
which agreement it is on, and that decides the price. Chosen with Roy on 2026-11-22:

- **Not counted with the house**: the car is on its own agreement (at Hjemme, the garages', with Norgespris). Its kWh
  cost the **Norgespris price including VAT**, energy only. This rule may change later.
- **Counted with the house**: the car is on the house's agreement. Its kWh cost **what a kWh costs the house** in the
  same hour, at spot price above the house's Norgespris limit, without the capacity charge or the monthly fees.
- On the **bill only**, for the hours **so far**, never projected, and **added to no line or total**.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - See what the car charging has cost this month (Priority: P1)

On the expected bill on Now and on the bill on History, the car note gives the car's cost so far next to its kWh, and
says how it was priced: for example "Car charging so far this month: 212,7 kWh · 106,35 kr at the Norgespris price ·
not counted with the house".

**Why this priority**: It is the figure Roy asked for: what charging the car costs, which the kWh alone don't say.

**Independent Test**: For Hjemme in November, with the car not counted with the house, the note on Now and on History
shows the car's kWh, its cost, "at the Norgespris price" and "not counted with the house".

**Acceptance Scenarios**:

1. **Given** a bill whose car figures have a cost priced at the Norgespris price, **When** the bill is shown, **Then**
   the car note gives the kWh, the cost, "at the Norgespris price", and whether the car is counted with the house.
2. **Given** a cost priced at the house's price, **When** the bill is shown, **Then** the note says "at the house's
   price" instead.
3. **Given** the bill's lines and total, **When** the car's cost is shown, **Then** none of them changes: the cost is
   set apart in the note, as the water heating's cost is.
4. **Given** the current month, **When** the note is shown, **Then** the cost is the hours so far, as the kWh are: it
   is never projected to the end of the month.
5. **Given** a past month on History, **When** its bill is shown, **Then** its car note gives that month's cost the
   same way.

---

### User Story 2 - A cost that can't be worked out is never shown as 0 kr (Priority: P1)

When the car's cost can't be worked out, for example because a price is missing for an hour, the note still gives the
kWh and says the charging isn't priced, so nobody takes a missing figure for a free month.

**Why this priority**: A wrong figure on a bill is worse than none.

**Independent Test**: With a bill whose car figures have no cost, the note shows the kWh, "not priced", and whether
the car is counted with the house, and no amount.

**Acceptance Scenarios**:

1. **Given** car figures without a cost, **When** the bill is shown, **Then** the note gives the kWh and "not priced",
   and no amount.
2. **Given** an API without spec 019, **When** the bill is shown, **Then** the note reads as before spec 016: kWh and
   whether the car is counted with the house.
3. **Given** a pricing rule the app doesn't know, **When** the bill is shown, **Then** the cost is shown without
   saying how it was priced.
4. **Given** car kWh that are estimated (spread over a session), **When** the cost is shown, **Then** it reads "about"
   before the cost.

---

### Edge Cases

- **No charging in the month**: there is no car note, as before.
- **The setting changed**: the API prices every month by the current setting, so the note follows it; the note's
  "counted / not counted with the house" and the pricing rule always agree.
- **A VAT-exempt zone**: the API leaves out the VAT; the note shows the cost as sent.
- **A cost below 1 kr**: shown in øre as the app's other amounts, never rounded to 0.
- **A negative cost** (house's price with negative spot prices): shown as sent, with the minus sign.
- **Phone width**: the note may wrap to two lines at 375 px; it stays in small muted text below the total.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The bill's car note MUST show the car's cost so far, in the app's money format, next to its kWh, on both
  the Now page's expected bill and the History bill.
- **FR-002**: The note MUST say how the cost was priced: "at the Norgespris price" or "at the house's price". For a
  rule the app doesn't know, it MUST show the cost without a rule.
- **FR-003**: The note MUST keep saying whether the car is counted with the house.
- **FR-004**: When the cost can't be worked out, the note MUST show the kWh and "not priced", and MUST NOT show an
  amount.
- **FR-005**: The cost MUST NOT be added to any line, part or total of the bill, nor to the expected total.
- **FR-006**: For estimated car kWh, the cost MUST read "about".
- **FR-007**: With an API without spec 019, the note MUST read exactly as before.
- **FR-008**: The backlog entry "Car charging cost" MUST be removed, since this spec covers it.

### Key Entities

- **Car charging cost** (from the API, on the bill's car figures): the cost so far in NOK including VAT, or none when
  it can't be worked out, and the rule that priced it (Norgespris price or house's price).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: For Hjemme's current month, the car note's cost equals the car's kWh so far × the Norgespris price
  including VAT (on the Admin Norgespris page) within 1 øre, with the car not counted with the house.
- **SC-002**: The bill's total on Now and on History is the same, to the øre, with and without this feature.
- **SC-003**: A bill whose car figures have no cost never shows "0 kr" for the car.
- **SC-004**: At 375 px, in light and dark mode, the car note fits in at most two lines.

## Assumptions

- API spec 019 is deployed (2026-11-23). Its field names come from its contract: the cost and the rule on the bill's
  car figures.
- The note's place and look stay as spec 013 made them: small muted text below the total and the water heating note.
- The car's cost on the Car tab, in the hourly and daily figures and in the CSV export is out of scope: the API sends it
  on the bill only.
- The car's cost is never projected for the rest of the month: the car's kWh aren't either.
