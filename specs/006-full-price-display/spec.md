# Feature Specification: Show the Full Price, Its Parts and the Norgespris Saving

**Feature Branch**: `006-full-price-display`

**Created**: 2026-11-16

**Status**: Draft

**Input**: Backend feature `no.sanddata.ams.api` -> `specs/008-full-electricity-price/` (contract in its `contracts/endpoints.md`, PR #23) and its backlog note `specs/_backlog/full-price-and-norgespris-saving-in-ui.md`. User description: "I also want to show in the UI what is saved using Norgespris", and "we can discuss if we will show the parts of the price in the UI".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prices and costs say what they include (Priority: P1)

Every price and cost on the dashboard now includes VAT, the grid charge, the electricity tax and the Enova fee, as the electricity bill does. The screens say so, so nobody compares the new, higher numbers with the old energy-only figures and thinks something is wrong. The monthly charges (the supplier monthly fee and the grid fixed fee) are not in the hourly figures, and that is stated too.

**Why this priority**: The numbers rise when the API is deployed. Without a label the first thing a household sees is a price that looks wrong.

**Independent Test**: Open the dashboard and find, on the right-now card, the usage chart and the price chart, a clear note that prices include VAT, the grid charge and taxes.

**Acceptance Scenarios**:

1. **Given** the right-now card, **When** it shows the cost this hour and the spot price now, **Then** a short note says the prices include VAT, the grid charge and taxes.
2. **Given** the price chart, **Then** its unit label says `kr / kWh incl. VAT`.
3. **Given** the last-hours card and the usage and cost chart in cost mode, **Then** the cost is labelled as including VAT, and the chart says the cost includes the grid charge and taxes.
4. **Given** any screen that explains the price, **Then** it states that the monthly charges are not included.
5. **Given** the usage view in kWh mode, **Then** nothing about VAT is added, because it shows energy, not money.

---

### User Story 2 - See what is in the price (Priority: P1)

A household member taps "What is in the price" on the right-now card and sees the parts of one kWh this hour: the energy, the supplier markup, the grid charge, the taxes, the VAT and the total, for their own plan and, next to it, for the other plan (spot or Norgespris). If the grid charge has not been set for the location yet, the dialog says that the price is without it, and an administrator gets a link to where to set it.

**Why this priority**: The parts make the price checkable against the bill and explain why Norgespris and spot differ.

**Independent Test**: On a spot location tap the button and see the six rows for "Spot price" and "Norgespris"; the rows add up to the total, which equals the rate shown on the card.

**Acceptance Scenarios**:

1. **Given** the current hour has prices, **When** the member opens the dialog, **Then** two columns (their plan and the other plan) show energy, supplier markup, grid charge, taxes, VAT and total in kr/kWh with up to four decimals.
2. **Given** the parts, **Then** they add up to the total shown, and the total is the same figure as the rate on the card for that plan.
3. **Given** the other plan is Norgespris, **Then** its supplier markup shows 0, because no markup applies under Norgespris.
4. **Given** the location has no grid tariff (`gridSet` false), **Then** the grid row says "Not set", the dialog explains that the price leaves out the grid charge until it is set, and a signed-in administrator sees a link to Location pricing; other users see "Ask an administrator".
5. **Given** the price for the hour is not available yet, **Then** the button is not shown.
6. **Given** the dialog, **Then** it states that the monthly charges are not included and that all figures include VAT in the total only (the rows above VAT are excluding VAT).

---

### User Story 3 - See what Norgespris saves (Priority: P2)

On the dashboard a card shows what Norgespris has saved for today, the last 7 days, the month so far and the year so far. A negative saving is shown as an extra cost, because Norgespris is more expensive than spot in cheap hours. For a location without the agreement the same card says what it would have saved.

**Why this priority**: It answers the question households ask about the agreement. It builds on the API from the backend feature and adds nothing else to the dashboard.

**Independent Test**: With a saving response of 12,30 for today and -4,50 for the week, the card shows "Saved 12,30 kr" and "Extra cost 4,50 kr" for the two periods.

**Acceptance Scenarios**:

1. **Given** the saving response, **When** the card renders, **Then** it shows four periods (Today, Last 7 days, This month, This year) each with the amount in kr and the words "Saved" or "Extra cost".
2. **Given** a location on Norgespris, **Then** the card is titled "What Norgespris has saved"; on spot it is titled "What Norgespris would have saved".
3. **Given** a period where some hours have no spot price (`hoursCounted` less than `hoursWithConsumption`), **Then** the card says how many of how many hours the figure is based on.
4. **Given** no readings in any period, **Then** the card says "No readings yet" instead of zeros.
5. **Given** the card, **Then** it states that the figure compares full prices including VAT and that the monthly limit of Norgespris (5 000 kWh) is not taken into account.
6. **Given** the request fails, **Then** the card shows the server message; while loading it shows a skeleton.
7. **Given** a saving of exactly zero, **Then** it reads "No difference".

---

### Edge Cases

- **Prices not available yet.** The right-now card keeps its existing "Price not available yet" state; the breakdown button and the saving figures follow the same rule.
- **Grid not set.** Costs still show, but are marked as without the grid charge in the breakdown; it is not an error.
- **Rounding.** Parts are shown with up to four decimals; the total is shown as sent, never recomputed in the browser.
- **Old API.** If the API does not send `parts` (an older deployment), the button is not shown and nothing breaks.
- **Long numbers.** Year totals with many digits are formatted with the Norwegian thousands separator.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The right-now card MUST state that its prices include VAT, the grid charge and taxes.
- **FR-002**: The price chart MUST label its unit as including VAT; the cost views of the last-hours card and the usage chart MUST label the cost as including VAT, and the usage chart in cost mode MUST say that it includes the grid charge and taxes.
- **FR-003**: Every explanation of the price MUST state that the monthly charges are not included.
- **FR-004**: The right-now card MUST offer a "What is in the price" dialog showing energy, supplier markup, grid charge, taxes, VAT and total for the location's plan and for the other plan, from the `parts` of the current-hour response.
- **FR-005**: The dialog MUST show the grid charge as "Not set" with an explanation when `gridSet` is false, and MUST link an administrator to the Location pricing page.
- **FR-006**: The dashboard MUST show a Norgespris saving card for today, the last 7 days, the month so far and the year so far from `GET /api/electricity-cost/saving`, with a negative value as an extra cost.
- **FR-007**: The saving card MUST say how many hours the figure is based on when some hours were left out, MUST show "No readings yet" when there is no data, and MUST state what is not taken into account (monthly limit, monthly charges).
- **FR-008**: Every call MUST go through the shared API client; the browser MUST NOT recompute any price or saving.

### Key Entities

- **Price parts**: energy, markup, grid (or none), taxes, VAT, total, and whether the grid is set, per kWh for one hour.
- **Saving period**: a named period with its dates, the saving, the hours counted and the hours with consumption.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On every dashboard screen that shows a price or a cost, the household can tell without opening anything that it includes VAT.
- **SC-002**: A household member can find what is in the price of the current hour in two taps.
- **SC-003**: The parts shown add up to the total shown in 100% of tested cases.
- **SC-004**: A negative saving is never shown as a saving or as a plain minus sign: it always reads as an extra cost.

## Assumptions

- The backend feature (API PR #23) is deployed before this one is used; against an older API the dashboard keeps working and the new parts are simply absent.
- The price chart keeps its wording "spot price"; the numbers are the full spot-terms price including VAT, grid charge and taxes, and the unit label and the note say so.
- The saving is read from the API for the selected location; the browser does not recompute it.
- The pages for maintaining the price data are a separate feature (005, PR #19).
- Per-hour parts in the hourly list and the history view are out of scope; only the current hour is explained.
