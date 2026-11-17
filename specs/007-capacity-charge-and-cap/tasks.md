---

description: "Task list for Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions"
---

# Tasks: Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions

**Input**: `specs/007-capacity-charge-and-cap/` (spec.md, plan.md, research.md, data-model.md,
contracts/api-usage.md, quickstart.md). Backend contract: `no.sanddata.ams.api`
`specs/008-full-electricity-price/contracts/endpoints.md`, "Addendum 2026-11-17 (stories 6 and 7)".

**Tests**: Required (constitution VII). Vitest + RTL + user-event + MSW (`src/test/server.ts`, `src/test/render.tsx`);
assert what a user sees. `npm run build`, `npm run lint` and `npm test` must pass.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundation (blocks the dashboard stories)

- [x] T001 Add to `src/features/dashboard/types.ts`: `CapSplit` (`kwhWithinCap`, `kwhAboveCap`, `aboveCapParts:
  PriceParts`), optional `cap?: CapSplit | null` on `CurrentRateCost` and `HourRateCost` (doc comment: `parts` are then
  the within-limit parts and `ratePerKwh` the blended rate), `CapacityPeak` (`date`, `hourStartUtc`, `kw`) and
  `CapacityCharge` (`month`, `provisional`, `set`, `peaks`, `averageKw`, `step: { lowerKw; upperKw: number | null } |
  null`, `amountExclVat`, `vat`, `amount`, `kwToNextStep`, nullable as in data-model.md).
- [x] T002 [P] Add to `src/features/dashboard/format.ts`: `osloMonth(now: Date)` (`yyyy-MM` in Europe/Oslo),
  `addMonths(month, n)` (pure string arithmetic on `yyyy-MM`), `formatMonth(month)` (e.g. "October 2026"), `formatKw(value)`
  (nb-NO, one decimal, `kW`).
- [x] T003 [P] Extend `src/features/dashboard/format.test.ts`: `osloMonth` at 23:30 UTC on the last day of a month is
  already the next Oslo month; `addMonths` across a year boundary both ways; `formatMonth`; `formatKw` (5.4 → `5,4 kW`).
- [x] T004 Create `src/features/dashboard/cap.ts`: `norgesPrisSide(current)` returns `actual` on a Norgespris location
  and `comparison` on a spot location; `isAboveCap(rate)` is true when `rate?.cap` has `kwhAboveCap > 0`.
- [x] T005 [P] Write `src/features/dashboard/cap.test.ts`: both sides; `cap` null, absent, and with kWh above.

**Checkpoint**: types and helpers ready; existing tests still pass.

---

## Phase 2: US1 - See the capacity charge of the month (P1) 🎯 MVP

**Goal**: A dashboard card with the step, the amount, the peaks, the kW to the next step and month navigation.

**Independent test**: With the October 2026 response from the contract, going back to October shows 5–10 kW, 420 kr,
peaks 6,2 / 5,1 / 4,9 kW, "4,6 kW below the next step", and no "Provisional".

- [x] T006 [US1] Add `getCapacityCharge(locationId, month)` to `src/features/dashboard/api.ts`
  (`GET /api/electricity-cost/capacity?locationId=&month=`) and `useCapacityCharge(locationId, month, isCurrent)` to
  `src/features/dashboard/hooks.ts` (key `['cost', 'capacity', locationId, month]`, `enabled: !!locationId`,
  `refetchInterval` 15 minutes only when `isCurrent`).
- [x] T007 [P] [US1] Create `src/features/dashboard/capacity.ts`: `isVatExempt(charge)` (`vat === 0` and `amount` not
  null), `stepLabel(step)` ("5–10 kW", "100 kW and above"), `averageLabel(peaks.length)` ("Average of the three highest
  days" / "Average of N days" / "Average of 1 day"), `peakLabel(peak)` (Oslo date and clock hour, e.g. "14.10. 18:00",
  using the helpers in `format.ts`).
- [x] T008 [P] [US1] Write `src/features/dashboard/capacity.test.ts` for the four helpers, including the open top step
  and a peak during summer time.
