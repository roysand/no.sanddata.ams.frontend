---

description: "Task list for the Admin Pages for the Electricity Price Data"
---

# Tasks: Admin Pages for the Electricity Price Data

**Input**: `specs/005-pricing-admin-pages/` (spec.md, plan.md). Backend contract: `no.sanddata.ams.api` `specs/008-full-electricity-price/contracts/endpoints.md`.

**Tests**: Required (constitution VII): Vitest + React Testing Library + MSW. `npm run build`, `npm run lint` and `npm test` must pass.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundation (blocks all stories)

- [x] T001 Add the types to `src/features/admin/types.ts`: `LocationPricing` (`locationId`, `name`, `gridTariffId`, `gridTariffName`, `supplierMarkupPerKwh`, `isComplete`), `GridTariffRate` (`id`, `validFrom`, `dayRatePerKwh`, `nightRatePerKwh`, `status`), `GridTariff` (`id`, `name`, `rates`), `PriceRateKind` (`'ElectricityTax' | 'EnovaFee' | 'Vat'`), `PriceRate` (`id`, `kind`, `validFrom`, `value`, `status`) and the input types, reusing `NorgesPrisStatus` for the status.
- [x] T002 Add the calls to `src/features/admin/api.ts`: `getLocationPricing`, `setLocationPricing`, `getGridTariffs`, `createGridTariff`, `addGridTariffRate`, `deleteGridTariffRate`, `getPriceRates`, `addPriceRate`, `deletePriceRate`, against the paths in the contract, through `api.*`.
- [x] T003 Add the hooks to `src/features/admin/hooks.ts`: queries `useLocationPricing`, `useGridTariffs`, `usePriceRates` (keys `['admin', 'location-pricing']`, `['admin', 'grid-tariffs']`, `['admin', 'price-rates']`) and mutation hooks that invalidate their key and `['cost']` and `['prices']`; a change to a tariff rate also invalidates `['admin', 'location-pricing']`.
- [x] T004 [P] Create `src/features/admin/pricing.ts`: `percentToFraction('25,5')` returning `0.255` computed from the digits (no floating point noise) or `null` for text that is not a percentage with at most two decimals, `formatPercent(0.255)` returning `25,5 %`, `kindLabel(kind)` ("Electricity tax", "Enova fee", "VAT"), and `formatKr(value)` for rates with up to four decimals (reuse `formatAmount` from `norgesPris.ts`).
- [x] T005 Change `src/features/admin/schema.ts`: export the amount helper (rename `norgesPrisAmount` to an exported `amountField(label, max = 100)` and keep the Norgespris schema working), then add `createLocationPricingSchema` (markup), `createGridTariffSchema` (name, required, at most 100), `createGridTariffRateSchema(today)` (start date, day rate, night rate, `confirmPast` required when the date is today or earlier), `createPriceRateSchema(today, kind)` (value as a fee up to 100 with 4 decimals, or for VAT a percentage 0 to 100 with at most 2 decimals; same `confirmPast` rule). Comment that the rules mirror the API.
- [x] T006 [P] Create `src/features/admin/PastDateConfirm.tsx`: the alert "This start date is today or earlier. Costs shown for past hours will be recalculated." with the checkbox "I understand that costs shown for past hours will be recalculated" and the error text, as a controlled component for React Hook Form (`control`, name `confirmPast`, `show` flag). Refactor `AddNorgesPrisRateDialog.tsx` to use it; its tests must pass unchanged.
- [x] T007 Add the three routes (`/admin/location-pricing`, `/admin/grid-tariffs`, `/admin/price-rates`) to the `AdminRoute` children in `src/app/routes.tsx` and the entries "Location pricing", "Grid tariffs" and "Taxes and VAT" to `adminItems` in `src/components/MenuPanel.tsx`; update the menu assertion in `src/components/Header.test.tsx`.
- [x] T008 [P] Write `src/features/admin/pricing.test.ts` (percent conversion including `25`, `25,5`, `25.50`, `0`, `100`, rejects `100,01`, `-1`, `abc`, three decimals; `formatPercent`; labels) and `src/features/admin/pricingSchema.test.ts` (each schema: valid, empty, negative, over 100, too many decimals, comma, the past-date confirmation, VAT percent limits).

**Checkpoint**: types, calls, hooks, schemas and routes exist; pages come next.

---

## Phase 2: User Story 1 - Location pricing (Priority: P1) 🎯 MVP

**Goal**: the Admin sets the grid tariff and markup of each location and sees which are incomplete.

**Independent Test**: one location without a tariff shows "Not set" and "Incomplete"; choose a tariff and a markup, save, and it becomes complete.

- [x] T009 [US1] Create `src/features/admin/LocationPricingPage.tsx`: Card "Location pricing" with a Table (Location, Grid tariff or a "Not set" outline badge, Markup, a "Complete" or "Incomplete" badge, an Edit button with `aria-label` "Edit pricing for {name}"), "Loading…", the error message and "No locations yet" states. Follow `NorgesPrisPage.tsx`.
- [x] T010 [US1] Create `src/features/admin/EditLocationPricingDialog.tsx` (RHF + zod, `Select` for the tariff with a "None" item, markup input with `inputMode="decimal"`, the note that changing it recalculates past hours, the hint "No tariffs yet" with a link to `/admin/grid-tariffs` when there are none, `ApiError` message shown with the dialog kept open); sends `{ gridTariffId: string | null, supplierMarkupPerKwh: number }`.
- [x] T011 [P] [US1] Write `src/features/admin/LocationPricingPage.test.tsx` (MSW): rows with and without a tariff and their marks; edit sends the tariff id and the markup as a number and the row updates after the refetch; "None" sends null; invalid markup shows messages and sends nothing; a 404 message is shown and the dialog stays open; no tariffs shows the hint; empty and error states; the cost queries are invalidated (a mounted `['cost']` query refetches).

