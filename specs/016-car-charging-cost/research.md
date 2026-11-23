# Research: What the Car Charging Costs, on the Bill

The figures are fixed by API spec 019's contract (`no.sanddata.ams.api` →
`specs/019-ev-charger-cost/contracts/endpoints.md`).

## R1. An older API

**Decision**: `getMonthlyBill` reads a car part without `pricedAt` as `cost: null, pricedAt: null`. The note shows the
cost only when `pricedAt` is set. So `pricedAt: null` means "no cost figures" (the note as before, FR-007), while
`pricedAt` set and `cost: null` means "not priced" (FR-004).

**Rationale**: The API sets `pricedAt` whenever it sends the part, so it tells the two cases apart without a second
flag.

## R2. The rule's wording

**Decision**: `NorgesPrisPrice` → "at the Norgespris price", `HousePrice` → "at the house's price", any other value →
no rule (FR-002). The type is `'NorgesPrisPrice' | 'HousePrice' | (string & {})` so an unknown value type-checks.

## R3. Placement and format

**Decision**: the cost goes between the kWh and the "counted" part, separated by " · ", in `formatNok` as the water
heating note's cost. "about " goes before the amount when `estimated` is true. No new line, so the note stays one
paragraph that wraps at most to two lines at 375 px.
