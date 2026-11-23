# Tasks: What the Car Charging Costs, on the Bill

**Input**: Design documents from `/specs/016-car-charging-cost/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md) (R1–R3),
[data-model.md](data-model.md), [contracts/ui.md](contracts/ui.md) (the exact texts), [quickstart.md](quickstart.md)

**Tests**: Included (constitution VII): Vitest, Testing Library and MSW.

## Format: `[ID] [P?] [Story] Description`

## Facts from the code that the tasks rely on

- `src/features/dashboard/types.ts`: `EvChargerBillPart extends EvChargerDayPart { firstHour; lastHour }`.
- `src/features/dashboard/api.ts`: `getMonthlyBill` sets `evCharger: raw.evCharger ?? null`; `RawMonthlyBill` is
  `Older<MonthlyBill, 'waterHeater' | 'totalKwh' | 'evCharger'>`.
- `src/features/dashboard/BillView.tsx`: `EvChargerBillNote({ bill })` renders
  `Car charging {period}: {formatKwh(part.kwh)} · {counted text}` in a `<p className="text-xs text-muted-foreground">`.
- `src/test/bills.ts`: `withEvCharger(bill, part)` with defaults `kwh: 212.7`, `included: true`.
- Tests: `BillCard.test.tsx` › "BillCard car charging (spec 013)" and `ExpectedBillCard.test.tsx` › "ExpectedBillCard
  car charging (spec 013)"; `api.test.ts` › "normalising the car charger fields".

---

## Phase 1: Setup

None.

## Phase 2: Foundational

- [x] T001 Add to `EvChargerBillPart` in `src/features/dashboard/types.ts`: `cost: number | null` ("NOK incl. VAT, the
      hours so far, not rounded; null: not priced. Added to no sum.") and `pricedAt: EvChargerPricedAt | null` with
      `type EvChargerPricedAt = 'NorgesPrisPrice' | 'HousePrice' | (string & {})` ("null only from an API without spec
      019").
- [x] T002 Test first in `src/features/dashboard/api.test.ts`: a bill whose car part has no `cost`/`pricedAt` reads as
      `cost: null, pricedAt: null`; with them, they pass through.
- [x] T003 In `src/features/dashboard/api.ts`, normalise the car part in `getMonthlyBill`: `cost: raw.evCharger.cost ??
null`, `pricedAt: raw.evCharger.pricedAt ?? null`, with a raw type where both are optional (research R1).
- [x] T004 In `src/test/bills.ts`, `withEvCharger` defaults `cost: null, pricedAt: null`, so spec 013's tests keep their
      texts.

## Phase 3: User Story 1 - The cost on the bill (P1) 🎯 MVP

- [x] T005 [US1] In `src/features/dashboard/BillView.tsx`, `EvChargerBillNote` adds, when `pricedAt` is set and `cost`
      is a number, " · {about }{formatNok(cost)}{ at the Norgespris price| at the house's price}" after the kWh
      (research R2, R3; contracts/ui.md). Update its doc comment: the car is priced by API spec 019, never summed.
- [x] T006 [P] [US1] Tests in `src/features/dashboard/BillCard.test.tsx`: Norgespris price, house's price, a past
      month, and the amounts unchanged with a cost.
- [x] T007 [P] [US1] Test in `src/features/dashboard/ExpectedBillCard.test.tsx`: "so far this month" with the cost.

## Phase 4: User Story 2 - Never 0 kr (P1)

- [x] T008 [US2] In `EvChargerBillNote`: `pricedAt` set and `cost` null → " · not priced"; an unknown `pricedAt` →
      the cost without a rule; `estimated` → "about ".
- [x] T009 [US2] Tests in `src/features/dashboard/BillCard.test.tsx`: not priced (and no "0,00 kr"), unknown rule,
      estimated, and an API without spec 019 reading as before.

## Phase 5: Polish

- [x] T010 Run `npm test`, `npm run build`, `npm run lint` and Prettier; fix what they find.
- [ ] T011 Manual checks from quickstart.md 1–5 against the API with spec 019 deployed. Tick them here when done.

## Dependencies

Phase 2 → US1 → US2 → Polish. T006 and T007 touch different files.

## Implementation strategy

US1 is the MVP; US2 guards the missing-figure cases on the same component.