---

## Phase 3: User Story 2 - Grid tariffs (Priority: P1)

**Goal**: the Admin creates tariffs and adds, sees and deletes their rates.

**Independent Test**: create a tariff, add a rate starting today with the confirmation, see "In effect"; add a future rate, see "Upcoming" and delete it.

- [x] T012 [US2] Create `src/features/admin/GridTariffsPage.tsx`: a "New tariff" button and a Card per tariff with its Table (Valid from, Day rate, Night and weekend rate, Status badge, delete only on Upcoming with `aria-label` "Delete rate from dd.mm.yyyy for {tariff}") and an "Add rate" button per tariff; empty ("No tariffs yet"), loading and error states.
- [x] T013 [US2] Create `src/features/admin/CreateGridTariffDialog.tsx` (name field, server message shown and dialog kept open on `409`).
- [x] T014 [US2] Create `src/features/admin/AddGridTariffRateDialog.tsx` (start date, day rate, night and weekend rate in kr/kWh, the text that rates are entered EXCLUDING taxes and VAT, `PastDateConfirm`, sends `confirmPastDate` only when the date is today or earlier and confirmed) and `DeleteGridTariffRateDialog.tsx` (follow `DeleteNorgesPrisRateDialog.tsx`).
- [x] T015 [P] [US2] Write `src/features/admin/GridTariffsPage.test.tsx` and `AddGridTariffRateDialog.test.tsx` (MSW): tariffs with rates and statuses and one highlighted per tariff; create tariff and the taken-name message; add a future rate posts the right body with `confirmPastDate: false`; today and yesterday show the warning and block until ticked, then send `true`; tomorrow shows none; a confirmation ticked for a past date is not sent after the date moves to the future; the excluding-taxes text is shown; delete only on upcoming rows, success and `409`; field errors send nothing.

---

## Phase 4: User Story 3 - Taxes and VAT (Priority: P2)

**Goal**: the Admin adds and deletes electricity tax, Enova fee and VAT rows.

**Independent Test**: add an electricity tax row for next January and see it Upcoming; add a VAT row `25` and see it shown as `25 %`.

- [x] T016 [US3] Create `src/features/admin/PriceRatesPage.tsx` (three sections from `kindLabel`, each with its Table (Valid from, Value, Status badge, delete only on Upcoming) and an "Add" button for that kind; VAT values shown with `formatPercent`, the fees with `formatKr`; loading, error and empty states).
- [x] T017 [US3] Create `src/features/admin/AddPriceRateDialog.tsx` (kind given by the section; the value field labelled "Value (kr/kWh)" or "VAT (%)"; `PastDateConfirm`; sends `{ kind, validFrom, value, confirmPastDate }` with VAT as `percentToFraction`) and `DeletePriceRateDialog.tsx`.
- [x] T018 [P] [US3] Write `src/features/admin/PriceRatesPage.test.tsx` and `AddPriceRateDialog.test.tsx` (MSW): the three sections and statuses; adding a fee sends the kind and value as a number; typing `25` for VAT sends `0.25` and a row of `0.25` is shown as `25 %`; the past-date warning and confirmation; delete on upcoming rows only; server messages shown with the dialog kept open.

---

## Phase 5: User Story 4 - Tidy the Norgespris page (Priority: P3)

- [x] T019 [US4] In `NorgesPrisPage.tsx`, `AddNorgesPrisRateDialog.tsx`, `schema.ts`, `types.ts` and `api.ts`: remove the Tax and Total columns and the Tax field; the request sends `taxPerKwh: 0`; keep `NorgesPrisRate.taxPerKwh` and `totalPerKwh` in the type as the API still returns them (not shown).
- [x] T020 [US4] Update the Norgespris tests (`NorgesPrisPage.test.tsx`, `AddNorgesPrisRateDialog.test.tsx`, `norgesPrisSchema.test.ts`): the table has no Tax or Total column, the dialog has no Tax field, the body carries `taxPerKwh: 0`, and the past-date behaviour is unchanged.

---

## Phase 6: Polish

- [x] T021 Update `README.md` (the admin slice line) for the three new pages.
- [x] T022 Run `npm run format`, `npm run lint`, `npm run build` and `npm test`; fix what they report. Note that a few long typing tests in other files time out intermittently on a busy machine (also on `main`); none of the new tests may fail. (Done: build and lint pass; 401 tests, and only the three old files with long typing tests fail intermittently, as on main.)
- [ ] T023 Manual check against a running backend with PR #23 (a scratch database copy as in spec 008): create a tariff and a rate, set a location, add a tax and a VAT row, and see the dashboard figures change. (Not done: needs a browser and the backend from PR #23 running. The pages are covered by MSW tests built from the contract, and the API behaviour behind them was checked live in the API repo.)
- [ ] T024 Commit, push and open the pull request against `main`; mention that it needs the API PR #23 deployed first.

---

## Dependencies & order

Phase 1 first (T001 to T003 before T005 to T007; T004, T006 and T008 are independent). Then US1, US2, US3 in any order (they only share Phase 1); US4 after T006 (it uses `PastDateConfirm`). Polish last. T023 needs the backend running.

## Implementation strategy

MVP is Phase 1 plus US1 and US2 (every location can get its tariff and markup). US3 follows, then the small US4 tidy-up, all in one PR.