- [x] T009 [US1] Create `src/features/dashboard/CapacityCard.tsx` (prop `locationId`): title "Capacity charge", month
  state starting at `osloMonth(new Date())` with previous/next buttons (next disabled at the current month,
  `aria-label`s "Previous month"/"Next month"), the month name; when `set`: the amount (`formatNok`, "incl. VAT" unless
  `isVatExempt`, then "No VAT for this location"), `stepLabel`, the average (`formatKw`) with `averageLabel`, a list of
  the peaks (`peakLabel`, `formatKw`), "{x} below the next step" when `kwToNextStep` is not null, and when
  `provisional` the badge "Provisional" with "A higher peak later this month can raise the step."; when not `set`:
  "Capacity charge not available for {month}." with the reasons (no grid tariff, no steps for the month, or no
  readings), links to `/admin/grid-tariffs` and `/admin/location-pricing` for an administrator (`useAuth().roles`),
  otherwise "Ask an administrator."; a Skeleton while loading; the `ApiError` message on error. Short footnote: "The
  grid company charges this per month from the average of the three highest hours on different days."
- [x] T010 [US1] `src/features/dashboard/DashboardPage.tsx`: render `<CapacityCard locationId={selected.id} />` after
  `SavingCard`; add an MSW handler for `/api/electricity-cost/capacity` to `DashboardPage.test.tsx` and any other test
  that renders the dashboard page.
- [x] T011 [P] [US1] Write `src/features/dashboard/CapacityCard.test.tsx`: the October figures (SC-001); current month
  shows Provisional and Next is disabled; Previous requests the earlier month (assert the `month` query parameter the
  MSW handler receives) and the card shows it; top step has no next-step text; fewer than three peaks; not set for an
  administrator (two links) and for a user ("Ask an administrator"); VAT exempt; loading; error message.

**Checkpoint**: The card works on its own against the deployed API.

---

## Phase 3: US2 - The texts say what is and is not included (P1)

**Goal**: No note contradicts the numbers.

**Independent test**: No screen contains "grid fixed fee" or "not taken into account" for the monthly limit.

- [x] T012 [P] [US2] `src/features/dashboard/NowCard.tsx`: the note becomes "Prices include VAT, the grid charge and
  taxes. The supplier's monthly fee is not included; the grid capacity charge is shown in its own card."
- [x] T013 [P] [US2] `src/features/dashboard/PriceBreakdownDialog.tsx`: the footnote's second sentence becomes "The
  supplier's monthly fee is not included, and the grid capacity charge is a monthly amount shown in its own card."
- [x] T014 [P] [US2] `src/features/dashboard/SavingCard.tsx`: the footnote becomes "Compared at full price including
  VAT. The Norgespris monthly limit (5 000 kWh, 1 000 for a holiday home) is applied. Monthly fees are not included."
- [x] T015 [US2] Update the assertions in `NowCard.test.tsx`, `PriceBreakdownDialog.test.tsx`, `SavingCard.test.tsx`
  (and `DashboardPage.test.tsx` if it checks the texts); add a test per file that "grid fixed fee" and "not taken into
  account" are absent.

---

## Phase 4: US3 - Hours above the Norgespris monthly limit (P2)

**Goal**: A price change caused by the limit is explained everywhere the hour's price is shown.

**Independent test**: With a current hour where the Norgespris side has 1,2 kWh within and 0,8 kWh above, the dialog
shows both sets of parts with their kWh and the right-now card says the limit is reached.

- [x] T016 [US3] `src/features/dashboard/NowCard.tsx`: on a Norgespris location, when `isAboveCap(data.actual)`, show
  "The Norgespris monthly limit is reached. Consumption above it is priced at spot for the rest of the month."
- [x] T017 [US3] `src/features/dashboard/PriceBreakdownDialog.tsx`: when the Norgespris side (`norgesPrisSide`) has a
  `cap` with kWh above, replace its column by "Norgespris, within limit ({kWh})" from `parts` and "Above limit, spot
  ({kWh})" from `cap.aboveCapParts` (only the second when `kwhWithinCap` is 0, with "The whole hour is above the
  monthly limit."), and add a line "Blended rate this hour: {formatKrPerKwh(ratePerKwh)}". Works for either column.
- [x] T018 [US3] `src/features/dashboard/RecentUsage.tsx`: on a Norgespris location, when any row in `currentRates`
  satisfies `isAboveCap(row.actual)`, show the muted line "Part of this period is above the Norgespris monthly limit
  and priced at spot."
