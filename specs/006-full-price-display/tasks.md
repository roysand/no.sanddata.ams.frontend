---

description: "Task list for Show the Full Price, Its Parts and the Norgespris Saving"
---

# Tasks: Show the Full Price, Its Parts and the Norgespris Saving

**Input**: `specs/006-full-price-display/` (spec.md, plan.md). Backend contract: `no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md`.

**Tests**: Required (constitution VII). `npm run build`, `npm run lint` and `npm test` must pass.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundation

- [x] T001 Add to `src/features/dashboard/types.ts`: `PriceParts` (`energy`, `markup`, `grid: number | null`, `taxes`, `vat`, `total`, `gridSet`), an optional `parts?: PriceParts` on `CurrentRateCost` and `HourRateCost` (optional so an older API does not break the card), `SavingPeriodName` (`'Today' | 'Last7Days' | 'MonthToDate' | 'YearToDate'`), `SavingPeriod` (`period`, `from`, `to`, `saving`, `hoursCounted`, `hoursWithConsumption`) and `NorgesPrisSaving` (`periods`).
- [x] T002 Add `getNorgesPrisSaving(locationId)` to `src/features/dashboard/api.ts` (`GET /api/electricity-cost/saving`) and `useNorgesPrisSaving(locationId)` to `hooks.ts` (key `['cost', 'saving', locationId]`, refetch every 15 minutes).
- [x] T003 [P] Add to `src/features/dashboard/format.ts`: `formatKrPerKwh(value)` (nb-NO, 2 to 4 decimals, no unit text beyond `kr/kWh`), `formatSaving(value)` returning `{ label: 'Saved' | 'Extra cost' | 'No difference', amount: string }` (absolute value as kr with the Norwegian format), and `SAVING_PERIOD_LABELS`.
- [x] T004 [P] Write `src/features/dashboard/format.test.ts` additions: `formatKrPerKwh` (0.4 gives `0,40`, 0.0813 keeps four decimals), `formatSaving` (positive, negative, zero, large numbers with the thousands separator).

## Phase 2: US1 - Prices say what they include (P1)

- [x] T005 [US1] `NowCard.tsx`: under the three tiles add the note "Prices include VAT, the grid charge and taxes. Monthly charges are not included." (muted, small).
- [x] T006 [P] [US1] `PriceTimeline.tsx`: the unit label becomes `kr / kWh incl. VAT`; `RecentUsage.tsx`: the cost label becomes `Cost incl. VAT` (and the incomplete variant keeps its text); `UsageChart.tsx`: in cost mode a muted line under the toggle says "Cost includes VAT, the grid charge and taxes. Monthly charges are not included."; nothing is added in kWh mode.
- [x] T007 [US1] Update the tests that assert these texts (`NowCard.test.tsx`, `PriceTimeline.test.tsx`, `UsageChart.test.tsx`, `DashboardPage.test.tsx`, `RecentUsage.test.tsx` as needed) and add tests: the note on the right-now card, the unit label, the cost label, the note in cost mode and its absence in kWh mode.

## Phase 3: US2 - What is in the price (P1)

- [x] T008 [US2] Create `src/features/dashboard/PriceBreakdownDialog.tsx`: a Dialog with a Table, columns "{plan label}" and "{other plan label}", rows Energy, Supplier markup, Grid charge, Taxes (electricity tax and Enova fee), VAT and Total, values from `actual.parts` and `comparison.parts` with `formatKrPerKwh`; the grid row says "Not set" and the dialog explains the price leaves it out when `gridSet` is false (an administrator, from `useAuth().roles`, gets a link to `/admin/location-pricing`, others read "Ask an administrator"); a footnote: "Energy, markup, grid charge and taxes are excluding VAT; the total includes VAT. Monthly charges (supplier and grid fixed fee) are not included."; if only one plan has parts it shows one column.
- [x] T009 [US2] `NowCard.tsx`: a "What is in the price" button (`aria-label` as the text) that opens the dialog, shown only when `data.actual?.parts` exists.
- [x] T010 [P] [US2] Write `src/features/dashboard/PriceBreakdownDialog.test.tsx` and extend `NowCard.test.tsx`: the rows and values for both plans; the total equals the rate on the card; Norgespris has markup 0; grid not set shows "Not set", the explanation and the Admin link for an administrator and "Ask an administrator" for a user; the button is absent without prices and without `parts`; the dialog closes.

## Phase 4: US3 - What Norgespris saves (P2)

- [x] T011 [US3] Create `src/features/dashboard/SavingCard.tsx` (props `locationId`, `hasNorgesPriceAgreement`): title by plan; four periods in a grid with the amount and the word from `formatSaving`; the "based on n of m hours" line when some hours were left out; "No readings yet" when `hoursWithConsumption` is 0 in every period; skeleton while loading; the server message on error; a footnote "Compared at full price including VAT. The monthly limit of Norgespris (5 000 kWh) and the monthly charges are not taken into account."
- [x] T012 [US3] `DashboardPage.tsx`: render `SavingCard` after `RecentUsage`, with `selected.hasNorgesPriceAgreement`; add the MSW handler for the saving endpoint to every existing test that renders the dashboard page.
- [x] T013 [P] [US3] Write `src/features/dashboard/SavingCard.test.tsx`: the four periods with Saved and Extra cost wording; both titles; the partial-hours line; the no-readings state; zero reads "No difference"; loading, error; large numbers.

## Phase 5: Polish

- [x] T014 Update `README.md` (the dashboard slice line); run `npm run format`, `npm run lint`, `npm run build`, `npm test`.
- [ ] T015 Manual check in a browser against the backend from PR #23 (a scratch database copy): labels, the dialog for a spot and a Norgespris location, the grid not set case, the saving card with a negative figure. (Not done: needs a browser and the backend from PR #23 running.)
- [ ] T016 Commit, push, open the pull request; mention that it works against the old API too (no `parts`, no saving) but is meant for the PR #23 API.

## Dependencies & order

Phase 1 first. US1, US2 and US3 are independent after Phase 1 (US2 and US1 both touch `NowCard.tsx`, so do them in order). Polish last.
