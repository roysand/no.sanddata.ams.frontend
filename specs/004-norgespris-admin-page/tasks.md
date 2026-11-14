---

description: "Task list for the Admin Page for Norgespris Rates"
---

# Tasks: Admin Page for Norgespris Rates

**Input**: `specs/004-norgespris-admin-page/` (spec.md, plan.md). Backend contract: `no.sanddata.ams.api` `specs/007-norgespris-rates/contracts/endpoints.md`.

**Tests**: Required (constitution VII): Vitest + React Testing Library + MSW. `npm run build`, `npm run lint` and `npm test` must pass.

**Organization**: US1 see the rates, US2 add a rate, US3 correct a mistake (past-date confirmation and delete).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Foundation (blocks all stories)

- [x] T001 Add the types `NorgesPrisStatus` (`'Superseded' | 'InEffect' | 'Upcoming'`), `NorgesPrisRate` (`id`, `validFrom` as `yyyy-MM-dd`, `ratePerKwh`, `taxPerKwh`, `totalPerKwh`, `status`) and `NorgesPrisRateInput` (`validFrom`, `ratePerKwh`, `taxPerKwh`, `confirmPastDate`) to `src/features/admin/types.ts`.
- [x] T002 Add `getNorgesPrisRates`, `addNorgesPrisRate` and `deleteNorgesPrisRate` to `src/features/admin/api.ts` (`GET/POST /api/admin/norgespris`, `DELETE /api/admin/norgespris/{id}`) through `api.*`.
- [x] T003 Add `useNorgesPrisRates` (key `['admin', 'norgespris']`) and `useNorgesPrisActions` (add, remove; on success invalidate `['admin', 'norgespris']`, `['cost']` and `['prices']`) to `src/features/admin/hooks.ts`.
- [x] T004 [P] Create `src/features/admin/norgesPris.ts`: `formatRateDate('2027-01-01')` returning `01.01.2027`, `formatAmount(0.5)` returning the Norwegian format with 2 to 4 decimals and ` kr/kWh`, and `parseAmount(text)` accepting comma or dot and returning a number or `null` when it is not a plain decimal number.
- [x] T005 Add the page route `/admin/norgespris` (inside the `AdminRoute` children) to `src/app/routes.tsx` and the entry `{ to: '/admin/norgespris', label: 'Norgespris' }` to `adminItems` in `src/components/MenuPanel.tsx`.

## Phase 2: US1 - See the rates (P1)

- [x] T006 [US1] Create `src/features/admin/NorgesPrisPage.tsx`: Card with title "Norgespris" and an "Add rate" button; Table (Valid from, Rate, Tax, Total, Status); the `InEffect` row highlighted with a "In effect" badge, `Upcoming` rows with an "Upcoming" outline badge, `Superseded` rows with a muted "Superseded" label; "Loading…", the error message, and "No rates yet" states. Follow `AdminLocationsPage.tsx`.
- [x] T007 [P] [US1] Write `src/features/admin/NorgesPrisPage.test.tsx` (MSW): three rates are listed with the right labels and exactly one highlighted row; the total uses the Norwegian format; loading and error states; empty state.
- [x] T008 [P] [US1] Write `src/features/admin/norgesPris.test.ts`: date formatting, amount formatting (`0.4` gives `0,40`, `0.4567` keeps four decimals), amount parsing (comma, dot, spaces, garbage, negative).
- [x] T009 [P] [US1] Extend the menu and route-guard tests (`src/components/Header.test.tsx`, `src/components/AdminRoute.test.tsx`, or a `MenuPanel` test if none covers it): an Admin sees "Norgespris" under Administration; a regular user sees no Administration section.

## Phase 3: US2 - Add a rate (P1)

- [x] T010 [US2] Add `createNorgesPrisRateSchema(today: string)` to `src/features/admin/schema.ts` with a comment that the rules mirror the API validator: `validFrom` required `yyyy-MM-dd`; `ratePerKwh` and `taxPerKwh` required, comma or dot, `0..100`, at most four decimals; `confirmPast` required to be true when `validFrom <= today`. Export the form type.
- [x] T011 [US2] Create `src/features/admin/AddNorgesPrisRateDialog.tsx` (RHF + zodResolver, follow `CreateUserDialog.tsx`): date input, rate and tax inputs, `ApiError` message shown in the dialog (dialog stays open), buttons disabled while saving; submit sends numbers and `confirmPastDate: false`. `today` comes from `lastOsloDays(new Date(), 1)[0]`.
- [x] T012 [US2] Wire the dialog into `NorgesPrisPage.tsx` (open from "Add rate", close on success).
- [x] T013 [P] [US2] Write schema tests in `src/features/admin/schema.test.ts` (or extend it): valid values; empty; negative; 100.0001; five decimals; comma accepted; past date without confirmation fails; past date with confirmation passes; future date needs none.
- [x] T014 [P] [US2] Write `src/features/admin/AddNorgesPrisRateDialog.test.tsx` (MSW): a future date posts `{ validFrom, ratePerKwh, taxPerKwh, confirmPastDate: false }` and the dialog closes; a comma amount is sent as a number; a `409` message is shown and the dialog stays open; field errors block the request.

## Phase 4: US3 - Correct a mistake (P2)

- [x] T015 [US3] In `AddNorgesPrisRateDialog.tsx`, when the chosen date is today or earlier show the warning "Costs shown for past hours will be recalculated." with a confirmation checkbox; saving is blocked until it is ticked; the request then carries `confirmPastDate: true`. A future date shows neither.
- [x] T016 [US3] Create `src/features/admin/DeleteNorgesPrisRateDialog.tsx` (follow `DeleteUserDialog.tsx`) and a delete button (`aria-label` "Delete rate from dd.mm.yyyy") only on `Upcoming` rows in `NorgesPrisPage.tsx`.
- [x] T017 [P] [US3] Extend `AddNorgesPrisRateDialog.test.tsx`: yesterday and today show the warning and block saving until the box is ticked, then send `confirmPastDate: true`; tomorrow shows no warning; a `409` for a not-newest date is shown.
- [x] T018 [P] [US3] Extend `NorgesPrisPage.test.tsx`: only the upcoming row has a delete button; confirming sends `DELETE /api/admin/norgespris/{id}` and the row disappears after the refresh; a `409` or `404` message is shown and the dialog stays open; adding or deleting refetches the list.

## Phase 5: Polish

- [x] T019 Update `README.md` (admin slice description) to mention the Norgespris page.
- [x] T020 Run `npm run format`, `npm run lint`, `npm run build` and `npm test`; fix what they report.
- [ ] T021 Manual check against a running API with the backend branch (PR #21): add an upcoming rate, see it, delete it, add a past-dated newest rate with the confirmation, and check the dashboard shows new figures afterwards. (Not done: needs the backend from PR #21 running and a browser.)

## Dependencies & order

Phase 1 first. T001 to T003 before everything; T004 and T005 are independent. US1 (T006) needs Phase 1; US2 needs T006 for the button; US3 extends the dialog and page from US2. Polish last. T021 needs the backend deployed or run locally.

## Implementation strategy

MVP is Phase 1 plus US1 and US2 (the 1 January change). US3 follows in the same PR since the past-date confirmation is part of what the API requires.
