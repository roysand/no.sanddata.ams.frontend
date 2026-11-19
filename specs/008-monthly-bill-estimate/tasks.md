---
description: 'Task list for Show the Bill for the Month, Estimated and Final'
---

# Tasks: Show the Bill for the Month, Estimated and Final

**Input**: Design documents from `/specs/008-monthly-bill-estimate/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md),
[contracts/api-usage.md](contracts/api-usage.md), [quickstart.md](quickstart.md)

**Tests**: Included. The constitution (Principle VII) requires tests for new branching logic (formatting, API
normalization, Zod schemas) and for components that use queries (MSW, fresh `QueryClient` per test via
`src/test/render.tsx`). Tests assert what a user sees (roles, labels, text).

**Number format in tests**: `nb-NO` `Intl.NumberFormat` writes a minus as U+2212 (`−`) and puts a no-break space
before `kr` and as thousands separator. Assert with the same formatter or a normalizing matcher, not a typed ASCII
`-` or space.

**Organization**: One phase per user story, in spec priority order. US3 (admin fee) does not depend on the
foundation and may be built first (plan, "Delivery order").

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US5)

## Path Conventions

Single project: `src/features/<slice>/…`, shared test setup in `src/test/`.

---

## Phase 1: Setup

**Purpose**: Branch and a clean baseline.

- [x] T001 Create branch `008-monthly-bill-estimate` from `main` and confirm `npm test`, `npm run lint` and `npm run build` pass before any change (repository root)

---

## Phase 2: Foundational (Blocking Prerequisites for US1, US2, US4)

**Purpose**: Bill types, the API call, the hook, the pure helpers and the shared view. US3 and US5 do not need this
phase.

- [x] T002 [P] Add the bill types to `src/features/dashboard/types.ts` exactly as in data-model.md: `BillStatus = 'Estimate' | 'Final'`, `BillLineCode` (the nine codes), `BillAmounts { soFar; projected; amount; amountExclVat; vat }`, `BillLine` (`code: BillLineCode | string`, `unit: 'kWh' | 'Month'`, `quantity`, `unitPrice: number | null`, `vatRate`, `set`, `complete`, and `soFar`/`projected`/`amount`/`amountExclVat`/`vat` all `number | null`), `BillPart extends BillAmounts { name: 'Strom' | 'Nettleie'; lines: BillLine[] }`, `BillProjection { fromUtc; hours; kwh; basedOnHours; basedOnDays; assumedSpotPricePerKwh: number | null }`, `MonthlyBill` (`month` yyyy-MM, `status`, `pricingModel: PricingModel`, `isComplete`, `hours { inMonth; passed; withReadings; priced }`, `projection: BillProjection | null`, `capacity { provisional; averageKw: number | null; step: { lowerKw; upperKw: number | null } | null }`, `strom`, `nettleie`, `total: BillAmounts`), with doc comments stating "a line with `set: false` has null amounts and is not in the sums" and "`Final` ⇒ `projection` null and every `projected` 0"
- [x] T003 [P] Add `formatKwh2` (kWh with exactly two decimals, `nb-NO`, e.g. `240,31 kWh`, `1,00 kWh`) next to `formatKwh` in `src/features/dashboard/format.ts`, with cases in `src/features/dashboard/format.test.ts`
- [x] T004 Add `getMonthlyBill(locationId, month)` to `src/features/dashboard/api.ts`: `api.get<MonthlyBill>('/api/electricity-cost/bill?' + query({ locationId, month }))`; `month` is always sent (contracts/api-usage.md) (depends on T002)
- [x] T005 Add `useMonthlyBill(locationId: string | undefined, month: string, isCurrent: boolean)` to `src/features/dashboard/hooks.ts`: key `['cost', 'bill', locationId, month]`, `enabled: !!locationId`, `refetchInterval: isCurrent ? 15 * ONE_MINUTE : false`, modelled on `useCapacityCharge` (research R2) (depends on T004)
- [x] T006 [P] Write `src/features/dashboard/bill.test.ts` first (it must fail until T007): `lineName`/`invoiceName` for all nine codes and an unknown code (returns the code); `formatQuantity` → `240,31 kWh` and `1 month`; `formatUnitPrice` → `155,52 øre/kWh` for unitPrice 1.5552, `−105,52 øre/kWh` for −1.0552, `34,00 kr/month` for a Month line, `null` for `set: false`; `formatVatRate(0.25)` → `25 %`, `0` → `0 %`; `basisText` for `basedOnDays` 7.0, 9.0, 2.4 (→ "2 days", uncertain), 0 and `null` projection; `isVatExemptBill` true when every set line has `vatRate` 0 and a non-credit line exists, false for a Norgespris bill whose only 0 % line is the credit; `hasReadings`
- [x] T007 Create `src/features/dashboard/bill.ts` with the helpers in data-model.md: `lineName`, `invoiceName` (table in research R5), `formatQuantity` (uses `formatKwh2`), `formatUnitPrice` (kWh lines: `unitPrice × 100` with two decimals and ` øre/kWh`; Month lines: `formatNok`-style `34,00 kr/month`), `formatVatRate` (`Math.round(rate × 100)` + ` %`), `basisText(projection)` (≥ 7 whole days: "Estimated from the last 7 days of use"; 1–6: "Based on N day(s) of use, so the estimate is uncertain"; 0 or no hours: "No use yet to estimate from; the expected amount is what is known plus the fixed amounts"), `isVatExemptBill` (research R9), `hasReadings` (`hours.withReadings > 0`); `basedOnDays` rounded to whole days (FR-003) (depends on T003, T006)
- [x] T008 [P] Add test bills to `src/test/bills.ts`: `july2026Bill` (status `Final`, `NorgesPris`, complete, every line and total of spec "Reference data for the tests": Strøm 417,33 = fee 34,00 / SpotEnergy 240,31 kWh × 1.5552 = 373,74 / markup 240,31 kWh × 0.0399 = 9,59; Nettleie 256,22 = day 95,58 kWh 34,64 / night 144,73 kWh 30,74 / capacity 420,00 / tax 240,31 kWh 21,41 / Enova 240,31 kWh 3,01 / credit 240,31 kWh × −1.0552 = −253,58 at 0 %; total 673,55 = 488,12 excl. VAT + 185,43 VAT; projected 0, projection null, capacity 5–10 kW not provisional), `november2026Estimate` (status `Estimate`, total 673,54 of which soFar 412,30 and projected 261,24, `projection.basedOnDays` 7, capacity 5–10 kW provisional), a builder `withLine(bill, code, patch)` for not-set and not-complete variants, and `emptyBill(month)` with `hours.withReadings` 0 (depends on T002)
- [x] T009 Create the shared `src/features/dashboard/BillView.tsx`: props `bill: MonthlyBill`, `layout: 'card' | 'invoice'`; renders the Strøm part and the Nettleie part (headings "Strøm (supplier)" and "Nettleie (grid)") with their subtotal and lines in the order the server sends them, then the total. Each line shows `lineName` (with `invoiceName` as small muted text), and for `layout: 'invoice'` also quantity, unit price, VAT rate and amount, stacking quantity and unit price under the name on narrow screens; for `layout: 'card'` name and amount, plus "so far X · rest of month Y" when the line's `projected` ≠ 0. A line with `set: false` shows "Not set" in place of price and amount, never `0,00 kr` (FR-014). Parts and total show amount excl. VAT and VAT beside the amount for `layout: 'invoice'` (FR-011); drop the words "including VAT" when `isVatExemptBill` (FR-023, edge case). Negative amounts keep their minus sign (FR-013). Amounts come only from the server's fields, never summed in the browser (research R3) (depends on T007)

**Checkpoint**: Types, call, hook, helpers and the shared view exist and `bill.test.ts` passes.

---

## Phase 3: User Story 1 - See what this month's bill will probably be (Priority: P1) 🎯 MVP

**Goal**: The dashboard shows the expected total of the current month, split into so far and rest of month, marked as
an estimate, with the basis and the provisional capacity step; Strøm and Nettleie expand.

**Independent Test**: With `november2026Estimate` served by MSW, open the dashboard and see 673,54 kr, 412,30 kr so
far, 261,24 kr for the rest of the month, "Estimate", "last 7 days", "5–10 kW" and "provisional"; open Strøm and
Nettleie and see their lines.

### Tests for User Story 1

- [x] T010 [P] [US1] Write `src/features/dashboard/ExpectedBillCard.test.tsx` (MSW handler for `GET /api/electricity-cost/bill`, asserting the request's `month` is the current Oslo month from `osloMonth(new Date())`): figures and words of the independent test; Strøm and Nettleie closed at first and showing their lines after a click on the summary; basis text for 2 days ("uncertain") and 0 days; the one-sentence Norgespris explanation present for `NorgesPris` and absent for `Spot`; a skeleton while loading; the server message on a 500

### Implementation for User Story 1

- [x] T011 [US1] Create `src/features/dashboard/ExpectedBillCard.tsx`: `{ locationId }`; `month = osloMonth(new Date())`; `useMonthlyBill(locationId, month, true)`; card title "Expected bill" with `formatMonth(month)`; the total in large type with a badge "Estimate" (FR-002); "So far" and "Rest of the month" amounts from `total.soFar` / `total.projected`; `basisText(bill.projection)` (FR-003); the capacity step via `stepLabel` from `capacity.ts` and the word "provisional" with "a higher peak later in the month can raise it" (FR-004), or nothing when `capacity.step` is null; for `NorgesPris` the sentence "The supplier bills the spot price and the grid company credits the difference down to the Norgespris rate, so Strøm is higher and Nettleie lower than what you pay net." (US1 scenario 5); Strøm and Nettleie each in a native `<details>` closed by default (research R6) rendering the part through `BillView` with `layout: 'card'`; `Skeleton` while loading, `error.message` on failure (FR-024) (depends on T005, T009, T010)
- [x] T012 [US1] Place `<ExpectedBillCard locationId={selected.id} />` directly after `<CapacityCard />` in `src/features/dashboard/DashboardPage.tsx` (FR-001), and add a handler for the bill endpoint in `src/features/dashboard/DashboardPage.test.tsx` if that test renders the whole page with strict MSW handlers (depends on T011)

**Checkpoint**: US1 works on its own; `ExpectedBillCard.test.tsx` passes.

---

## Phase 4: User Story 2 - Check a finished month against the invoice (Priority: P1)

**Goal**: History has a Bill card that opens on last month as final, shows every invoice line with quantity, unit
price, VAT and amount, and steps between months.

**Independent Test**: With `july2026Bill` served for `month=2026-07`, open History, step back to July 2026 and see
every line of the reference invoice, 417,33 kr, 256,22 kr and 673,55 kr, and "Final".

### Tests for User Story 2

- [x] T013 [P] [US2] Write `src/features/dashboard/BillCard.test.tsx` with the system time fixed (`src/test/dates.ts` pattern) so the previous month is a known month: opens on the previous Oslo month; shows "Final" and no so-far/rest split; every July line with its quantity (`240,31 kWh`, `95,58 kWh`, `144,73 kWh`, `1 month`), unit price (`155,52 øre/kWh`, `3,99 øre/kWh`, `36,24 øre/kWh`, `21,24 øre/kWh`, `34,00 kr/month`, `420,00 kr/month`, `8,91 øre/kWh`, `1,25 øre/kWh`, `−105,52 øre/kWh`), VAT (`25 %`, credit `0 %`) and amount (credit `−253,58 kr`); subtotals `417,33` and `256,22`, total `673,55`, with `488,12` excl. VAT and `185,43` VAT; no credit line for a `Spot` bill; next steps to the current month and shows "Estimate" with so far and rest of month, and next is disabled there; previous disabled and "No readings in <month>" for `emptyBill`; the server message for a 400 `Bill.MonthNotStarted`

### Implementation for User Story 2

- [x] T014 [US2] Create `src/features/dashboard/BillCard.tsx`: `{ locationId }`; month state starting at `addMonths(osloMonth(new Date()), -1)` (FR-007); previous/next buttons with `aria-label` "Previous month"/"Next month" and `formatMonth(month)` between them, as in `CapacityCard.tsx`; next disabled when `month >= osloMonth(new Date())`; previous disabled while loading or when `!hasReadings(bill)` (FR-008, research R7); `useMonthlyBill(locationId, month, isCurrent)`; badge "Final" or "Estimate"; "No readings in <month>." when `!hasReadings(bill)`, otherwise `BillView` with `layout: 'invoice'` and, for an estimate, the so-far and rest-of-month amounts of each line and the total (FR-012); `Skeleton` while loading, `error.message` on failure (FR-024, US2 scenario 10) (depends on T005, T009, T013)
- [x] T015 [US2] Place `<BillCard locationId={selected.id} />` between `UsageChart` and `ExportCard` in `src/features/dashboard/HistoryPage.tsx` and update the component's doc comment (depends on T014)

**Checkpoint**: US1 and US2 both work; the July reference bill renders as the invoice.

---

## Phase 5: User Story 3 - An administrator sets the supplier monthly fee (Priority: P2)

**Goal**: The location pricing dialog has the fee field, the list shows the fee, and the markup help text is right.

**Independent Test**: As admin, enter `27,20` for a location and save: the PUT body has `supplierMonthlyFee: 27.2`,
the list shows the fee; a location without a fee shows "Not set" and "Incomplete".

### Tests for User Story 3

- [x] T016 [P] [US3] Extend `src/features/admin/pricingSchema.test.ts`: `supplierMonthlyFee` accepts `''`, `'0'`, `'27,20'`, `'27.2'`, `'10000'`; refuses `'-1'`, `'10000,01'`, `'27,20005'` (more than four decimals, as the API) and `'abc'` with a user-facing message
- [x] T017 [P] [US3] Extend `src/features/admin/LocationPricingPage.test.tsx`: the list has a "Monthly fee" column showing the fee as kr excluding VAT, and "Not set" for `supplierMonthlyFee: null`, and a row without the field (older API) reads as "Not set"; the explanation says a location needs a grid tariff and a monthly fee; in the dialog the field is filled with the current fee or empty; saving `27,20` sends `supplierMonthlyFee: 27.2`; saving with the field empty omits `supplierMonthlyFee` from the body; a 400 with code `Validation.InvalidMonthlyFee` shows the server message under the fee field; the markup help text says "Added to every kWh, also under Norgespris"

### Implementation for User Story 3

- [x] T018 [P] [US3] In `src/features/admin/types.ts`, add `supplierMonthlyFee: number | null` to `LocationPricing` ("NOK per month excluding VAT; null = not set") and optional `supplierMonthlyFee?: number` to `LocationPricingInput` ("omitted keeps the stored value"); change the `supplierMarkupPerKwh` comment to "added to every kWh, also under Norgespris"
- [x] T019 [US3] In `src/features/admin/api.ts` `getLocationPricing`, map a missing `supplierMonthlyFee` to `null` (older API), with a comment, alongside the existing flag normalization (depends on T018)
- [x] T020 [US3] In `src/features/admin/schema.ts`, add an optional amount field (empty string allowed; otherwise `parseAmount` value from 0 to 10 000 with at most four decimals, as the API validator) and use it as `supplierMonthlyFee` in `locationPricingSchema`, commented "mirrors the API's Validation.InvalidMonthlyFee (0–10,000)" (Principle IV, FR-017) (depends on T016)
- [x] T021 [US3] In `src/features/admin/EditLocationPricingDialog.tsx`: add the field "Supplier monthly fee (kr per month excluding VAT)" below the markup, default `location.supplierMonthlyFee === null ? '' : asInput(location.supplierMonthlyFee)`; help text "Enter 0 for a supplier without a monthly fee. Leaving it empty keeps the current value." (FR-019); send `supplierMonthlyFee: amountOf(value)` only when the field is not empty; on `ApiError` with `code === 'Validation.InvalidMonthlyFee'` show the message under the field (FR-018), otherwise keep the general error; change the markup help text to "Added to every kWh, also under Norgespris." (FR-021) (depends on T018, T020)
- [x] T022 [US3] In `src/features/admin/LocationPricingPage.tsx`: add a "Monthly fee" column after "Supplier markup" showing `formatAmount(fee)` kr or a "Not set" outline badge; change the explanation to say the grid tariff, the supplier markup and the supplier monthly fee of each location, and that a location is incomplete until it has both a grid tariff and a monthly fee (FR-020) (depends on T019, T017)

**Checkpoint**: US3 works on its own; schema and page tests pass.

---

## Phase 6: User Story 4 - A bill with missing settings says so (Priority: P2)

**Goal**: Both bill views mark an incomplete bill and say why, with an admin link.

**Independent Test**: With `july2026Bill` changed to fee `set: false` and `isComplete: false`, the fee line says "Not
set", the total says "Incomplete" with "Monthly fee not set", and an admin sees a link to Location pricing.

### Tests for User Story 4

- [x] T023 [P] [US4] Add to `src/features/dashboard/bill.test.ts`: `incompleteReasons` returns "Monthly fee not set" for a not-set fee line, "Energy at spot price may be too low: some hours have no price" for `set: true, complete: false`, "3 hours with readings could not be priced" for `hours.priced` 741 and `withReadings` 744, several reasons together, and `[]` for a complete bill
- [x] T024 [P] [US4] Add to `src/features/dashboard/BillCard.test.tsx` and `src/features/dashboard/ExpectedBillCard.test.tsx`: a not-set fee line shows "Not set" and no `0,00 kr` on that line (SC-003); "Incomplete" next to the total with the reasons; an Admin (signed-in roles from `src/test/render.tsx`) sees a link to `/admin/location-pricing`, a regular user sees "Ask an administrator"; a not-complete line is marked "may be too low"

### Implementation for User Story 4

- [x] T025 [US4] Add `incompleteReasons(bill: MonthlyBill): string[]` to `src/features/dashboard/bill.ts` (research R8) (depends on T023)
- [x] T026 [US4] In `src/features/dashboard/BillView.tsx`, when `!bill.isComplete`: an "Incomplete" badge next to the total and a note "Without the lines that are not set." with the list from `incompleteReasons`; for Admin (`useAuth().roles.includes('Admin')`, as in `CapacityCard`'s `NotSet`) a `Link` to `/admin/location-pricing` "Location pricing", otherwise "Ask an administrator." (FR-015, FR-016); mark a line with `set: true, complete: false` with "may be too low" (depends on T025, T024)

**Checkpoint**: US1, US2 and US4 together; incomplete bills are never mistaken for full ones.

---

## Phase 7: User Story 5 - The other cost texts point to the bill (Priority: P3)

**Goal**: The "not included" notes add that the expected bill includes the fee and the capacity charge.

**Independent Test**: The Now card and the usage chart notes mention the expected bill.

- [x] T027 [P] [US5] In `src/features/dashboard/NowCard.tsx` (note near line 145), append "The expected bill for the month includes it." and update `src/features/dashboard/NowCard.test.tsx` if it asserts the note
- [x] T028 [P] [US5] In `src/features/dashboard/UsageChart.tsx` (note near line 259), append "The expected bill for the month includes them." and update `src/features/dashboard/UsageChart.test.tsx` if it asserts the note
- [x] T029 [P] [US5] In `src/features/dashboard/PriceBreakdownDialog.tsx` (note near line 169), append "The expected bill for the month includes both." and update `src/features/dashboard/PriceBreakdownDialog.test.tsx` if it asserts the note
- [x] T030 [P] [US5] In `src/features/dashboard/ExportCard.tsx` (note near line 123), append "The bill for each month, further up this page, includes them." and update `src/features/dashboard/ExportCard.test.tsx` if it asserts the note

**Checkpoint**: All stories done.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T031 Run `npm run format`, then `npm test`, `npm run lint` and `npm run build`; all must pass (Principle VI, VII) (repository root)
- [ ] T032 Check the layout at phone width (375 px) with `npm run dev`: the Expected bill card and the invoice table on History do not scroll sideways, long line names wrap, negative amounts align (quickstart.md steps 2 and 3)
- [ ] T033 Run quickstart.md step 4 against the API as Admin (set a fee, see the location become complete and the bill gain a fee line), or note in the PR that it waits for the production check in the API's `specs/_backlog/july-2026-bill-check.md`
- [X] T034 Mark the tasks done in `specs/008-monthly-bill-estimate/tasks.md` and record the checks in `specs/008-monthly-bill-estimate/checklists/requirements.md`

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001)**: first.
- **Foundational (T002–T009)**: blocks US1, US2 and US4.
- **US1 (T010–T012)** and **US2 (T013–T015)**: after Foundational; independent of each other.
- **US3 (T016–T022)**: after Setup only; can run before or alongside everything else.
- **US4 (T023–T026)**: after Foundational; its tests in T024 extend the US1 and US2 test files, so run after T010 and
  T013 exist.
- **US5 (T027–T030)**: after Setup only.
- **Polish (T031–T034)**: last.

### Within the foundation

T002 → T004 → T005; T003 + T006 → T007 → T009; T002 → T008.

### Parallel opportunities

- T002, T003, T006 together; then T008 alongside T004/T005/T007.
- T010 (US1 test) and T013 (US2 test) together, then T011 and T014 in parallel.
- All of US3 can be done by a second person in parallel; within it T016, T017, T018 together.
- T027–T030 all in parallel.

## Parallel Example: User Story 3

```text
Task: "T016 [US3] Extend pricingSchema.test.ts with the monthly fee rules"
Task: "T017 [US3] Extend LocationPricingPage.test.tsx with the fee column and dialog"
Task: "T018 [US3] Add supplierMonthlyFee to admin/types.ts"
```

## Parallel Example: User Stories 1 and 2

```text
Task: "T010 [US1] Write ExpectedBillCard.test.tsx"
Task: "T013 [US2] Write BillCard.test.tsx"
```

## Implementation Strategy

### MVP

Setup + Foundational + US1: the dashboard shows the expected bill. Because every location is incomplete until the
monthly fee is set, ship US3 and US4 with it or right after, so the first users see "Not set" explained rather than a
silently low total.

### Incremental delivery (as in plan.md)

1. PR 1: US3 (admin fee) — lets the production July check start.
2. PR 2: Foundational + US2 + US1 + US4 — the July reference bill proves the layout; the card reuses it.
3. PR 3: US5 texts (or fold into PR 2).