- [x] T019 [P] [US3] Tests: extend `NowCard.test.tsx` (note shown on Norgespris above the limit; absent with `cap`
  null, absent `cap`, and on spot), `PriceBreakdownDialog.test.tsx` (split columns with kWh and values; whole hour
  above; split in the comparison column on a spot location; blended rate line), `RecentUsage.test.tsx` (note shown /
  absent).

---

## Phase 5: Admin foundation (blocks US4 and US5)

- [x] T020 Add to `src/features/admin/types.ts`: `electricityTaxExempt`, `vatExempt`, `isHolidayHome` on
  `LocationPricing` and `LocationPricingInput`; `'NorgesPrisCapHome' | 'NorgesPrisCapHolidayHome'` in `PriceRateKind`;
  `CapacityStep`, `CapacityStepTable` (`validFrom`, `status: NorgesPrisStatus`, `steps`) and `CapacityStepTableInput`
  (`validFrom`, `steps`, `confirmPastDate`).
- [x] T021 `src/features/admin/api.ts`: `getLocationPricing` defaults a missing flag to `false` (older API);
  `getCapacitySteps(tariffId)`, `addCapacitySteps(tariffId, input)`, `deleteCapacitySteps(tariffId, validFrom)` for the
  three calls in contracts/api-usage.md.
- [x] T022 `src/features/admin/hooks.ts`: `useCapacitySteps(tariffId)` (key `['admin', 'grid-tariffs', tariffId,
  'capacity-steps']`) and `useCapacityStepActions(tariffId)` (add, delete; on success invalidate that key and
  `['cost']`).

---

## Phase 6: US4 - Administrator enters the capacity steps (P2)

**Goal**: Capacity step tables can be listed, added and deleted per grid tariff.

**Independent test**: Add Elvia's table from 2026-07-01 typed including VAT; it is sent as 120, 200, 336, ... and
listed as In effect; it has no delete action.

- [x] T023 [US4] `src/features/admin/schema.ts`: `createCapacityStepsSchema(today)` — `validFrom` (START_DATE),
  `confirmPast`, `amountsIncludeVat`, `rows` 1 to 50 of `{ upperKw, amount }` where every row but the last has an
  `upperKw` above the previous row's (0 for the first), the last row has none, values 0 to 99 999 with at most 4
  decimals (reuse `parseAmount`/`amountField` with max 99 999); the past-date refine as for grid rates. Comment that the
  rules mirror `AddCapacityStepsValidator` in the API. Export `toCapacityStepTableInput(values)` that derives `lowerKw`,
  sets the last `upperKw` to null and divides amounts by 1,25 rounded to 4 decimals when `amountsIncludeVat`.
- [x] T024 [P] [US4] Write tests in `src/features/admin/pricingSchema.test.ts` (or a new `capacitySchema.test.ts`):
  valid Elvia table; upper not above lower; 51 rows; 5 decimals; past date without confirmation; the conversion (150 →
  120, 420 → 336) and the derived lower bounds.
- [x] T025 [US4] Create `src/features/admin/AddCapacityStepsDialog.tsx`: React Hook Form + `useFieldArray`; start date;
  rows with read-only "From kW" (derived), "To kW" input (last row shows "and above"), "Amount per month" input, remove
  row; "Add step" button (disabled at 50); checkbox "Amounts include VAT (divide by 1,25)" and, when ticked, a read-only
  "Excl. VAT" column; `PastDateConfirm` for a past date; on submit `addCapacitySteps`; a 400/409 shows the server
  message and keeps the input; closes on success.
- [x] T026 [P] [US4] Create `src/features/admin/DeleteCapacityStepsDialog.tsx` as `DeleteGridTariffRateDialog.tsx`,
  naming the start date; a 409 shows the server message.
- [x] T027 [US4] Create `src/features/admin/CapacityStepsSection.tsx` (prop `tariffId`): heading "Capacity steps" with
  an "Add capacity steps" button; one block per table (oldest first) with the start date (`formatRateDate`),
  `RateStatusBadge`, and the steps as rows "{stepLabel}" · "{amount} kr/month excl. VAT"; a delete button only for
  Upcoming tables; "No capacity steps yet." when empty; Skeleton and error message.
- [x] T028 [US4] `src/features/admin/GridTariffsPage.tsx`: render `CapacityStepsSection` in each tariff card under its
  rates table.
