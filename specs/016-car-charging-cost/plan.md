# Implementation Plan: What the Car Charging Costs, on the Bill

**Branch**: `016-car-charging-cost` | **Date**: 2026-11-23 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-car-charging-cost/spec.md`

## Summary

API spec 019 adds `cost` and `pricedAt` to the bill's `evCharger` part. The app reads them in `getMonthlyBill`,
normalising an older API's part to "no cost figures", and `EvChargerBillNote` shows the cost and its rule between the
kWh and "counted / not counted with the house" (research R1–R3). Both the Now card and the History bill already use the
note, so nothing else changes.

## Technical Context

**Language/Version**: TypeScript 5 (strict), React 19

**Primary Dependencies**: TanStack Query 5, shadcn/ui, Tailwind 4. **No new dependencies.**

**Storage**: none.

**Testing**: Vitest + Testing Library + MSW.

- `api.test.ts`: a car part without the fields reads as `cost: null, pricedAt: null`; with them, they pass through.
- `BillCard.test.tsx` and `ExpectedBillCard.test.tsx`: each text in contracts/ui.md; the amounts unchanged.

**Target Platform**: a mobile-first browser SPA, at 375 px, in light and dark mode (SC-004).

**Project Type**: web (frontend SPA against the existing API)

**Constraints**: API spec 019 deployed; the cost is never summed or projected (FR-005).

**Scale/Scope**: `types.ts`, `api.ts`, `BillView.tsx` and their tests; `src/test/bills.ts`.

## Constitution Check

| Principle             | How the plan meets it                                                          | Status |
| --------------------- | ------------------------------------------------------------------------------ | ------ |
| I. Feature slices     | All in `features/dashboard`.                                                   | ✅     |
| II. One gateway       | `getMonthlyBill` normalises the new fields in one place.                       | ✅     |
| III. TanStack Query   | No new queries: the bill is already read.                                      | ✅     |
| IV. Forms             | No forms.                                                                      | ✅ n/a |
| V. Session safety     | Nothing new stored or logged.                                                  | ✅     |
| VI. Typed, lint-clean | `pricedAt` typed with its known values; an unknown one is handled, not thrown. | ✅     |
| VII. Tests            | API normalising and every note text.                                           | ✅     |

**Re-check after Phase 1**: unchanged, all pass.

## Project Structure

```text
specs/016-car-charging-cost/
├── plan.md, research.md, data-model.md, quickstart.md
├── contracts/ui.md      # the note's texts
├── checklists/requirements.md
└── tasks.md

src/
├── test/bills.ts                         # withEvCharger: cost and pricedAt defaults
└── features/dashboard/
    ├── types.ts                          # EvChargerBillPart + cost, pricedAt
    ├── api.ts / api.test.ts              # normalise an older car part
    ├── BillView.tsx                      # EvChargerBillNote shows the cost
    └── BillCard.test.tsx / ExpectedBillCard.test.tsx
```

**Structure Decision**: the note already serves both places (spec 013), so the change stays in it.

## Complexity Tracking

None.