- [x] T029 [P] [US4] Write `src/features/admin/AddCapacityStepsDialog.test.tsx` (the request body MSW receives for the
  Elvia table typed incl. VAT; validation messages; server 409 message kept in the dialog) and extend
  `GridTariffsPage.test.tsx` (tables listed with status and steps; delete only for Upcoming; delete sends the start
  date; empty state).

---

## Phase 7: US5 - Exemptions, holiday home and monthly limits (P3)

**Goal**: The three flags per location and the two monthly limit kinds can be maintained.

**Independent test**: Tick Holiday home and VAT exempt, save; the PUT carries both and the list shows two badges. Add a
holiday-home limit of 1 000 kWh; it shows as "1 000 kWh/month".

- [x] T030 [US5] `src/features/admin/schema.ts`: add `electricityTaxExempt`, `vatExempt`, `isHolidayHome` (booleans) to
  `locationPricingSchema`; let `createPriceRateSchema(today, kind)` use a cap field for the two cap kinds (greater than
  0, at most 99 999, at most 4 decimals).
- [x] T031 [US5] `src/features/admin/EditLocationPricingDialog.tsx`: three checkboxes, prefilled, each with one line of
  explanation ("No electricity tax; the Enova fee still applies", "No VAT on any part of the price", "Lower Norgespris
  monthly limit (1 000 kWh)"); the PUT sends all three.
- [x] T032 [P] [US5] `src/features/admin/LocationPricingPage.tsx`: a badge per set flag ("Tax exempt", "VAT exempt",
  "Holiday home") in each location's row.
- [x] T033 [P] [US5] `src/features/admin/pricing.ts`: `kindLabel` for the two cap kinds ("Norgespris monthly limit
  (home)", "Norgespris monthly limit (holiday home)") and a `formatRateValue(kind, value)` used by
  `PriceRatesPage.tsx` ("5 000 kWh/month" for the cap kinds, existing formats otherwise); `PriceRatesPage.tsx` adds
  the two kinds to `KINDS`; `AddPriceRateDialog.tsx` labels the value field "kWh per month" for a cap kind.
- [x] T034 [P] [US5] Tests: `LocationPricingPage.test.tsx` (badges; dialog sends the flags; a response without flags
  shows none and still saves), `PriceRatesPage.test.tsx` and `AddPriceRateDialog.test.tsx` (the cap kinds listed and
  formatted; 0 and 100 000 rejected; the POST body), `pricing.test.ts`, `pricingSchema.test.ts`.

---

## Phase 8: Polish

- [x] T035 [P] `README.md`: update the dashboard and admin slice lines (capacity card, capacity steps, flags, limits).
- [x] T036 Run `npm run format`, `npm run build`, `npm run lint`, `npm test`; fix what fails.
- [ ] T037 Walk through `quickstart.md` against the deployed API (or a local API on `main`), and record the result here. (Open: needs an Admin sign-in. Automated checks done 2026-11-17: 496 tests pass (56 new), build passes, lint has only the 4 existing warnings in `components/ui`. Also changed beyond the tasks: the usage chart's cost note, which said "Monthly charges are not included", now names the supplier's monthly fee and the capacity charge.)

---

## Dependencies & Execution Order

- Phase 1 → US1, US2, US3 (dashboard). US2 needs nothing from Phase 1 and can start at once.
- Phase 5 → US4, US5 (admin). Admin phases do not depend on the dashboard phases.
- US1 is independent of US3; US3 touches `NowCard.tsx` and `PriceBreakdownDialog.tsx` like US2, so do US2 first.
- Polish last.

## Parallel Opportunities

- T002/T003 and T004/T005 in Phase 1.
- T007/T008 alongside T006; T011 once T009 exists.
- T012, T013, T014 (three files).
- The admin track (Phases 5–7) in parallel with the dashboard track (Phases 1–4).
- T026 alongside T025; T032, T033 alongside T031.

## Implementation Strategy

1. **MVP**: Phase 1 + US1 (the capacity card) + US2 (the wording) — the household sees the charge and no wrong text.
   Ship as soon as the step tables are in the API (entered through Scalar until US4 is done).
2. US4 so administrators can enter the steps in the UI; then US3; then US5.
3. Each phase ends with build, lint and tests green.
